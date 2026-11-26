-- Class race for any school (Chirag 2026-11-25): start one from Studio after a workshop, not by SQL.
--   • admin_races() lists races; admin_start_race() starts or replaces one; admin_end_race() ends it now.
--   • school_race() also returns the school name, the top 3 classes per category (names only, never
--     counts or students) and the caller's own class, for the new race card.

create or replace function public.admin_races()
returns table (school_id uuid, school text, starts_at timestamptz, ends_at timestamptz, status text)
language sql stable security definer set search_path = '' as $$
  select r.school_id, s.name, r.starts_at, r.ends_at,
         case when now() < r.starts_at then 'upcoming' when now() < r.ends_at then 'live' else 'ended' end
  from public.school_races r join public.schools s on s.id = r.school_id
  where public.is_admin()
  order by r.ends_at desc;
$$;
revoke execute on function public.admin_races() from public, anon;
grant execute on function public.admin_races() to authenticated;

-- One race per school: starting again replaces the old one. 1 hour to 14 days.
create or replace function public.admin_start_race(p_school uuid, p_starts timestamptz, p_hours int)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = 'insufficient_privilege'; end if;
  if p_school is null or not exists (select 1 from public.schools where id = p_school) then raise exception 'Pick a school'; end if;
  if p_hours is null or p_hours < 1 or p_hours > 336 then raise exception 'A race lasts 1 hour to 14 days'; end if;
  insert into public.school_races (school_id, starts_at, ends_at)
  values (p_school, coalesce(p_starts, now()), coalesce(p_starts, now()) + make_interval(hours => p_hours))
  on conflict (school_id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at;
end;
$$;
revoke execute on function public.admin_start_race(uuid, timestamptz, int) from public, anon;
grant execute on function public.admin_start_race(uuid, timestamptz, int) to authenticated;

-- Ends a live race now (the final result stays up 3 days); removes one that hasn't started or already ended.
create or replace function public.admin_end_race(p_school uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = 'insufficient_privilege'; end if;
  update public.school_races set ends_at = now() where school_id = p_school and now() >= starts_at and now() < ends_at;
  if not found then delete from public.school_races where school_id = p_school; end if;
end;
$$;
revoke execute on function public.admin_end_race(uuid) from public, anon;
grant execute on function public.admin_end_race(uuid) to authenticated;

-- Same rules as before (ties go to the class that got there first; test and duplicate accounts don't count).
create or replace function public.school_race() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v public.profiles; r public.school_races; v_watched text[]; v_enrolled text[]; v_school text;
begin
  select * into v from public.profiles where id = (select auth.uid());
  if v.school_id is null then return null; end if;
  select * into r from public.school_races where school_id = v.school_id and now() >= starts_at and now() < ends_at + interval '3 days';
  if not found then return null; end if;
  select name into v_school from public.schools where id = r.school_id;

  select coalesce(array_agg(k order by n desc, t, k), '{}') into v_watched from (
    select 'Class ' || p.grade || coalesce(' ' || p.section, '') k, count(distinct p.id) n, max(lp.completed_at) t
    from public.profiles p
    join public.lesson_progress lp on lp.student_id = p.id and lp.completed_at >= r.starts_at and lp.completed_at < r.ends_at
    join public.lessons l on l.id = lp.lesson_id
    join public.chapters c on c.id = l.chapter_id and c.position = 0
    where p.school_id = r.school_id and p.role = 'student' and p.grade is not null and not p.is_test and p.duplicate_of is null
    group by p.grade, p.section order by n desc, t, k limit 3) x;

  select coalesce(array_agg(k order by n desc, t, k), '{}') into v_enrolled from (
    select 'Class ' || p.grade || coalesce(' ' || p.section, '') k, count(distinct p.id) n, max(a.granted_at) t
    from public.profiles p
    join public.course_access a on a.student_id = p.id and a.granted_at >= r.starts_at and a.granted_at < r.ends_at
      and not coalesce(a.unlock_all, false)
    where p.school_id = r.school_id and p.role = 'student' and p.grade is not null and not p.is_test and p.duplicate_of is null
    group by p.grade, p.section order by n desc, t, k limit 3) x;

  return jsonb_build_object('ends_at', r.ends_at, 'ended', now() >= r.ends_at, 'school', v_school,
    'watched', v_watched[1], 'enrolled', v_enrolled[1],
    'watched_top', to_jsonb(v_watched), 'enrolled_top', to_jsonb(v_enrolled),
    'my_class', case when v.grade is not null then 'Class ' || v.grade || coalesce(' ' || v.section, '') end,
    'section', v.section, 'student', v.role = 'student');
end;
$$;
revoke execute on function public.school_race() from public, anon;
grant execute on function public.school_race() to authenticated;
