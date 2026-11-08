-- Per-student activity tracking and scorecard for Studio analytics.
--  1. resource_views: one row per student per PDF/resource (opens, downloads, first/last time).
--     Students log through log_resource_view(); nobody writes the table directly.
--  2. admin_student_scores(p_school_id, p_days): every student with all activity counts and a 0-100 score.
--  3. admin_student_activity(p_student_id): one student's full detail and timeline.
--  4. admin_school_scores(p_days): the same numbers rolled up per school.
--
-- Score (0-100), each part capped at its weight:
--   lessons completed / published lessons ........ 35
--   quizzes: average best score % over published . 25  (a quiz never tried counts 0)
--   checkpoints: correct / answered x answered-share 10
--   assignments submitted / published ............. 10
--   resources opened / available .................. 5
--   active days in the last 30 (10+ days = full) .. 15

create table public.resource_views (
  student_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.module_resources (id) on delete cascade,
  opens int not null default 0 check (opens >= 0),
  downloads int not null default 0 check (downloads >= 0),
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (student_id, resource_id)
);
create index resource_views_resource_idx on public.resource_views (resource_id);
alter table public.resource_views enable row level security;
create policy resource_views_admin_read on public.resource_views for select to authenticated using (public.is_admin());
create policy resource_views_own_read on public.resource_views for select to authenticated using (student_id = auth.uid());

create or replace function public.log_resource_view(p_resource_id uuid, p_kind text default 'open') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind not in ('open', 'download') then raise exception 'Unknown kind'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'student') then return; end if;
  if not exists (select 1 from public.module_resources r where r.id = p_resource_id and public.can_open_chapter(r.chapter_id)) then
    raise exception 'Resource not found';
  end if;
  insert into public.resource_views as v (student_id, resource_id, opens, downloads)
  values (auth.uid(), p_resource_id, (p_kind = 'open')::int, (p_kind = 'download')::int)
  on conflict (student_id, resource_id) do update
    set opens = v.opens + (p_kind = 'open')::int,
        downloads = v.downloads + (p_kind = 'download')::int,
        last_at = now();
end;
$$;
revoke execute on function public.log_resource_view(uuid, text) from public, anon;
grant execute on function public.log_resource_view(uuid, text) to authenticated;

-- Shared per-student rows. Internal: no grants, called by the admin functions below.
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
  st as (select pr.id, pr.full_name, pr.grade, pr.school_id, sc.name school, pr.created_at
         from public.profiles pr left join public.schools sc on sc.id = pr.school_id
         where pr.role = 'student' and (p_school_id is null or pr.school_id = p_school_id)),
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
    round(
        35.0 * coalesce(least(completed::numeric / nullif(l, 0), 1), 0)
      + 25.0 * coalesce(least(q_best_sum::numeric / nullif(qz, 0) / 100, 1), 0)
      + 10.0 * coalesce(ck_ok::numeric / nullif(ck_n, 0), 0) * least(ck_n::numeric / greatest(l, 1), 1)
      + 10.0 * coalesce(least(sub_n::numeric / nullif(asg, 0), 1), 0)
      +  5.0 * coalesce(least(rv_n::numeric / nullif(res, 0), 1), 0)
      + 15.0 * least(d30 / 10.0, 1)
    )::int
  from rows;
$$;
revoke execute on function public.student_score_rows(uuid, int) from public, anon, authenticated;

create or replace function public.admin_student_scores(p_school_id uuid default null, p_days int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r) order by r.score desc nulls last, r.full_name)
                   from public.student_score_rows(p_school_id, p_days) r), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_student_scores(uuid, int) from public, anon;
grant execute on function public.admin_student_scores(uuid, int) to authenticated;

create or replace function public.admin_school_scores(p_days int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'school_id', school_id, 'school', coalesce(school, 'No school'), 'students', n, 'paid', paid,
      'started_module0', m0_started, 'finished_module0', m0_finished, 'passed_a_quiz', quiz_pass,
      'opened_a_resource', res, 'active_7d_or_30d', active30, 'avg_score', avg_score) order by n desc)
    from (select school_id, school, count(*) n, count(*) filter (where paid) paid,
                 count(*) filter (where lessons_started > 0) m0_started,
                 count(*) filter (where module0_lessons > 0 and module0_completed >= module0_lessons) m0_finished,
                 count(*) filter (where quizzes_passed > 0) quiz_pass, count(*) filter (where resources_opened > 0) res,
                 count(*) filter (where active_days_30 > 0) active30, round(avg(score)) avg_score
          from public.student_score_rows(null, p_days) group by 1, 2) t), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_school_scores(int) from public, anon;
