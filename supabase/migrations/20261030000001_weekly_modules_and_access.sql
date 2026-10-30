-- One course, six modules that premiere weekly. Module 1 is free; the rest need access
-- through a per-student access key (school deals) or an online payment.

alter table public.chapters
  add column blurb text,
  add column release_at timestamptz,
  add column is_free boolean not null default false;

-- Who has full access to a course, and how they got it.
create table public.course_access (
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id) on delete cascade,
  source text not null check (source in ('key', 'payment', 'school', 'admin')),
  reference text,                      -- access key code or payment id
  granted_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

-- One-time keys the admin creates per student (for schools that pay in bulk).
create table public.access_keys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  course_id text not null references public.courses (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  label text,                          -- e.g. the student's name or class
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_by uuid references public.profiles (id) on delete set null,
  redeemed_at timestamptz
);

-- Video links live apart from lesson titles so locked modules never leak their videos.
create table public.lesson_media (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  video_url text not null
);
insert into public.lesson_media (lesson_id, video_url)
select id, video_url from public.lessons where video_url is not null;
alter table public.lessons drop column video_url;

create index on public.course_access (course_id);
create index on public.access_keys (school_id);
create index on public.access_keys (redeemed_by);

create or replace function public.has_course_access(p_course text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
    or exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'teacher')
    or exists (select 1 from public.course_access where student_id = (select auth.uid()) and course_id = p_course);
$$;

create or replace function public.can_watch_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    join public.chapters ch on ch.id = l.chapter_id
    where l.id = p_lesson
      and (public.is_admin() or (
        coalesce(ch.release_at, now()) <= now()
        and (ch.is_free or public.has_course_access(l.course_id))
      ))
  );
$$;

alter table public.course_access enable row level security;
alter table public.access_keys enable row level security;
alter table public.lesson_media enable row level security;

create policy "read visible access" on public.course_access for select to authenticated
  using ((select public.can_view_student(student_id)));
create policy "admins manage access" on public.course_access for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "admins manage keys" on public.access_keys for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "watch released and unlocked lessons" on public.lesson_media for select to authenticated
  using ((select public.can_watch_lesson(lesson_id)));
create policy "admins manage media" on public.lesson_media for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Students redeem the key their school gave them.
create or replace function public.redeem_access_key(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_key public.access_keys;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then
    raise exception 'Only students can redeem a key';
  end if;
  select * into v_key from public.access_keys where upper(code) = upper(trim(p_code)) for update;
  if v_key.id is null then raise exception 'That key doesn''t exist. Check for typos.'; end if;
  if v_key.redeemed_by is not null and v_key.redeemed_by <> v_uid then raise exception 'That key has already been used'; end if;
  update public.access_keys set redeemed_by = v_uid, redeemed_at = coalesce(redeemed_at, now()) where id = v_key.id;
  insert into public.course_access (student_id, course_id, source, reference)
  values (v_uid, v_key.course_id, 'key', v_key.code)
  on conflict (student_id, course_id) do nothing;
  return v_key.course_id;
end;
$$;

-- Admin: create N keys for a school, returns the codes.
create or replace function public.create_access_keys(p_course text, p_count int, p_school uuid default null, p_label text default null)
returns setof text
language plpgsql security definer set search_path = '' as $$
declare i int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_count not between 1 and 500 then raise exception 'Create between 1 and 500 keys at a time'; end if;
  for i in 1..p_count loop
    return query
      insert into public.access_keys (code, course_id, school_id, label, created_by)
      values ('BT-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)),
              p_course, p_school, p_label, (select auth.uid()))
      returning code;
  end loop;
end;
$$;

revoke execute on function public.redeem_access_key, public.create_access_keys, public.has_course_access, public.can_watch_lesson from public, anon;
grant execute on function public.redeem_access_key, public.create_access_keys, public.has_course_access, public.can_watch_lesson to authenticated;

-- ── Content: the single course and its six weekly modules ───────────────────
update public.courses set published = false;

insert into public.courses (id, title, tagline, description, grade, color, color2, tags, hero_url, published, position)
values ('ai-for-students', 'AI for Students', 'Six weeks to learn, study and create with AI.',
  'A six-module course for Grades 8–10. A new module premieres every Sunday at 6 PM. Short video lessons, quick checks inside every video, a weekly quiz and a project at the end.',
  'Grades 8–10', '#4F46E5', '#14B8A6', array['AI basics', 'Study skills', 'Projects'], '/media/hero1.mp4', true, 0)
on conflict (id) do update set title = excluded.title, tagline = excluded.tagline, description = excluded.description, published = true;

delete from public.chapters where course_id = 'ai-for-students';

create temporary table _m (pos int, title text, blurb text, release_at timestamptz, is_free boolean) on commit drop;
insert into _m values
  (0, 'Study smarter with AI', 'Understand any chapter faster and check what AI tells you.', '2026-10-25 18:00+05:30', true),
  (1, 'Exam mode', 'Same facts, more marks. Write answers the way examiners mark them.', '2026-11-01 18:00+05:30', false),
  (2, 'Your AI toolkit', 'ChatGPT, Gemini and the free tools that do most of the work.', '2026-11-08 18:00+05:30', false),
  (3, 'Prompt power', 'Roles, examples and step-by-step thinking to get exactly what you want.', '2026-11-15 18:00+05:30', false),
  (4, 'Create with AI', 'Posters, stories and music, and what makes a creation yours.', '2026-11-22 18:00+05:30', false),
  (5, 'Build your first chatbot', 'Plan, build and present your own AI project.', '2026-11-29 18:00+05:30', false);

create temporary table _l (mpos int, title text, pos int, minutes int) on commit drop;
insert into _l values
  (0, 'Why AI changes studying', 1, 6), (0, 'Open ChatGPT the right way', 2, 8), (0, 'Connect it to what you know', 3, 9), (0, 'Check AI for mistakes', 4, 7),
  (1, 'Knowing vs getting marks', 5, 7), (1, 'What the examiner checks', 6, 9), (1, 'Structure a 5-mark answer', 7, 10), (1, 'Your full-marks checklist', 8, 8),
  (2, 'Your two tools for this course', 9, 6), (2, 'Free is enough', 10, 7), (2, 'Talking to AI with your voice', 11, 8), (2, 'Images from words', 12, 9),
  (3, 'What a prompt really is', 13, 7), (3, 'Give AI a role', 14, 8), (3, 'Show, don''t tell: examples', 15, 9), (3, 'Fixing bad answers', 16, 9),
  (4, 'Design a poster', 17, 10), (4, 'Co-write a short story', 18, 9), (4, 'Make a song', 19, 10), (4, 'Using AI honestly', 20, 7),
  (5, 'What will your bot do?', 21, 8), (5, 'Designing the conversation', 22, 10), (5, 'Build and test it', 23, 12), (5, 'Demo day', 24, 10);

insert into public.chapters (course_id, title, blurb, position, release_at, is_free)
select 'ai-for-students', title, blurb, pos, release_at, is_free from _m;

insert into public.lessons (course_id, chapter_id, title, position, minutes)
select 'ai-for-students', ch.id, l.title, l.pos, l.minutes
from _l l join _m m on m.pos = l.mpos
join public.chapters ch on ch.course_id = 'ai-for-students' and ch.position = m.pos;

-- Demo footage for every lesson until real videos are uploaded.
insert into public.lesson_media (lesson_id, video_url)
select id, '/media/lesson1.mp4' from public.lessons where course_id = 'ai-for-students';
