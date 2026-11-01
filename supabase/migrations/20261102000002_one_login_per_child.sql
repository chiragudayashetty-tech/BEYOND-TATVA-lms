-- One login per child (owner decision 2026-11-02). The account is always the student's. Either the
-- student or a parent signs in and sets it up; the parent's WhatsApp number is always required, the
-- child's own phone is optional, and a consent tick is required. Parent accounts and parent/child
-- invite codes are removed (also closes audit H1: guessable codes). No parent accounts exist live.

alter table public.profiles
  add column signed_up_by text check (signed_up_by in ('student', 'parent')),
  add column student_phone text check (student_phone ~ '^\+91[6-9][0-9]{9}$'),
  add column consent_by text check (consent_by in ('student', 'parent'));

update public.profiles set invite_code = null where invite_code is not null;

do $$ begin
  if exists (select 1 from public.profiles where role = 'parent') then
    raise exception 'Parent accounts exist; move them before removing the parent role';
  end if;
end $$;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

drop function if exists public.link_child(text);
drop function public.complete_onboarding(text, text, text, smallint, text, text, text);

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
  p_consent boolean default false
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
    if v_school is not null then
      insert into public.enrollments (class_id, student_id)
      select id, v_uid from public.classes where school_id = v_school and grade = p_grade
      order by created_at limit 1;
    end if;

  elsif p_role = 'teacher' then
    select id into v_school from public.schools where upper(teacher_code) = upper(trim(p_code));
    if v_school is null then raise exception 'That teacher code doesn''t match any school'; end if;
    insert into public.profiles (id, role, full_name, school_id) values (v_uid, 'teacher', trim(p_full_name), v_school);

  else
    raise exception 'Choose student or teacher';
  end if;

  return p_role;
end;
$$;

revoke execute on function public.complete_onboarding from public, anon;
grant execute on function public.complete_onboarding to authenticated;
