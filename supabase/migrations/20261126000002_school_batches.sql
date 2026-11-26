-- One school = one batch (Chirag 2026-11-26). schools.batch_start set → every student of that school follows the
-- school's weekly schedule, whenever they joined: Module 1 at batch_start, then one module a week (batch_week,
-- never the Batch 1 reorder). A late joiner gets every module that is already out. Still never before the module's
-- own release_at (Coming soon stays closed) and unlock_all still skips the schedule.
-- Students with no school, or a school with no batch_start, keep the old per-access weekly batches.
-- SVVN: Sunday 29 Nov 2026, 10:00 IST.

alter table public.schools add column if not exists batch_start timestamptz;

create or replace function public.chapter_release_for(p_chapter uuid, p_student uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select case
    when ch.batch_week is null or coalesce(ca.unlock_all, false) then ch.release_at
    when sc.batch_start is not null then greatest(ch.release_at, sc.batch_start + make_interval(days => 7 * (ch.batch_week - 1)))
    when c.batch1_start is null or ca.granted_at is null then ch.release_at
    else greatest(ch.release_at,
      public.batch_start_for(ch.course_id, ca.granted_at)
      + make_interval(days => 7 * ((case when public.batch_number_for(ch.course_id, ca.granted_at) = 1
                                         then coalesce(ch.batch1_week, ch.batch_week) else ch.batch_week end) - 1)))
  end
  from public.chapters ch
  join public.courses c on c.id = ch.course_id
  left join public.course_access ca on ca.course_id = ch.course_id and ca.student_id = p_student
  left join public.profiles p on p.id = p_student
  left join public.schools sc on sc.id = p.school_id
  where ch.id = p_chapter;
$$;

-- Studio: a school batch shows the school's start date.
create or replace function public.admin_student_batches(p_course text)
returns table (student_id uuid, granted_at timestamptz, batch int, batch_start timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query select ca.student_id, ca.granted_at,
                      case when sc.batch_start is null then public.batch_number_for(p_course, ca.granted_at) end,
                      coalesce(sc.batch_start, public.batch_start_for(p_course, ca.granted_at))
               from public.course_access ca
               left join public.profiles p on p.id = ca.student_id
               left join public.schools sc on sc.id = p.school_id
               where ca.course_id = p_course;
end;
$$;

update public.schools set batch_start = timestamptz '2026-11-29 10:00+05:30' where code = 'SVVN-81A';
