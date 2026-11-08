-- Real schools for students, from the leads you already have.
-- 1. Signup school list: schools.show_at_signup marks the schools a student can pick at signup
--    (plus "Other", typed). signup_schools() lists them. complete_onboarding gets p_school_pick.
--    Picking a school sets the school only; it does not enroll the student in a class (a school
--    code still does).
-- 2. Lead <-> student matching: a student is linked to the lead with the same phone (parent WhatsApp,
--    student phone or login phone). If several students share a phone (siblings), the first name must
--    match too. Runs on signup, when a student's phones change, and when a lead is added or its phone
--    changes. Once linked:
--      - the student gets the lead's school when it names a real school and the student has none;
--      - blank lead fields (student name, parent name, class, school) are filled from the account.
--    Nothing that is already filled in is overwritten.
-- 3. Backfill: runs once for every existing student.

alter table public.schools add column show_at_signup boolean not null default false;

create or replace function public.signup_schools() returns table (id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name from public.schools s where s.show_at_signup order by s.name;
$$;
revoke execute on function public.signup_schools() from public, anon;
grant execute on function public.signup_schools() to authenticated;

drop function public.complete_onboarding(text, text, text, smallint, text, text, text, text, text, boolean);
create function public.complete_onboarding(
  p_role text,
  p_full_name text,
  p_code text default null,
  p_grade smallint default null,
  p_guardian_name text default null,
  p_guardian_phone text default null,
  p_school_name text default null,
  p_signed_up_by text default 'student',
  p_student_phone text default null,
  p_consent boolean default false,
  p_school_pick uuid default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_school uuid;
  v_phone text;
  v_child text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then raise exception 'Profile already set up'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Enter the student''s full name'; end if;

  if p_role = 'student' then
    if p_signed_up_by not in ('student', 'parent') then raise exception 'Choose who is signing in'; end if;
    if coalesce(trim(p_code), '') <> '' then
      select id into v_school from public.schools where upper(code) = upper(trim(p_code));
      if v_school is null then raise exception 'That school code doesn''t match any school. Leave it empty if you joined on your own.'; end if;
    end if;
    -- Picked from the signup list (schools shown at signup): sets the school only, no class enrollment.
    if v_school is null and p_school_pick is not null then
      select id into v_school from public.schools where id = p_school_pick and show_at_signup;
      if v_school is null then raise exception 'Choose a school from the list, or Other'; end if;
    end if;
    if p_grade is null or p_grade not between 8 and 10 then raise exception 'Grade must be 8, 9 or 10'; end if;
    if coalesce(trim(p_guardian_name), '') = '' then raise exception 'Enter the parent or guardian''s name'; end if;
    v_phone := public.normalize_phone(p_guardian_phone);
    if v_phone is null then raise exception 'Enter a valid 10-digit Indian WhatsApp number for the parent'; end if;
    if coalesce(trim(p_student_phone), '') <> '' then
      v_child := public.normalize_phone(p_student_phone);
      if v_child is null then raise exception 'The student''s phone must be a valid 10-digit Indian mobile number (or leave it empty)'; end if;
    end if;
    if not coalesce(p_consent, false) then raise exception 'Please tick the parent consent box'; end if;

    insert into public.profiles (id, role, full_name, school_id, school_name, grade, guardian_name, guardian_phone,
                                 signed_up_by, student_phone, guardian_consent_at, consent_by)
    values (v_uid, 'student', trim(p_full_name), v_school, nullif(trim(p_school_name), ''), p_grade,
            trim(p_guardian_name), v_phone, p_signed_up_by, v_child, now(), p_signed_up_by);
    if v_school is not null and coalesce(trim(p_code), '') <> '' then
      insert into public.enrollments (class_id, student_id)
      select id, v_uid from public.classes where school_id = v_school and grade = p_grade
      order by created_at limit 1;
    end if;

  elsif p_role = 'teacher' then
    select id into v_school from public.schools where upper(teacher_code) = upper(trim(p_code));
    if v_school is null then raise exception 'That teacher code doesn''t match any school'; end if;
    if not coalesce(p_consent, false) then raise exception 'Please accept the teacher terms'; end if;
    insert into public.profiles (id, role, full_name, school_id, teacher_terms_at)
    values (v_uid, 'teacher', trim(p_full_name), v_school, now());

  else
    raise exception 'Choose student or teacher';
  end if;

  return p_role;
end;
$$;
revoke execute on function public.complete_onboarding(text, text, text, smallint, text, text, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, smallint, text, text, text, text, text, boolean, uuid) to authenticated;

-- Admin: choose which schools appear in the signup list.
create or replace function public.admin_set_signup_school(p_school uuid, p_show boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.schools set show_at_signup = coalesce(p_show, false) where id = p_school;
  if not found then raise exception 'School not found'; end if;
end;
$$;
revoke execute on function public.admin_set_signup_school(uuid, boolean) from public, anon;
grant execute on function public.admin_set_signup_school(uuid, boolean) to authenticated;

-- Internal: link one student to their lead(s) and fill gaps both ways.
create or replace function public.link_student_leads(p_student uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v public.profiles;
  v_login text;
  v_phones text[];
  v_first text;
  v_n int := 0;
  l public.leads;
  v_school uuid;
begin
  select * into v from public.profiles where id = p_student and role = 'student';
  if not found then return 0; end if;
  select public.normalize_phone(u.phone) into v_login from auth.users u where u.id = p_student;
  v_phones := array_remove(array[v.guardian_phone, v.student_phone, v_login], null);
  if cardinality(v_phones) = 0 then return 0; end if;
  v_first := lower(split_part(trim(v.full_name), ' ', 1));

  for l in
    select * from public.leads x
    where x.student_id is null and x.phone = any (v_phones)
      and (
        -- only one student uses this phone: the lead is theirs
        (select count(*) from public.profiles o where o.role = 'student'
           and x.phone in (o.guardian_phone, o.student_phone)) <= 1
        -- siblings on one phone: first names must match
        or lower(split_part(trim(coalesce(x.student_name, '')), ' ', 1)) = v_first)
  loop
    update public.leads set student_id = p_student where id = l.id and student_id is null;
    v_n := v_n + 1;
  end loop;

  for l in select * from public.leads where student_id = p_student loop
    update public.leads set
      student_name = coalesce(nullif(trim(student_name), ''), left(v.full_name, 80)),
      parent_name  = coalesce(nullif(trim(parent_name), ''), left(v.guardian_name, 80)),
      grade        = coalesce(grade, v.grade),
      school_name  = coalesce(nullif(trim(school_name), ''), left(v.school_name, 120))
    where id = l.id
      and (nullif(trim(student_name), '') is null or nullif(trim(parent_name), '') is null
           or grade is null or nullif(trim(school_name), '') is null);
    if v_school is null and nullif(trim(l.school_name), '') is not null then
      select s.id into v_school from public.schools s where lower(trim(s.name)) = lower(trim(l.school_name)) limit 1;
    end if;
  end loop;

  if v.school_id is null and v_school is not null then
    update public.profiles set school_id = v_school where id = p_student and school_id is null;
  end if;
  return v_n;
end;
$$;
revoke execute on function public.link_student_leads(uuid) from public, anon, authenticated;

create or replace function public.trg_profile_link_leads() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if pg_trigger_depth() > 1 then return null; end if;   -- our own updates don't re-trigger
  if new.role = 'student' then perform public.link_student_leads(new.id); end if;
  return null;
end;
$$;
create trigger profiles_link_leads after insert or update of guardian_phone, student_phone, full_name on public.profiles
  for each row execute function public.trg_profile_link_leads();

create or replace function public.trg_lead_link_student() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if new.student_id is not null then
    perform public.link_student_leads(new.student_id);   -- linked by hand (LMS email): still fill the gaps
    return null;
  end if;
  for s in select id from public.profiles where role = 'student' and new.phone in (guardian_phone, student_phone) loop
    perform public.link_student_leads(s);
  end loop;
  return null;
end;
$$;
create trigger leads_link_student after insert or update of phone, student_id, school_name on public.leads
  for each row execute function public.trg_lead_link_student();
revoke execute on function public.trg_profile_link_leads(), public.trg_lead_link_student() from public, anon, authenticated;

-- Backfill every existing student once.
select public.link_student_leads(id) from public.profiles where role = 'student';
