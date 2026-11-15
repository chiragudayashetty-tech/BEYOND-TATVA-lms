-- Siblings who share a parent phone (2026-11-15). Applied to live on 2026-11-15 as `sibling_phones`
-- (version 20261115095004) without a file in the repo; this file is that SQL, recovered from
-- supabase_migrations.schema_migrations so a fresh database matches live. Do not apply again.
-- Phones marked here are kept out of "delete matching leads" and "remove duplicates".
create table public.sibling_phones (
  phone_key text primary key check (phone_key ~ '^\d{10}$'),
  marked_by uuid references auth.users (id) on delete set null default auth.uid(),
  marked_at timestamptz not null default now()
);
create index sibling_phones_marked_by_idx on public.sibling_phones (marked_by);
alter table public.sibling_phones enable row level security;
create policy "admins read sibling phones" on public.sibling_phones for select to authenticated using ((select public.is_admin()));

create function public.admin_mark_siblings(p_phone_key text, p_siblings boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_phone_key !~ '^\d{10}$' then raise exception 'Not a phone number'; end if;
  if p_siblings then
    insert into public.sibling_phones (phone_key) values (p_phone_key) on conflict do nothing;
  else
    delete from public.sibling_phones where phone_key = p_phone_key;
  end if;
end;
$$;
revoke execute on function public.admin_mark_siblings(text, boolean) from public, anon;
grant execute on function public.admin_mark_siblings(text, boolean) to authenticated;

create or replace function public.admin_delete_leads(p_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.trash_leads_(array(
    select l.id from public.leads l where l.id = any(p_ids)
    union
    select l.id from public.leads l
    where public.phone_key(l.phone) in (select public.phone_key(x.phone) from public.leads x where x.id = any(p_ids))
      and public.phone_key(l.phone) not in (select phone_key from public.sibling_phones)), 'deleted');
end;
$$;

create or replace function public.admin_dedupe_leads(p_course text default 'ai-for-students')
returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.trash_leads_(array(
    select id from (select id, row_number() over (partition by public.phone_key(phone) order by created_at, id) rn
                    from public.leads where course_id = p_course
                      and public.phone_key(phone) not in (select phone_key from public.sibling_phones)) d where d.rn > 1), 'duplicate copy');
end;
$$;
