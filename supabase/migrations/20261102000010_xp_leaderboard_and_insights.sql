-- 1. XP from all three sources: in-video quick checks (10 each), passed quizzes (quiz XP once each),
--    graded assignments (up to 50 each, by marks). One function so dashboard and leaderboard always agree.
-- 2. XP leaderboard for students: first name + last initial only, no photos, opt-out.
-- 3. admin_insights(): owner analytics Studio didn't have yet.

create or replace function public.student_xp(p_student uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'checks', c.x, 'quizzes', q.x, 'assignments', a.x, 'total', c.x + q.x + a.x)
  from (select count(*)::int * 10 as x from public.checkpoint_answers where student_id = p_student and correct) c,
       (select coalesce(sum(x), 0)::int as x from (select max(qz.xp) as x from public.quiz_attempts t join public.quizzes qz on qz.id = t.quiz_id
          where t.student_id = p_student and t.passed group by t.quiz_id) s) q,
       (select coalesce(sum(round(50.0 * least(greatest(s.marks, 0), a.max_marks) / a.max_marks)), 0)::int as x
          from public.assignment_submissions s join public.assignments a on a.id = s.assignment_id
          where s.student_id = p_student and s.status = 'graded' and s.marks is not null) a;
$$;
revoke execute on function public.student_xp(uuid) from public, anon, authenticated;  -- internal helper only

alter table public.profiles add column leaderboard_hidden boolean not null default false;

create or replace function public.set_leaderboard_hidden(p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;
  update public.profiles set leaderboard_hidden = coalesce(p_hidden, false) where id = (select auth.uid()) and role = 'student';
end;
$$;

-- Top 10 by XP (ties: who got there first is not tracked, so ties share a rank) + the viewer's own rank.
-- Shows "Asha R." only. Hidden students are left out of the list but still see their own rank.
create or replace function public.xp_leaderboard() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_result jsonb;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  with xp as (
    select p.id, p.leaderboard_hidden as hidden,
           initcap(split_part(trim(p.full_name), ' ', 1))
             || coalesce(' ' || upper(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1)) || '.', '') as name,
           (public.student_xp(p.id) ->> 'total')::int as xp
    from public.profiles p where p.role = 'student'
  ), ranked as (
    select *, rank() over (order by xp desc) as rnk from xp where xp > 0 and (not hidden or id = v_uid)
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rnk, 'name', name, 'xp', xp, 'me', id = v_uid) order by rnk, name)
                     from (select * from ranked where not hidden order by rnk, name limit 10) t), '[]'),
    'me', (select jsonb_build_object('rank', rnk, 'xp', xp, 'hidden', hidden) from ranked where id = v_uid),
    'players', (select count(*) from ranked where not hidden)
  ) into v_result;
  return v_result;
end;
$$;

-- Student dashboard stats now use the shared XP (with a breakdown).
create or replace function public.my_learning_stats() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_xp jsonb;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  v_xp := public.student_xp(v_uid);
  return jsonb_build_object(
    'xp', (v_xp ->> 'total')::int, 'xp_breakdown', v_xp,
    'minutes_total', coalesce((select sum(seconds_watched) from public.lesson_progress where student_id = v_uid), 0) / 60,
    'lessons_done', (select count(*) from public.lesson_progress where student_id = v_uid and completed_at is not null),
    'quizzes_passed', (select count(distinct quiz_id) from public.quiz_attempts where student_id = v_uid and passed),
    'assignments_graded', (select count(*) from public.assignment_submissions where student_id = v_uid and status = 'graded'),
    'checks_answered', (select count(*) from public.checkpoint_answers where student_id = v_uid),
    'checks_correct', (select count(*) from public.checkpoint_answers where student_id = v_uid and correct));
end;
$$;

