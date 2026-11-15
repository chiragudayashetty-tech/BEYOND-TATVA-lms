-- Certificates (2026-11-15). A student earns one only after watching EVERY lesson of EVERY module.
-- "Watched" = lesson_progress.completed_at, which save_progress sets only at >= 90% of real parts played.
-- A course with a "Coming soon" module (release_at in 2099) or a module without lessons can't be finished,
-- so nobody gets a certificate early while modules are still being uploaded.
-- Public check: /verify/<code> shows first name + last initial, course, date (students are minors).

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^BT-[0-9A-F]{4}-[0-9A-F]{4}$'),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  full_name text not null,
  issued_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create index certificates_course_idx on public.certificates (course_id);
alter table public.certificates enable row level security;
create policy "certificates: own or admin" on public.certificates for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.certificates from anon, authenticated;

-- True when this student has course access and has finished every lesson of a fully released course.
create or replace function public.course_finished(p_student uuid, p_course text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.course_access where student_id = p_student and course_id = p_course)
    and exists (select 1 from public.chapters where course_id = p_course)
    and not exists (select 1 from public.chapters where course_id = p_course and release_at >= '2099-01-01')
    and not exists (select 1 from public.chapters ch where ch.course_id = p_course
                      and not exists (select 1 from public.lessons l where l.chapter_id = ch.id))
    and not exists (select 1 from public.lessons l where l.course_id = p_course
                      and not exists (select 1 from public.lesson_progress p
                                      where p.lesson_id = l.id and p.student_id = p_student and p.completed_at is not null));
$$;
revoke execute on function public.course_finished(uuid, text) from public, anon, authenticated;

-- The signed-in student claims their certificate. Same code every time once issued.
create or replace function public.issue_my_certificate(p_course text default 'ai-for-students') returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text;
  v_code text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select code into v_code from public.certificates where student_id = v_uid and course_id = p_course;
  if v_code is not null then return v_code; end if;
  select nullif(btrim(full_name), '') into v_name from public.profiles where id = v_uid and role = 'student';
  if v_name is null then raise exception 'Only students earn certificates'; end if;
  if not public.course_finished(v_uid, p_course) then raise exception 'Finish every lesson of every module first'; end if;
  loop
    v_code := 'BT-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4));
    begin
      insert into public.certificates (code, student_id, course_id, full_name) values (v_code, v_uid, p_course, left(v_name, 80));
      return v_code;
    exception when unique_violation then
      select code into v_code from public.certificates where student_id = v_uid and course_id = p_course;
      if v_code is not null then return v_code; end if;  -- issued by a parallel call
    end;
  end loop;
end $$;
revoke execute on function public.issue_my_certificate(text) from public, anon;
grant execute on function public.issue_my_certificate(text) to authenticated;

-- Public verification: first name + last initial only.
create or replace function public.verify_certificate(p_code text)
returns table (name text, course_title text, issued_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select split_part(btrim(c.full_name), ' ', 1)
         || coalesce(' ' || nullif(left(regexp_replace(btrim(c.full_name), '^\S+\s*', ''), 1), '') || '.', ''),
         co.title, c.issued_at
  from public.certificates c join public.courses co on co.id = c.course_id
  where c.code = upper(btrim(coalesce(p_code, '')));
$$;
revoke execute on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated;
