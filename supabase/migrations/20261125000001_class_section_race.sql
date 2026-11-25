-- Class section (optional) and a time-boxed school competition (Chirag 2026-11-25, SVVN workshop).
-- Students of a school with a running race see which class leads on (1) Module 0 watched and (2) course
-- enrollments. Only class names leave the database, never counts or students.

alter table public.profiles add column section text check (section ~ '^[A-F]$');

create or replace function public.set_my_section(p_section text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;
  update public.profiles set section = nullif(upper(trim(p_section)), '') where id = (select auth.uid()) and role = 'student';
end;
$$;
revoke execute on function public.set_my_section(text) from public, anon;
grant execute on function public.set_my_section(text) to authenticated;

create table public.school_races (
  school_id uuid primary key references public.schools(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at)
);
alter table public.school_races enable row level security;
-- No policies: read only through school_race().

-- null when the caller's school has no race on (final result stays visible for 3 days after it ends).
-- A tie goes to the class that reached the number first.
create or replace function public.school_race() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.profiles; r public.school_races; v_watched text; v_enrolled text;
begin
  select * into v from public.profiles where id = (select auth.uid());
  if v.school_id is null then return null; end if;
  select * into r from public.school_races where school_id = v.school_id and now() >= starts_at and now() < ends_at + interval '3 days';
  if not found then return null; end if;

  select 'Class ' || p.grade || coalesce(' ' || p.section, '') into v_watched
  from public.profiles p
  join public.lesson_progress lp on lp.student_id = p.id and lp.completed_at >= r.starts_at and lp.completed_at < r.ends_at
  join public.lessons l on l.id = lp.lesson_id
  join public.chapters c on c.id = l.chapter_id and c.position = 0
  where p.school_id = r.school_id and p.role = 'student' and p.grade is not null
    and coalesce(to_jsonb(p) ->> 'is_test', 'false') <> 'true' and p.duplicate_of is null
  group by p.grade, p.section
  order by count(distinct p.id) desc, max(lp.completed_at), p.grade, p.section limit 1;

  select 'Class ' || p.grade || coalesce(' ' || p.section, '') into v_enrolled
  from public.profiles p
  join public.course_access a on a.student_id = p.id and a.granted_at >= r.starts_at and a.granted_at < r.ends_at
    and not coalesce(a.unlock_all, false)
  where p.school_id = r.school_id and p.role = 'student' and p.grade is not null
    and coalesce(to_jsonb(p) ->> 'is_test', 'false') <> 'true' and p.duplicate_of is null
  group by p.grade, p.section
  order by count(distinct p.id) desc, max(a.granted_at), p.grade, p.section limit 1;

  return jsonb_build_object('ends_at', r.ends_at, 'ended', now() >= r.ends_at,
    'watched', v_watched, 'enrolled', v_enrolled, 'section', v.section, 'student', v.role = 'student');
end;
$$;
revoke execute on function public.school_race() from public, anon;
grant execute on function public.school_race() to authenticated;

-- A workshop signs up a whole school from one Wi-Fi network: higher sign-up limit while any race is on.
create or replace function public.password_signup_allowed(p_ip text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
  v_race boolean := exists (select 1 from public.school_races where now() >= starts_at and now() < ends_at);
begin
  delete from public.signup_attempts where at < now() - interval '2 days';
  if (select count(*) from public.signup_attempts where ip = v_ip and at > now() - interval '1 hour') >= (case when v_race then 150 else 5 end) then return 'hourly_limit'; end if;
  if (select count(*) from public.signup_attempts where ip = v_ip and at > now() - interval '1 day') >= (case when v_race then 300 else 20 end) then return 'daily_limit'; end if;
  insert into public.signup_attempts (ip) values (v_ip);
  return 'ok';
end;
$$;
revoke execute on function public.password_signup_allowed(text) from public, anon, authenticated;
grant execute on function public.password_signup_allowed(text) to service_role;

-- SVVN: 48 hours from 26 Nov 2026, 08:00 IST.
insert into public.school_races (school_id, starts_at, ends_at)
select id, timestamptz '2026-11-26 08:00+05:30', timestamptz '2026-11-28 08:00+05:30' from public.schools where code = 'SVVN-81A';
