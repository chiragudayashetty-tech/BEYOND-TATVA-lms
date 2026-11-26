-- Race per class only (no sections) where a school wants it (Chirag 2026-11-26: SVVN has Class 8 and 9, no sections).
-- school_races.by_section = false: classes are "Class 8" / "Class 9", sections are ignored and the section picker hides
-- ("student" false also hides it on the older card). Applied to live 2026-11-26 16:10 IST before students logged in.

alter table public.school_races add column if not exists by_section boolean not null default true;
update public.school_races set by_section = false where school_id in (select id from public.schools where code = 'SVVN-81A');

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
    select 'Class ' || p.grade || case when r.by_section then coalesce(' ' || p.section, '') else '' end k, count(distinct p.id) n, max(lp.completed_at) t
    from public.profiles p
    join public.lesson_progress lp on lp.student_id = p.id and lp.completed_at >= r.starts_at and lp.completed_at < r.ends_at
    join public.lessons l on l.id = lp.lesson_id
    join public.chapters c on c.id = l.chapter_id and c.position = 0
    where p.school_id = r.school_id and p.role = 'student' and p.grade is not null and not p.is_test and p.duplicate_of is null
    group by 1 order by n desc, t, k limit 3) x;

  select coalesce(array_agg(k order by n desc, t, k), '{}') into v_enrolled from (
    select 'Class ' || p.grade || case when r.by_section then coalesce(' ' || p.section, '') else '' end k, count(distinct p.id) n, max(a.granted_at) t
    from public.profiles p
    join public.course_access a on a.student_id = p.id and a.granted_at >= r.starts_at and a.granted_at < r.ends_at
      and not coalesce(a.unlock_all, false)
    where p.school_id = r.school_id and p.role = 'student' and p.grade is not null and not p.is_test and p.duplicate_of is null
    group by 1 order by n desc, t, k limit 3) x;

  return jsonb_build_object('ends_at', r.ends_at, 'ended', now() >= r.ends_at, 'school', v_school,
    'watched', v_watched[1], 'enrolled', v_enrolled[1],
    'watched_top', to_jsonb(v_watched), 'enrolled_top', to_jsonb(v_enrolled),
    'my_class', case when v.grade is not null then 'Class ' || v.grade || case when r.by_section then coalesce(' ' || v.section, '') else '' end end,
    'by_section', r.by_section, 'section', case when r.by_section then v.section end,
    'student', v.role = 'student' and r.by_section);
end;
$$;
revoke execute on function public.school_race() from public, anon;
grant execute on function public.school_race() to authenticated;
