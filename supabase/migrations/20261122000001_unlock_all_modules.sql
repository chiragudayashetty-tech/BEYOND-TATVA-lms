-- Presenters / guests: an admin can open every released module at once for one account,
-- skipping the weekly batch schedule. "Coming soon" modules (release_at in the future) stay closed.
alter table public.course_access add column if not exists unlock_all boolean not null default false;

create or replace function public.chapter_release_for(p_chapter uuid, p_student uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select case
    when ch.batch_week is null or c.batch1_start is null or ca.granted_at is null or ca.unlock_all then ch.release_at
    else greatest(ch.release_at,
      public.batch_start_for(ch.course_id, ca.granted_at)
      + make_interval(days => 7 * ((case when public.batch_number_for(ch.course_id, ca.granted_at) = 1
                                         then coalesce(ch.batch1_week, ch.batch_week) else ch.batch_week end) - 1)))
  end
  from public.chapters ch
  join public.courses c on c.id = ch.course_id
  left join public.course_access ca on ca.course_id = ch.course_id and ca.student_id = p_student
  where ch.id = p_chapter;
$$;
revoke execute on function public.chapter_release_for from public, anon;
