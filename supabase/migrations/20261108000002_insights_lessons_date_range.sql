-- Insights "Lesson drop-off" now follows the Studio date range: started = opened or watched in the range,
-- finished = completed in the range (a completion also updates updated_at, so finished <= started).
-- Only students count. Everything else in admin_insights is unchanged.
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
                left join (select lp.lesson_id, count(*) started, count(*) filter (where lp.completed_at >= v_from) finished
                           from public.lesson_progress lp join students s on s.id = lp.student_id
                           where lp.updated_at >= v_from group by lp.lesson_id) x on x.lesson_id = l.id),
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

revoke execute on function public.admin_insights(int) from public, anon;
grant execute on function public.admin_insights(int) to authenticated;
