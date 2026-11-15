-- Watch tracking that counts what was actually played (Chirag, 2026-11-15).
-- Before: "watched" was the furthest point reached, so skipping to the end completed a lesson, and the
-- length came from lessons.minutes. Now the player sends which 10-second parts were played normally
-- (not jumped over); a lesson is complete when 90% of its parts were seen, using the real video length.
-- The learning score no longer counts active days, and lessons count by % watched, not only completion.

alter table public.lesson_progress
  add column seen int[] not null default '{}',          -- 10-second parts played (0 = 0–9 s, 1 = 10–19 s …)
  add column video_seconds int check (video_seconds between 1 and 14400),   -- real length from the player
  add column watched_pct smallint not null default 0 check (watched_pct between 0 and 100);

-- Existing rows: best estimate from the old furthest point (completed lessons stay complete).
update public.lesson_progress lp set watched_pct = case when lp.completed_at is not null then 100
  else least(100, round(100.0 * lp.seconds_watched / nullif(l.minutes * 60, 0)))::smallint end
from public.lessons l where l.id = lp.lesson_id and l.minutes > 0;

drop function public.save_progress(uuid, int, boolean, int, int);
create function public.save_progress(p_lesson uuid, p_seconds int default null, p_completed boolean default null,
                                     p_position int default null, p_duration int default null, p_seen int[] default null)
returns int    -- % of the lesson watched (null for staff previews)
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_old public.lesson_progress;
  v_len int;
  v_parts int;
  v_cap int;
  v_new int;
  v_pos int;
  v_seen int[];
  v_room int;
  v_pct int;
  v_add int;
  v_done boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then return null; end if;
  if not public.can_watch_lesson(p_lesson) then raise exception 'This lesson isn''t open for you yet'; end if;
  select * into v_old from public.lesson_progress where student_id = v_uid and lesson_id = p_lesson for update;
  -- Length: the player's real duration, else the one stored before, else the minutes typed in Content.
  v_len := case when p_duration between 30 and 14400 then p_duration end;
  v_len := coalesce(v_len, v_old.video_seconds, (select nullif(minutes, 0) * 60 from public.lessons where id = p_lesson));
  v_cap := coalesce(v_len + 600, 14400);
  v_new := least(greatest(coalesce(p_seconds, 0), 0), v_cap);
  v_pos := least(greatest(coalesce(p_position, p_seconds, 0), 0), v_cap);
  v_seen := coalesce(v_old.seen, '{}');

  if p_seen is not null and v_len is not null then
    v_parts := ceil(v_len / 10.0)::int;
    -- Parts can't be played faster than real time: at most (seconds since the last save / 10) + 3 new parts per save.
    v_room := case when v_old.updated_at is null then 9
                   else greatest(extract(epoch from now() - v_old.updated_at)::int / 10, 0) + 3 end;
    v_seen := array(select distinct b from (
                select unnest(v_seen) b
                union all
                (select distinct s from unnest(p_seen) s where s between 0 and v_parts - 1 and not s = any(v_seen) order by s limit v_room)) x
              order by b);
    v_pct := least(100, round(100.0 * cardinality(v_seen) / v_parts))::int;
    v_done := v_pct >= 90;
    v_new := least(cardinality(v_seen) * 10, v_len);         -- seconds actually watched
  else
    -- Older app versions (no parts sent): the old furthest-point rule, until they update.
    v_pct := case when v_len is not null then least(100, round(100.0 * greatest(v_new, coalesce(v_old.seconds_watched, 0)) / v_len))::int end;
    v_done := v_len is not null and greatest(v_new, coalesce(v_old.seconds_watched, 0)) >= v_len * 0.9;
  end if;

  insert into public.lesson_progress as lp (student_id, lesson_id, seconds_watched, last_position_seconds, completed_at, updated_at,
                                            seen, video_seconds, watched_pct)
  values (v_uid, p_lesson, v_new, v_pos, case when v_done then now() end, now(), v_seen,
          case when p_duration between 30 and 14400 then p_duration end, coalesce(v_pct, 0))
  on conflict (student_id, lesson_id) do update set
    seconds_watched = greatest(lp.seconds_watched, excluded.seconds_watched),
    last_position_seconds = case when p_position is null and p_seconds is null then lp.last_position_seconds else excluded.last_position_seconds end,
    completed_at = coalesce(lp.completed_at, excluded.completed_at),
    seen = excluded.seen,
    video_seconds = coalesce(excluded.video_seconds, lp.video_seconds),
    watched_pct = greatest(lp.watched_pct, excluded.watched_pct),
    updated_at = now();

  v_add := greatest(v_new - coalesce(v_old.seconds_watched, 0), 0);
  if v_old.updated_at is not null then
    v_add := least(v_add, greatest(extract(epoch from now() - v_old.updated_at)::int, 0) + 30);
  else
    v_add := least(v_add, 60);
  end if;
  if v_add > 0 then
    insert into public.learning_days as d (student_id, day, seconds)
    values (v_uid, (now() at time zone 'Asia/Kolkata')::date, least(v_add, 21600))
    on conflict (student_id, day) do update set seconds = least(d.seconds + excluded.seconds, 21600);
  end if;
  return greatest(coalesce(v_pct, 0), coalesce(v_old.watched_pct, 0));
