-- Duplicate student logins: one child, two emails. The extra login is marked duplicate_of the main
-- account. It still works for signing in, but analytics count the child once (main account only).
alter table public.profiles add column duplicate_of uuid references public.profiles (id) on delete set null
  check (duplicate_of <> id);
create index profiles_duplicate_of_idx on public.profiles (duplicate_of);

create or replace function public.admin_mark_duplicate_account(p_duplicate uuid, p_main uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_duplicate = p_main then raise exception 'Choose two different accounts'; end if;
  if (select count(*) from public.profiles where id in (p_duplicate, p_main) and role = 'student') <> 2 then
    raise exception 'Both accounts must be students';
  end if;
  if exists (select 1 from public.profiles where id = p_main and duplicate_of is not null) then
    raise exception 'The main account is itself marked as a duplicate';
  end if;
  update public.profiles set duplicate_of = p_main where id = p_duplicate;
end;
$$;
revoke execute on function public.admin_mark_duplicate_account(uuid, uuid) from public, anon;
grant execute on function public.admin_mark_duplicate_account(uuid, uuid) to authenticated;

create or replace function public.student_score_rows(p_school_id uuid, p_days int) returns table (
  student_id uuid, full_name text, grade smallint, school_id uuid, school text, signed_up_at timestamptz,
  paid boolean, paid_at timestamptz,
  lessons_total int, lessons_started int, lessons_completed int, watch_minutes int,
  module0_lessons int, module0_completed int,
  quizzes_total int, quizzes_attempted int, quizzes_passed int, quiz_attempts int, quiz_first_try_passes int, quiz_avg_best_pct int,
  checkpoints_answered int, checkpoints_correct int,
  assignments_total int, assignments_submitted int, assignments_graded int, assignment_avg_pct int,
  resources_total int, resources_opened int, resource_downloads int,
  active_days_30 int, active_days_range int, last_active date,
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
                count(lp.completed_at) filter (where ls.m0) m0_done, sum(lp.seconds_watched) secs
         from public.lesson_progress lp join ls on ls.id = lp.lesson_id group by 1),
  qa as (select a.student_id, a.quiz_id, count(*) n, bool_or(a.passed) passed,
                max(round(100.0 * a.score / nullif(a.total, 0))) best,
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
      coalesce(lp.started, 0) started, coalesce(lp.completed, 0) completed, coalesce(lp.m0_done, 0) m0_done,
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
    -- Only parts that exist count: a course with no assignments scores out of the other parts.
    round(100.0 * (
        case when l > 0 then 35.0 * least(completed::numeric / l, 1) else 0 end
      + case when qz > 0 then 25.0 * least(q_best_sum::numeric / qz / 100, 1) else 0 end
      + case when ck_n > 0 then 10.0 * (ck_ok::numeric / ck_n) * least(ck_n::numeric / greatest(l, 1), 1) else 0 end
      + case when asg > 0 then 10.0 * least(sub_n::numeric / asg, 1) else 0 end
      + case when res > 0 then 5.0 * least(rv_n::numeric / res, 1) else 0 end
      + 15.0 * least(d30 / 10.0, 1)
    ) / (case when l > 0 then 35 else 0 end + case when qz > 0 then 25 else 0 end + case when l > 0 then 10 else 0 end
         + case when asg > 0 then 10 else 0 end + case when res > 0 then 5 else 0 end + 15)
    )::int
  from rows;
$$;
revoke execute on function public.student_score_rows(uuid, int) from public, anon, authenticated;
