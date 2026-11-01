-- H2 (audit 2026-11-01): a purchase unlocks the course on its own only when it matches a VERIFIED
-- login email or login phone of exactly one student. A match on the parent phone typed at sign-up
-- (never verified) no longer unlocks: it is saved as a suggestion and Studio approves it.

alter table public.purchases
  add column suggested_student uuid references public.profiles (id) on delete set null,
  add column suggested_at timestamptz;
create index on public.purchases (suggested_student) where status = 'pending';

-- The one student a purchase may unlock by itself: verified email first, then verified login phone.
create or replace function public._verified_match(p_email text, p_phone text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid; n int;
begin
  if p_email is not null then
    select count(*), min(p.id::text)::uuid into n, v from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and lower(u.email) = p_email and u.email_confirmed_at is not null;
    if n = 1 then return v; end if;
  end if;
  if p_phone is not null then
    select count(*), min(p.id::text)::uuid into n, v from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and public.normalize_phone(u.phone) = p_phone and u.phone_confirmed_at is not null;
    if n = 1 then return v; end if;
  end if;
  return null;
end;
$$;

create or replace function public._record_purchase(
  p_reference text, p_email text, p_phone text, p_student_name text, p_parent_name text,
  p_amount_paise int, p_course text, p_source text, p_created_by uuid
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := public.normalize_phone(p_phone);
  v_match uuid;
  v_n int;
begin
  if coalesce(trim(p_reference), '') = '' then raise exception 'reference is required'; end if;
  if v_email is null and v_phone is null then raise exception 'An email or a valid Indian mobile number is required'; end if;
  if not exists (select 1 from public.courses where id = p_course) then raise exception 'Unknown course %', p_course; end if;

  insert into public.purchases (course_id, reference, email, phone, student_name, parent_name, amount_paise, source, created_by)
  values (p_course, trim(p_reference), v_email, v_phone, nullif(trim(p_student_name), ''), nullif(trim(p_parent_name), ''), p_amount_paise, p_source, p_created_by)
  on conflict (reference) do nothing
  returning id into v_id;
  if v_id is null then
    return (select case status when 'claimed' then 'already_claimed' when 'revoked' then 'already_revoked' else 'duplicate' end
            from public.purchases where reference = trim(p_reference));
  end if;

  v_match := public._verified_match(v_email, v_phone);
  if v_match is not null then
    perform public._grant_purchase(v_id, v_match, case when v_email is not null and exists (
      select 1 from auth.users where id = v_match and lower(email) = v_email) then 'email' else 'phone' end);
    return 'claimed';
  end if;

  -- Parent phone from sign-up (unverified): suggest, never unlock. Studio approves.
  if v_phone is not null then
    select count(*), min(id::text)::uuid into v_n, v_match from public.profiles
    where role = 'student' and guardian_phone = v_phone;
    if v_n = 1 then
      update public.purchases set suggested_student = v_match, suggested_at = now() where id = v_id;
    end if;
  end if;
  return 'pending';
end;
$$;

create or replace function public.claim_purchases() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_phone text;
  v_parent text;
  r record;
  n int := 0;
begin
  if v_uid is null then return 0; end if;
  select case when u.email_confirmed_at is not null then lower(u.email) end,
         case when u.phone_confirmed_at is not null then public.normalize_phone(u.phone) end,
         p.guardian_phone
    into v_email, v_phone, v_parent
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = v_uid and p.role = 'student';
  if not found then return 0; end if;

  -- Verified email or login phone: unlock.
  for r in
    select id, case when email = v_email then 'email' else 'phone' end as how
    from public.purchases
    where status = 'pending'
      and ((v_email is not null and email = v_email) or (v_phone is not null and phone = v_phone))
    order by (email = v_email) desc nulls last, created_at
    for update skip locked
  loop
    exit when exists (select 1 from public.course_access a join public.purchases p on p.id = r.id
                      where a.student_id = v_uid and a.course_id = p.course_id);
    perform public._grant_purchase(r.id, v_uid, r.how);
    n := n + 1;
  end loop;

  -- Parent phone only: leave a suggestion for Studio (first student to match keeps it).
  if v_parent is not null then
    update public.purchases set suggested_student = v_uid, suggested_at = now()
    where status = 'pending' and phone = v_parent and suggested_student is null;
  end if;
  return n;
end;
$$;

-- Studio: approve the suggested student in one click.
create or replace function public.admin_approve_suggestion(p_purchase uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select suggested_student into v from public.purchases where id = p_purchase and status = 'pending';
  if v is null then raise exception 'Nothing to approve'; end if;
  perform public._grant_purchase(p_purchase, v, 'parent_phone');
end;
$$;

revoke execute on function public._verified_match, public.admin_approve_suggestion from public, anon;
revoke execute on function public._verified_match from authenticated;
grant execute on function public.admin_approve_suggestion to authenticated;
