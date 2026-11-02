-- M2 (audit 2026-11-01): students could write their own progress and answers for any lesson, including
-- locked ones, and add unlimited correct answers (XP). Writes now go only through checked functions.
-- M3: submit_quiz returned every correct answer on every attempt. Correct answers and explanations are
-- now shown only after a pass or from the 3rd attempt; attempts have a 30-second cooldown.

-- ── M2: progress and in-video answers ────────────────────────────────────────
drop policy if exists "write own progress" on public.lesson_progress;
drop policy if exists "update own progress" on public.lesson_progress;
drop policy if exists "write own answers" on public.checkpoint_answers;
revoke insert, update, delete on public.lesson_progress, public.checkpoint_answers from anon, authenticated;

-- One answer per question per lesson per student (the first answer counts). Keep the earliest duplicate.
delete from public.checkpoint_answers a using public.checkpoint_answers b
where a.student_id = b.student_id and a.lesson_id is not distinct from b.lesson_id and a.question = b.question and a.id > b.id;
create unique index checkpoint_answers_once on public.checkpoint_answers (student_id, lesson_id, question);

create or replace function public.save_progress(p_lesson uuid, p_seconds int default null, p_completed boolean default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_cap int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then return; end if; -- staff previews aren't saved
  if not public.can_watch_lesson(p_lesson) then raise exception 'This lesson isn''t open for you yet'; end if;
  -- Watch time can't exceed the lesson length (+10 min slack; 4 h when no length is set).
  select coalesce(minutes * 60 + 600, 14400) into v_cap from public.lessons where id = p_lesson;
  insert into public.lesson_progress as lp (student_id, lesson_id, seconds_watched, completed_at, updated_at)
  values (v_uid, p_lesson, least(greatest(coalesce(p_seconds, 0), 0), v_cap), case when p_completed then now() end, now())
  on conflict (student_id, lesson_id) do update set
    seconds_watched = greatest(lp.seconds_watched, least(greatest(coalesce(p_seconds, 0), 0), v_cap)),
    completed_at = case when p_completed is null then lp.completed_at
                        when p_completed then coalesce(lp.completed_at, now()) else null end,
    updated_at = now();
end;
$$;

create or replace function public.save_answer(p_lesson uuid, p_question text, p_correct boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then return false; end if;
  if not public.can_watch_lesson(p_lesson) then raise exception 'This lesson isn''t open for you yet'; end if;
  if coalesce(trim(p_question), '') = '' or char_length(p_question) > 300 then raise exception 'Invalid question'; end if;
  if (select count(*) from public.checkpoint_answers where student_id = v_uid and lesson_id = p_lesson) >= 20 then return false; end if;
  insert into public.checkpoint_answers (student_id, lesson_id, question, correct)
  values (v_uid, p_lesson, trim(p_question), coalesce(p_correct, false))
  on conflict (student_id, lesson_id, question) do nothing;
  return found;
end;
$$;

revoke execute on function public.save_progress, public.save_answer from public, anon;
grant execute on function public.save_progress, public.save_answer to authenticated;

-- ── M3: quiz answers only after a pass or 3 attempts ─────────────────────────
create or replace function public.submit_quiz(p_quiz uuid, p_answers int[]) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_quiz public.quizzes;
  v_total int;
  v_score int := 0;
  v_results json;
  v_passed boolean;
  v_student boolean;
  v_attempts int := 0;
  v_reveal boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_quiz from public.quizzes where id = p_quiz;
  if v_quiz.id is null or not v_quiz.published or not public.can_open_chapter(v_quiz.chapter_id) then
    raise exception 'This quiz isn''t open for you yet';
  end if;
  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz;
  if v_total = 0 then raise exception 'This quiz has no questions yet'; end if;
  if coalesce(cardinality(p_answers), 0) <> v_total then raise exception 'Answer every question before submitting'; end if;

  v_student := exists (select 1 from public.profiles where id = v_uid and role = 'student');
  if v_student then
    if exists (select 1 from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid and created_at > now() - interval '30 seconds') then
      raise exception 'Take a short break: you can try again in 30 seconds';
    end if;
    select count(*) into v_attempts from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid;
  end if;

  select count(*) filter (where p_answers[i] = correct_index) into v_score
  from (select row_number() over (order by position, id) as i, correct_index from public.quiz_questions where quiz_id = p_quiz) q;
  v_passed := v_score * 100 >= v_quiz.pass_percent * v_total;
  -- Staff (teachers/admins) always see answers; students after passing or on/after the 3rd attempt.
  v_reveal := not v_student or v_passed or v_attempts + 1 >= 3
              or exists (select 1 from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid and passed);

  with q as (
    select row_number() over (order by position, id) as i, id, correct_index, explanation
    from public.quiz_questions where quiz_id = p_quiz
  )
  select json_agg(json_build_object('question_id', id, 'picked', p_answers[i], 'correct', p_answers[i] = correct_index,
                                    'correct_index', case when v_reveal then correct_index end,
                                    'explanation', case when v_reveal then explanation end) order by i)
  into v_results from q;

  if v_student then
    insert into public.quiz_attempts (quiz_id, student_id, answers, score, total, passed)
    values (p_quiz, v_uid, p_answers, v_score, v_total, v_passed);
  end if;
  return json_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'pass_percent', v_quiz.pass_percent,
                           'xp', case when v_passed then v_quiz.xp else 0 end, 'results', v_results,
                           'revealed', v_reveal, 'attempt', v_attempts + 1);
end;
$$;
