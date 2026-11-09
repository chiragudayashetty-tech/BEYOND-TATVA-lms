-- Weekly batches (Chirag 2026-11-09). The course runs 5 weeks, one module a week, Sunday 10:00 IST.
-- A student's batch starts on the first Sunday after the day they got course access (paid / key / admin),
-- so everyone who gets access Sunday–Saturday starts together the next Sunday. Everyone with access
-- before Sunday 15 Nov 2026 is Batch 1 (starts 15 Nov).
-- Each paid module has a week number (batch_week). Batch 1 can use a different order (batch1_week):
-- 1, 3, 2, 4, 5 = Module 1, then Module 3, then Module 2, then 4, then 5.
-- chapters.release_at still means "content ready from": a student's module opens at the later of
-- release_at and their batch date, and 2099 still means "Coming soon" for everyone.
-- Modules without a week (Module 0, free modules) keep the single release_at for everyone.

alter table public.courses add column batch1_start timestamptz;
alter table public.chapters
  add column batch_week smallint check (batch_week between 1 and 52),
  add column batch1_week smallint check (batch1_week between 1 and 52);

-- Batch start for an access time: the next Sunday 10:00 IST after that day, never before Batch 1.
create function public.batch_start_for(p_course text, p_granted timestamptz) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select greatest(
    (((p_granted at time zone 'Asia/Kolkata')::date
      + (7 - extract(dow from (p_granted at time zone 'Asia/Kolkata'))::int)) + time '10:00') at time zone 'Asia/Kolkata',
    c.batch1_start)
  from public.courses c where c.id = p_course;
$$;

-- Batch number: 1 for the first batch, then one per week.
create function public.batch_number_for(p_course text, p_granted timestamptz) returns int
language sql stable security definer set search_path = '' as $$
  select 1 + (extract(epoch from public.batch_start_for(p_course, p_granted) - c.batch1_start) / 604800)::int
  from public.courses c where c.id = p_course and c.batch1_start is not null;
$$;

-- When a chapter opens for a student. Without a batch (no access, no week, no Batch 1 date) it is release_at.
create function public.chapter_release_for(p_chapter uuid, p_student uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select case
    when ch.batch_week is null or c.batch1_start is null or ca.granted_at is null then ch.release_at
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

-- The viewer's own release time per module (the app shows dates and countdowns from this).
create function public.my_module_releases(p_course text)
returns table (chapter_id uuid, release_at timestamptz, batch int)
language sql stable security definer set search_path = '' as $$
  select ch.id, public.chapter_release_for(ch.id, (select auth.uid())),
         (select public.batch_number_for(p_course, ca.granted_at) from public.course_access ca
           where ca.course_id = p_course and ca.student_id = (select auth.uid()))
  from public.chapters ch where ch.course_id = p_course;
$$;

-- Studio: each student's batch.
create function public.admin_student_batches(p_course text)
returns table (student_id uuid, granted_at timestamptz, batch int, batch_start timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query select ca.student_id, ca.granted_at, public.batch_number_for(p_course, ca.granted_at),
                      public.batch_start_for(p_course, ca.granted_at)
               from public.course_access ca where ca.course_id = p_course;
end;
$$;

-- Access checks now use the student's own release time.
create or replace function public.can_open_chapter(p_chapter uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chapters ch
    where ch.id = p_chapter
      and (public.is_admin() or (
        coalesce(public.chapter_release_for(ch.id, (select auth.uid())), now()) <= now()
        and (ch.is_free or public.has_course_access(ch.course_id))
      ))
  );
$$;

create or replace function public.can_watch_lesson(p_lesson uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson and public.can_open_chapter(l.chapter_id)
  );
$$;

revoke execute on function public.batch_start_for, public.batch_number_for, public.chapter_release_for,
  public.my_module_releases, public.admin_student_batches from public, anon;
grant execute on function public.my_module_releases, public.admin_student_batches to authenticated;

-- The schedule Chirag asked for: Batch 1 starts Sunday 15 Nov 2026, 10:00 IST.
-- Weeks: Module 1 → 1, 2 → 2, 3 → 3, 4 → 4, 5 → 5; Batch 1 swaps 2 and 3 (1, 3, 2, 4, 5).
-- Modules 1–5 stay "Coming soon" (2099) until Chirag sets a ready date in Studio → Content.
update public.courses set batch1_start = timestamptz '2026-11-15 10:00 Asia/Kolkata' where id = 'ai-for-students';
update public.chapters set batch_week = position,
  batch1_week = case position when 2 then 3 when 3 then 2 else position end
where course_id = 'ai-for-students' and position between 1 and 5 and not is_free;
