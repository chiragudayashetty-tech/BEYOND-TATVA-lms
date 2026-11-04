-- Leads: delete, clear and find duplicates (Chirag, 2026-11-04).
-- Replaces the earlier "leads are never deleted" decision: admins can now remove leads.
-- Deleting a lead removes its CRM notes (cascade) and unlinks workshop registrations (set null).

-- Last 10 digits of a phone, so "+91 98450-12345" and "9845012345" match.
create function public.phone_key(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10), '')
$$;

-- Lower-case email; for Gmail also drop dots and "+tag" in the name part (a.b+x@gmail.com = ab@gmail.com).
create function public.email_key(e text)
returns text language sql immutable set search_path = '' as $$
  select case
    when e is null or position('@' in e) = 0 then null
    when lower(split_part(e, '@', 2)) in ('gmail.com', 'googlemail.com')
      then replace(split_part(lower(split_part(e, '@', 1)), '+', 1), '.', '') || '@gmail.com'
    else lower(trim(e))
  end
$$;

create index if not exists leads_phone_key_idx on public.leads (public.phone_key(phone));

-- Delete the given leads and every other lead with the same phone (the pipeline shows one row per phone).
create function public.admin_delete_leads(p_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.leads l
  where public.phone_key(l.phone) in (select public.phone_key(x.phone) from public.leads x where x.id = any(p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Delete every lead of a course. Needs the exact words, so it can't happen by a mis-click.
create function public.admin_clear_leads(p_confirm text, p_course text default 'ai-for-students', p_source text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_confirm is distinct from 'DELETE ALL LEADS' then raise exception 'Type DELETE ALL LEADS to confirm'; end if;
  delete from public.leads where course_id = p_course and (p_source is null or source = p_source);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Keep the oldest lead per phone, delete the extra copies.
create function public.admin_dedupe_leads(p_course text default 'ai-for-students')
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.leads l
  using (select id, row_number() over (partition by public.phone_key(phone) order by created_at, id) rn
         from public.leads where course_id = p_course) d
  where l.id = d.id and d.rn > 1;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Groups of records that look like the same person: same phone (leads and students' parent phone)
-- or same email (student sign-in emails, and an "email" a website lead may carry in details).
create function public.admin_duplicates(p_course text default 'ai-for-students')
returns table (match text, match_key text, kind text, id uuid, name text, phone text, email text, source text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  with people as (
    select 'lead'::text as kind, l.id, coalesce(l.student_name, l.parent_name) as name, l.phone,
           l.details ->> 'email' as email, l.source, l.created_at
    from public.leads l where l.course_id = p_course
    union all
    select 'student', p.id, p.full_name, p.guardian_phone, u.email::text, p.signup_source, p.created_at
    from public.profiles p left join auth.users u on u.id = p.id
    where p.role = 'student'
  ),
  keyed as (
    select 'phone'::text as match, public.phone_key(pp.phone) as k, pp.* from people pp
    union all
    select 'email', public.email_key(pp.email), pp.* from people pp
  ),
  groups as (select k.match, k.k from keyed k where k.k is not null group by 1, 2 having count(*) > 1)
  select k.match, k.k, k.kind, k.id, k.name, k.phone, k.email, k.source, k.created_at
  from keyed k join groups g on g.match = k.match and g.k = k.k
  order by k.match, k.k, k.created_at;
end;
$$;

revoke execute on function public.admin_delete_leads, public.admin_clear_leads, public.admin_dedupe_leads, public.admin_duplicates from public, anon;
grant execute on function public.admin_delete_leads, public.admin_clear_leads, public.admin_dedupe_leads, public.admin_duplicates to authenticated;