-- Owner analytics (admins only). p_days = the Studio date range.
create or replace function public.admin_insights(p_days int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_from timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 3650));
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  with
  students as (select id, guardian_phone, signup_source, school_id, created_at from public.profiles where role = 'student'),
  last_seen as (
    select student_id, max(day) as day from (
      select student_id, day from public.learning_days where seconds > 0
      union all select student_id, (created_at at time zone 'Asia/Kolkata')::date from public.checkpoint_answers
      union all select student_id, (created_at at time zone 'Asia/Kolkata')::date from public.quiz_attempts
      union all select student_id, (updated_at at time zone 'Asia/Kolkata')::date from public.assignment_submissions
    ) a group by student_id),
  paid as (select student_id, source from public.course_access)
  select jsonb_build_object(
    'engagement', jsonb_build_object(
      'students', (select count(*) from students),
      'active_7d', (select count(*) from last_seen where day > v_today - 7),
      'active_30d', (select count(*) from last_seen where day > v_today - 30),
      'minutes_per_active_7d', coalesce((select round(sum(seconds) / 60.0 / nullif(count(distinct student_id), 0)) from public.learning_days where day > v_today - 7 and seconds > 0), 0),
      'stopped_paid', (select count(*) from paid p join last_seen l using (student_id) where l.day <= v_today - 14),
      'never_started_paid', (select count(*) from paid p where not exists (select 1 from last_seen l where l.student_id = p.student_id))),
    'lessons', (select coalesce(jsonb_agg(jsonb_build_object('module', c.position, 'lesson', l.title, 'started', coalesce(x.started, 0), 'finished', coalesce(x.finished, 0))
                  order by c.position, l.position), '[]')
                from public.lessons l join public.chapters c on c.id = l.chapter_id
                left join (select lesson_id, count(*) started, count(completed_at) finished from public.lesson_progress group by lesson_id) x on x.lesson_id = l.id),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', src, 'signups', n, 'paid', paid) order by n desc), '[]') from (
                  select coalesce(s.signup_source, 'direct') src, count(*) n, count(p.student_id) filter (where p.source = 'payment') paid
                  from students s left join paid p on p.student_id = s.id where s.created_at >= v_from group by 1) t),
    'refunds', jsonb_build_object(
      'count', (select count(*) from public.purchases where status = 'revoked' and created_at >= v_from),
      'paise', coalesce((select sum(amount_paise) from public.purchases where status = 'revoked' and created_at >= v_from), 0)),
    'schools', (select coalesce(jsonb_agg(jsonb_build_object('school', sc.name, 'keys', k.issued, 'used', k.used, 'students', st.n) order by k.issued desc nulls last), '[]')
                from public.schools sc
                left join (select school_id, count(*) issued, count(redeemed_by) used from public.access_keys group by school_id) k on k.school_id = sc.id
                left join (select school_id, count(*) n from students group by school_id) st on st.school_id = sc.id
                where k.issued is not null or st.n is not null),
    'workshops', (select coalesce(jsonb_agg(jsonb_build_object('title', w.title, 'starts_at', w.starts_at, 'seats', w.seats,
                    'registered', r.n, 'attended', r.att, 'signed_up', r.signed, 'paid', r.paid) order by w.starts_at desc), '[]')
                from public.workshops w
                join lateral (select count(*) n, count(attended_at) att,
                    count(*) filter (where exists (select 1 from students s where s.guardian_phone = wr.parent_phone)) signed,
                    count(*) filter (where exists (select 1 from students s join paid p on p.student_id = s.id where s.guardian_phone = wr.parent_phone)) paid
                  from public.workshop_registrations wr where wr.workshop_id = w.id) r on true)
  ) into v_result;
  return v_result;
end;
$$;

revoke execute on function public.set_leaderboard_hidden(boolean), public.xp_leaderboard(), public.my_learning_stats(), public.admin_insights(int) from public, anon;
grant execute on function public.set_leaderboard_hidden(boolean), public.xp_leaderboard(), public.my_learning_stats(), public.admin_insights(int) to authenticated;