end;
$$;
revoke execute on function public.save_progress(uuid, int, boolean, int, int, int[]) from public, anon;
grant execute on function public.save_progress(uuid, int, boolean, int, int, int[]) to authenticated;

-- Learning score: lessons by % watched (50), quizzes 25, checkpoints 10, assignments 10, resources 5.
-- Parts the course doesn't have are left out. Adds watched_pct (average % watched over all lessons).
drop function public.student_score_rows(uuid, int);
create function public.student_score_rows(p_school_id uuid, p_days int) returns table (
  student_id uuid, full_name text, grade smallint, school_id uuid, school text, signed_up_at timestamptz,
  paid boolean, paid_at timestamptz,
  lessons_total int, lessons_started int, lessons_completed int, watch_minutes int,
  module0_lessons int, module0_completed int,
  quizzes_total int, quizzes_attempted int, quizzes_passed int, quiz_attempts int, quiz_first_try_passes int, quiz_avg_best_pct int,
  checkpoints_answered int, checkpoints_correct int,
  assignments_total int, assignments_submitted int, assignments_graded int, assignment_avg_pct int,
  resources_total int, resources_opened int, resource_downloads int,
  active_days_30 int, active_days_range int, last_active date,
  watched_pct int,
  score int
) language sql stable security definer set search_path = '' as $$
  with
  p as (select v_from, (now() at time zone 'Asia/Kolkata')::date as today from
        (select now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 3650)) v_from) x),
  st as (select pr.id, pr.full_name, pr.grade, pr.school_id, coalesce(sc.name, nullif(trim(pr.school_name), '')) school, pr.created_at
         from public.profiles pr left join public.schools sc on sc.id = pr.school_id
         where pr.role = 'student' and pr.duplicate_of is null and (p_school_id is null or pr.school_id = p_school_id)),
  ls as (select l.id, c.position = 0 as m0 from public.lessons l join public.chapters c on c.id = l.chapter_id),
  qz as (select id from public.quizzes where published),
  asg as (select id, max_marks from public.assignments where published),
  lp as (select lp.student_id, count(*) started, count(lp.completed_at) completed,
                count(lp.completed_at) filter (where ls.m0) m0_done, sum(lp.seconds_watched) secs,
                sum(case when lp.completed_at is not null then 100 else lp.watched_pct end) pct_sum
         from public.lesson_progress lp join ls on ls.id = lp.lesson_id group by 1),
  qa as (select a.student_id, a.quiz_id, count(*) n, bool_or(a.passed) passed,
                round(avg(100.0 * a.score / nullif(a.total, 0))) best,
                (array_agg(a.passed order by a.created_at))[1] first_passed
         from public.quiz_attempts a join qz on qz.id = a.quiz_id group by 1, 2),
  q as (select student_id, count(*) tried, count(*) filter (where passed) passed, sum(n) attempts,
               count(*) filter (where first_passed) first_try, sum(best) best_sum from qa group by 1),
  ck as (select student_id, count(*) answered, count(*) filter (where correct) correct from public.checkpoint_answers group by 1),
  sb as (select s.student_id, count(*) submitted, count(*) filter (where s.status = 'graded') graded,
                round(avg(100.0 * s.marks / a.max_marks) filter (where s.status = 'graded' and s.marks is not null)) avg_pct
         from public.assignment_submissions s join asg a on a.id = s.assignment_id group by 1),
  rv as (select student_id, count(*) opened, sum(downloads) downloads from public.resource_views group by 1),
  ad as (select d.student_id, count(*) filter (where d.day > p.today - 30) d30,
                count(*) filter (where d.day >= (p.v_from at time zone 'Asia/Kolkata')::date) drange, max(d.day) last_day
         from (select student_id, day from public.learning_days where seconds > 0
               union select student_id, (created_at at time zone 'Asia/Kolkata')::date from public.checkpoint_answers
               union select student_id, (created_at at time zone 'Asia/Kolkata')::date from public.quiz_attempts
               union select student_id, (updated_at at time zone 'Asia/Kolkata')::date from public.assignment_submissions
               union select student_id, (last_at at time zone 'Asia/Kolkata')::date from public.resource_views) d, p
         group by 1),
  wm as (select student_id, sum(seconds) secs from public.learning_days group by 1),
  pa as (select student_id, min(granted_at) at from public.course_access group by 1),
  tot as (select (select count(*) from ls) l, (select count(*) from ls where m0) m0, (select count(*) from qz) qz,
                 (select count(*) from asg) asg, (select count(*) from public.module_resources) res),
  rows as (
    select st.*, tot.*, pa.at paid_at,
      coalesce(lp.started, 0) started, coalesce(lp.pct_sum, 0) pct_sum, coalesce(lp.completed, 0) completed, coalesce(lp.m0_done, 0) m0_done,
      greatest(coalesce(wm.secs, 0), coalesce(lp.secs, 0)) secs,
      coalesce(q.tried, 0) q_tried, coalesce(q.passed, 0) q_passed, coalesce(q.attempts, 0) q_attempts,
      coalesce(q.first_try, 0) q_first, coalesce(q.best_sum, 0) q_best_sum,
      coalesce(ck.answered, 0) ck_n, coalesce(ck.correct, 0) ck_ok,
      coalesce(sb.submitted, 0) sub_n, coalesce(sb.graded, 0) sub_graded, sb.avg_pct sub_pct,
      coalesce(rv.opened, 0) rv_n, coalesce(rv.downloads, 0) rv_dl,
      coalesce(ad.d30, 0) d30, coalesce(ad.drange, 0) drange, ad.last_day
    from st cross join tot
    left join lp on lp.student_id = st.id left join q on q.student_id = st.id left join ck on ck.student_id = st.id
    left join sb on sb.student_id = st.id left join rv on rv.student_id = st.id left join ad on ad.student_id = st.id
    left join wm on wm.student_id = st.id left join pa on pa.student_id = st.id)
  select id, full_name, grade, school_id, school, created_at, paid_at is not null, paid_at,
    l::int, started::int, completed::int, round(secs / 60.0)::int, m0::int, m0_done::int,
    qz::int, q_tried::int, q_passed::int, q_attempts::int, q_first::int,
    case when qz > 0 then round(q_best_sum::numeric / qz)::int end,
    ck_n::int, ck_ok::int, asg::int, sub_n::int, sub_graded::int, sub_pct::int,
    res::int, rv_n::int, rv_dl::int, d30::int, drange::int, last_day,
    case when l > 0 then round(pct_sum::numeric / l)::int end,
    -- Only parts that exist count. Lessons: average % watched (completed = 100). Active days no longer count.
    round(100.0 * (
        case when l > 0 then 50.0 * least(pct_sum::numeric / l / 100, 1) else 0 end
      + case when qz > 0 then 25.0 * least(q_best_sum::numeric / qz / 100, 1) else 0 end
      + case when ck_n > 0 then 10.0 * (ck_ok::numeric / ck_n) * least(ck_n::numeric / greatest(l, 1), 1) else 0 end
      + case when asg > 0 then 10.0 * least(sub_n::numeric / asg, 1) else 0 end
      + case when res > 0 then 5.0 * least(rv_n::numeric / res, 1) else 0 end
    ) / nullif(case when l > 0 then 50 else 0 end + case when qz > 0 then 25 else 0 end + case when l > 0 then 10 else 0 end
         + case when asg > 0 then 10 else 0 end + case when res > 0 then 5 else 0 end, 0)
    )::int
  from rows;
$$;
revoke execute on function public.student_score_rows(uuid, int) from public, anon, authenticated;
