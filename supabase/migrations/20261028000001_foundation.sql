-- Beyond Tatva LMS: foundation schema.
-- Every table has row-level security. Roles and links are only ever set through
-- the security-definer functions at the bottom, never by direct writes.

-- ── Schools, people, classes ────────────────────────────────────────────────

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  code text not null unique,          -- students join with this
  teacher_code text not null unique,  -- teachers join with this (kept separate so students can't claim teacher)
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'parent', 'teacher', 'admin')),
  full_name text not null check (char_length(full_name) between 1 and 80),
  avatar text,
  school_id uuid references public.schools (id) on delete set null,
  grade smallint check (grade between 8 and 10),
  guardian_name text,
  guardian_phone text,
  guardian_consent_at timestamptz,    -- set when a parent links to the student
  invite_code text unique,            -- students share this with a parent
  created_at timestamptz not null default now(),
  constraint student_fields check (
    role <> 'student' or (grade is not null and school_id is not null and guardian_name is not null and guardian_phone is not null)
  )
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  grade smallint not null check (grade between 8 and 10),
  teacher_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table public.guardians (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, student_id)
);

-- ── Content ─────────────────────────────────────────────────────────────────

create table public.courses (
  id text primary key,                -- slug, e.g. 'ai-study-hacks'
  title text not null,
  tagline text,
  description text,
  grade text,
  color text,
  color2 text,
  tags text[] not null default '{}',
  hero_url text,
  published boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null,
  position int not null default 0,     -- lesson number within the course
  minutes int,
  video_url text,
  notes text
);

-- ── Learning activity ───────────────────────────────────────────────────────

create table public.lesson_progress (
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  seconds_watched int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table public.checkpoint_answers (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  question text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);

-- In-app screen time: one row per viewing session, extended by heartbeats.
create table public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  seconds int not null default 0
);

create index on public.profiles (school_id);
create index on public.classes (teacher_id);
create index on public.enrollments (student_id);
create index on public.guardians (student_id);
create index on public.chapters (course_id);
create index on public.lessons (chapter_id);
create index on public.lessons (course_id);
create index on public.lesson_progress (lesson_id);
create index on public.checkpoint_answers (student_id);
create index on public.checkpoint_answers (lesson_id);
create index on public.activity_sessions (user_id, started_at);

-- ── Helpers (security definer so policies don't recurse) ────────────────────

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function public.teaches(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments e
    join public.classes c on c.id = e.class_id
    where e.student_id = p_student and c.teacher_id = (select auth.uid())
  );
$$;

create or replace function public.guards(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.guardians where student_id = p_student and parent_id = (select auth.uid()));
$$;

-- Anyone who may look at a student's learning data.
create or replace function public.can_view_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_student = (select auth.uid()) or public.teaches(p_student) or public.guards(p_student) or public.is_admin();
$$;

-- ── Row-level security ──────────────────────────────────────────────────────

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.guardians enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.checkpoint_answers enable row level security;
alter table public.activity_sessions enable row level security;

-- Schools: members see their own school; join codes are checked server-side only.
create policy "members read own school" on public.schools for select to authenticated
  using (id = (select school_id from public.profiles where id = (select auth.uid())) or (select public.is_admin()));
create policy "admins manage schools" on public.schools for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke select on public.schools from authenticated, anon;
grant select (id, name, city, created_at) on public.schools to authenticated;

-- Profiles: users can edit only their name and avatar; roles come from onboarding.
create policy "read visible profiles" on public.profiles for select to authenticated
  using ((select public.can_view_student(id)) or id in (select parent_id from public.guardians where student_id = (select auth.uid())));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "admins manage profiles" on public.profiles for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke update on public.profiles from authenticated;
grant update (full_name, avatar) on public.profiles to authenticated;

-- Classes and enrolments.
create policy "read own classes" on public.classes for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or id in (select class_id from public.enrollments where student_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "admins manage classes" on public.classes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "read visible enrollments" on public.enrollments for select to authenticated
  using ((select public.can_view_student(student_id)));
create policy "admins manage enrollments" on public.enrollments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "read own guardian links" on public.guardians for select to authenticated
  using (parent_id = (select auth.uid()) or student_id = (select auth.uid()) or (select public.is_admin()));

-- Content: published courses are public (the landing page shows them).
create policy "read published courses" on public.courses for select to anon, authenticated
  using (published);
create policy "read published chapters" on public.chapters for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.published));
create policy "read published lessons" on public.lessons for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.published));
create policy "admins manage courses" on public.courses for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage chapters" on public.chapters for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins manage lessons" on public.lessons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Activity: students write their own; teachers, guardians and admins can read.
create policy "read visible progress" on public.lesson_progress for select to authenticated
  using ((select public.can_view_student(student_id)));
