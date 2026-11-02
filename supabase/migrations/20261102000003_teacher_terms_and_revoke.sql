-- H3 (audit 2026-11-01): a teacher code alone gave the full paid course. Now a teacher must accept the
-- teacher terms (no sharing or selling, legal consequences) when signing up, and Studio can revoke a
-- teacher. Revoked teachers lose course access and can no longer see their students.
-- School deals use student access keys (Studio → School keys), one per student.

alter table public.profiles
  add column teacher_terms_at timestamptz,
  add column teacher_revoked_at timestamptz;

-- Active teacher = accepted terms and not revoked.
create or replace function public.is_active_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher'
                 and teacher_terms_at is not null and teacher_revoked_at is null);
$$;

create or replace function public.has_course_access(p_course text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or public.is_active_teacher()
    or exists (select 1 from public.course_access where student_id = (select auth.uid()) and course_id = p_course);
$$;

create or replace function public.teaches(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_active_teacher() and exists (
    select 1 from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student and c.teacher_id = (select auth.uid())
  );
$$;

-- Teachers who signed up before this (none live) accept the terms here.
create or replace function public.accept_teacher_terms() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set teacher_terms_at = coalesce(teacher_terms_at, now())
  where id = (select auth.uid()) and role = 'teacher';
  if not found then raise exception 'Teachers only'; end if;
end;
$$;

create or replace function public.admin_set_teacher_revoked(p_teacher uuid, p_revoked boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set teacher_revoked_at = case when p_revoked then coalesce(teacher_revoked_at, now()) end
  where id = p_teacher and role = 'teacher';
  if not found then raise exception 'Not a teacher account'; end if;
end;
$$;

-- complete_onboarding: the teacher branch now needs the terms tick (p_consent).
create or replace function public.complete_onboarding(
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
    if not coalesce(p_consent, false) then raise exception 'Please accept the teacher terms'; end if;
    insert into public.profiles (id, role, full_name, school_id, teacher_terms_at)
    values (v_uid, 'teacher', trim(p_full_name), v_school, now());

  else
    raise exception 'Choose student or teacher';
  end if;

  return p_role;
end;
$$;

revoke execute on function public.is_active_teacher, public.accept_teacher_terms, public.admin_set_teacher_revoked from public, anon;
grant execute on function public.is_active_teacher, public.accept_teacher_terms, public.admin_set_teacher_revoked to authenticated;