grant execute on function public.admin_school_scores(int) to authenticated;

create or replace function public.admin_student_activity(p_student_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then raise exception 'Student not found'; end if;
  return jsonb_build_object(
    'summary', (select to_jsonb(r) from public.student_score_rows(null, 30) r where r.student_id = p_student_id),
    'lessons', (select coalesce(jsonb_agg(jsonb_build_object('module', c.position, 'lesson', l.title, 'position', l.position,
                  'minutes_watched', round(coalesce(lp.seconds_watched, 0) / 60.0), 'completed_at', lp.completed_at, 'last_at', lp.updated_at)
                  order by c.position, l.position), '[]')
                from public.lessons l join public.chapters c on c.id = l.chapter_id
                left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = p_student_id),
    'quizzes', (select coalesce(jsonb_agg(jsonb_build_object('quiz', qz.title, 'module', c.position, 'attempts', a.n, 'best_pct', a.best,
                  'passed', a.passed, 'first_try_passed', a.first_passed, 'last_at', a.last_at) order by c.position), '[]')
                from public.quizzes qz join public.chapters c on c.id = qz.chapter_id
                left join lateral (select count(*) n, max(round(100.0 * score / nullif(total, 0))) best, bool_or(passed) passed,
                    (array_agg(passed order by created_at))[1] first_passed, max(created_at) last_at
                  from public.quiz_attempts where quiz_id = qz.id and student_id = p_student_id) a on true
                where qz.published),
    'assignments', (select coalesce(jsonb_agg(jsonb_build_object('assignment', a.title, 'status', s.status, 'marks', s.marks,
                  'max_marks', a.max_marks, 'submitted_at', s.submitted_at) order by a.position), '[]')
                from public.assignments a left join public.assignment_submissions s on s.assignment_id = a.id and s.student_id = p_student_id
                where a.published),
    'resources', (select coalesce(jsonb_agg(jsonb_build_object('resource', m.title, 'module', c.position, 'opens', coalesce(v.opens, 0),
                  'downloads', coalesce(v.downloads, 0), 'first_at', v.first_at, 'last_at', v.last_at) order by c.position, m.position), '[]')
                from public.module_resources m join public.chapters c on c.id = m.chapter_id
                left join public.resource_views v on v.resource_id = m.id and v.student_id = p_student_id),
    'checkpoints', jsonb_build_object(
                'answered', (select count(*) from public.checkpoint_answers where student_id = p_student_id),
                'correct', (select count(*) from public.checkpoint_answers where student_id = p_student_id and correct)),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'minutes', round(seconds / 60.0)) order by day desc), '[]')
             from (select day, seconds from public.learning_days where student_id = p_student_id order by day desc limit 60) d),
    'timeline', (select coalesce(jsonb_agg(jsonb_build_object('at', at, 'kind', kind, 'detail', detail) order by at desc), '[]') from (
        select lp.completed_at at, 'lesson_completed' kind, l.title detail from public.lesson_progress lp
          join public.lessons l on l.id = lp.lesson_id where lp.student_id = p_student_id and lp.completed_at is not null
        union all select a.created_at, case when a.passed then 'quiz_passed' else 'quiz_failed' end,
          q.title || ' (' || a.score || '/' || a.total || ')' from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
          where a.student_id = p_student_id
        union all select s.submitted_at, 'assignment_submitted', a.title from public.assignment_submissions s
          join public.assignments a on a.id = s.assignment_id where s.student_id = p_student_id
        union all select v.first_at, 'resource_opened', m.title from public.resource_views v
          join public.module_resources m on m.id = v.resource_id where v.student_id = p_student_id
        union all select granted_at, 'course_access', source from public.course_access where student_id = p_student_id
        union all select created_at, 'signed_up', null from public.profiles where id = p_student_id
        order by 1 desc limit 200) t));
end;
$$;
revoke execute on function public.admin_student_activity(uuid) from public, anon;
grant execute on function public.admin_student_activity(uuid) to authenticated;