create policy "write own progress" on public.lesson_progress for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "update own progress" on public.lesson_progress for update to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

create policy "read visible answers" on public.checkpoint_answers for select to authenticated
  using ((select public.can_view_student(student_id)));
create policy "write own answers" on public.checkpoint_answers for insert to authenticated
  with check (student_id = (select auth.uid()));

create policy "read visible activity" on public.activity_sessions for select to authenticated
  using ((select public.can_view_student(user_id)));
create policy "write own activity" on public.activity_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "update own activity" on public.activity_sessions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Onboarding (the only way to get a role) ─────────────────────────────────

create or replace function public.complete_onboarding(
  p_role text,
  p_full_name text,
  p_code text default null,
  p_grade smallint default null,
  p_guardian_name text default null,
  p_guardian_phone text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_school uuid;
  v_student uuid;
  v_invite text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then raise exception 'Profile already set up'; end if;

  if p_role = 'student' then
    select id into v_school from public.schools where upper(code) = upper(trim(p_code));
    if v_school is null then raise exception 'That school code doesn''t match any school'; end if;
    if p_grade not between 8 and 10 then raise exception 'Grade must be 8, 9 or 10'; end if;
    if coalesce(trim(p_guardian_name), '') = '' or coalesce(trim(p_guardian_phone), '') = '' then
      raise exception 'A parent or guardian''s name and phone are required';
    end if;
    v_invite := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    insert into public.profiles (id, role, full_name, school_id, grade, guardian_name, guardian_phone, invite_code)
    values (v_uid, 'student', trim(p_full_name), v_school, p_grade, trim(p_guardian_name), trim(p_guardian_phone), v_invite);
    -- Put the student in their grade's class at that school, if one exists.
    insert into public.enrollments (class_id, student_id)
    select id, v_uid from public.classes where school_id = v_school and grade = p_grade
    order by created_at limit 1;

  elsif p_role = 'teacher' then
    select id into v_school from public.schools where upper(teacher_code) = upper(trim(p_code));
    if v_school is null then raise exception 'That teacher code doesn''t match any school'; end if;
    insert into public.profiles (id, role, full_name, school_id) values (v_uid, 'teacher', trim(p_full_name), v_school);

  elsif p_role = 'parent' then
    select id into v_student from public.profiles where role = 'student' and invite_code = upper(trim(p_code));
    if v_student is null then raise exception 'That child code doesn''t match any student'; end if;
    insert into public.profiles (id, role, full_name) values (v_uid, 'parent', trim(p_full_name));
    insert into public.guardians (parent_id, student_id) values (v_uid, v_student);
    -- Linking from the guardian's own account is the consent record.
    update public.profiles set guardian_consent_at = coalesce(guardian_consent_at, now()) where id = v_student;

  else
    raise exception 'Choose student, parent or teacher';
  end if;

  return p_role;
end;
$$;

-- Lets an existing parent add another child.
create or replace function public.link_child(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_student uuid;
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'parent') then
    raise exception 'Only parents can link a child';
  end if;
  select id into v_student from public.profiles where role = 'student' and invite_code = upper(trim(p_code));
  if v_student is null then raise exception 'That child code doesn''t match any student'; end if;
  insert into public.guardians (parent_id, student_id) values ((select auth.uid()), v_student) on conflict do nothing;
  update public.profiles set guardian_consent_at = coalesce(guardian_consent_at, now()) where id = v_student;
end;
$$;

revoke execute on function public.complete_onboarding, public.link_child from public, anon;
grant execute on function public.complete_onboarding, public.link_child to authenticated;
revoke execute on function public.is_admin, public.teaches, public.guards, public.can_view_student from public, anon;
grant execute on function public.is_admin, public.teaches, public.guards, public.can_view_student to authenticated;
