-- admin_school_scores.started_module0 counted a start in ANY module. Now it counts students who
-- opened at least one Module 0 (chapter position 0) lesson. Nothing else changes.
create or replace function public.admin_school_scores(p_days int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'school_id', school_id, 'school', coalesce(school, 'No school'), 'students', n, 'paid', paid,
      'started_module0', m0_started, 'finished_module0', m0_finished, 'passed_a_quiz', quiz_pass,
      'opened_a_resource', res, 'active_7d_or_30d', active30, 'avg_score', avg_score) order by n desc)
    from (select r.school_id, r.school, count(*) n, count(*) filter (where r.paid) paid,
                 count(*) filter (where exists (select 1 from public.lesson_progress lp
                     join public.lessons l on l.id = lp.lesson_id join public.chapters c on c.id = l.chapter_id
                     where lp.student_id = r.student_id and c.position = 0)) m0_started,
                 count(*) filter (where r.module0_lessons > 0 and r.module0_completed >= r.module0_lessons) m0_finished,
                 count(*) filter (where r.quizzes_passed > 0) quiz_pass, count(*) filter (where r.resources_opened > 0) res,
                 count(*) filter (where r.active_days_30 > 0) active30, round(avg(r.score)) avg_score
          from public.student_score_rows(null, p_days) r group by 1, 2) t), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_school_scores(int) from public, anon;
grant execute on function public.admin_school_scores(int) to authenticated;
