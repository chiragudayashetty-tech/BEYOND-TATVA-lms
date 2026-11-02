-- Student analytics: a per-day learning log (India time) so dashboards can show real minutes per day,
-- streaks and a monthly activity calendar, plus one read function for the student dashboard.
-- Only new watching counts: the log starts empty (no guessed backfill).

create table public.learning_days (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,                        -- Asia/Kolkata calendar day
  seconds int not null default 0 check (seconds between 0 and 21600),   -- max 6 h a day
  primary key (student_id, day)
);
alter table public.learning_days enable row level security;
create policy "students read own days" on public.learning_days for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
revoke insert, update, delete on public.learning_days from anon, authenticated;  -- written only by save_progress

-- save_progress: unchanged behaviour, plus it adds newly watched seconds to today's row.
-- The added time can't exceed the real time since the last save (+30 s), so skipping ahead doesn't count.
create or replace function public.save_progress(p_lesson uuid, p_seconds int default null, p_completed boolean default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_cap int;
  v_old public.lesson_progress;
  v_new int;
  v_add int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then return; end if; -- staff previews aren't saved
  if not public.can_watch_lesson(p_lesson) then raise exception 'This lesson isn''t open for you yet'; end if;
  -- Watch time can't exceed the lesson length (+10 min slack; 4 h when no length is set).
  select coalesce(minutes * 60 + 600, 14400) into v_cap from public.lessons where id = p_lesson;
  select * into v_old from public.lesson_progress where student_id = v_uid and lesson_id = p_lesson for update;
  v_new := least(greatest(coalesce(p_seconds, 0), 0), v_cap);
  insert into public.lesson_progress as lp (student_id, lesson_id, seconds_watched, completed_at, updated_at)
  values (v_uid, p_lesson, v_new, case when p_completed then now() end, now())
  on conflict (student_id, lesson_id) do update set
    seconds_watched = greatest(lp.seconds_watched, v_new),
    completed_at = case when p_completed is null then lp.completed_at
                        when p_completed then coalesce(lp.completed_at, now()) else null end,
    updated_at = now();

  v_add := greatest(v_new - coalesce(v_old.seconds_watched, 0), 0);
  if v_old.updated_at is not null then
    v_add := least(v_add, greatest(extract(epoch from now() - v_old.updated_at)::int, 0) + 30);
  else
    v_add := least(v_add, 60);   -- first save of a lesson: at most a minute
  end if;
  if v_add > 0 then
    insert into public.learning_days as d (student_id, day, seconds)
    values (v_uid, (now() at time zone 'Asia/Kolkata')::date, least(v_add, 21600))
    on conflict (student_id, day) do update set seconds = least(d.seconds + excluded.seconds, 21600);
  end if;
end;
$$;
revoke execute on function public.save_progress(uuid, int, boolean) from public, anon;
grant execute on function public.save_progress(uuid, int, boolean) to authenticated;

-- One call for the student dashboard. Days are India time. "Active" = watched, answered, finished a lesson or passed a quiz.
create or replace function public.my_learning_stats() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_streak int := 0; v_best int := 0; v_run int := 0; v_prev date; v_d date;
  v_result jsonb; v_days date[];
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select coalesce(array_agg(distinct day order by day), '{}') into v_days from (
    select day from public.learning_days where student_id = v_uid and seconds > 0
    union all select (created_at at time zone 'Asia/Kolkata')::date from public.checkpoint_answers where student_id = v_uid
    union all select (completed_at at time zone 'Asia/Kolkata')::date from public.lesson_progress where student_id = v_uid and completed_at is not null
    union all select (created_at at time zone 'Asia/Kolkata')::date from public.quiz_attempts where student_id = v_uid and passed
  ) s;

  -- Current streak: counts back from today (or yesterday, so a streak isn't "lost" before today's lesson).
  v_d := case when v_today = any(v_days) then v_today else v_today - 1 end;
  while v_d = any(v_days) loop v_streak := v_streak + 1; v_d := v_d - 1; end loop;
  foreach v_d in array v_days loop
    v_run := case when v_prev = v_d - 1 then v_run + 1 else 1 end; v_best := greatest(v_best, v_run); v_prev := v_d;
  end loop;

  select jsonb_build_object(
    'xp', (select count(*) * 10 from public.checkpoint_answers where student_id = v_uid and correct)
          + coalesce((select sum(x) from (select max(q.xp) x from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
                       where a.student_id = v_uid and a.passed group by a.quiz_id) t), 0),
    'streak', v_streak,
    'best_streak', v_best,
    'minutes_total', coalesce((select sum(seconds_watched) from public.lesson_progress where student_id = v_uid), 0) / 60,
    'minutes_this_week', coalesce((select sum(seconds) from public.learning_days where student_id = v_uid and day > v_today - 7), 0) / 60,
    'minutes_last_week', coalesce((select sum(seconds) from public.learning_days where student_id = v_uid and day between v_today - 13 and v_today - 7), 0) / 60,
    'week', (select jsonb_agg(jsonb_build_object('day', g::date, 'minutes', coalesce(d.seconds, 0) / 60) order by g)
             from generate_series(v_today - 6, v_today, interval '1 day') g
             left join public.learning_days d on d.student_id = v_uid and d.day = g::date),
    'active_days', (select coalesce(jsonb_agg(d order by d), '[]') from unnest(v_days) d where d > v_today - 42),
    'lessons_done', (select count(*) from public.lesson_progress where student_id = v_uid and completed_at is not null),
    'quizzes_passed', (select count(distinct quiz_id) from public.quiz_attempts where student_id = v_uid and passed),
    'checks_answered', (select count(*) from public.checkpoint_answers where student_id = v_uid),
    'checks_correct', (select count(*) from public.checkpoint_answers where student_id = v_uid and correct)
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.my_learning_stats() from public, anon;
grant execute on function public.my_learning_stats() to authenticated;
