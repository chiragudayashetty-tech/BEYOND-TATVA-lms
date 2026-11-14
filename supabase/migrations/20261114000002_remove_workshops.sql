-- Remove the workshop registration system (Chirag, 2026-11-14). Public signup was already closed on 2026-11-09
-- (20261109000003); this drops the tables, functions and Studio insight that were left.
-- KEPT on purpose: school outreach statuses "Workshop booked" / "Workshop done" (school sales pipeline), and
-- leads whose source is 'workshop' (history; they stay in the Pipeline like any other lead).
-- Deletes every workshop registration row (child + parent names and phones). Their leads are not deleted.

-- Studio insights without the workshops block.
create or replace function public.admin_insights(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
                where k.issued is not null or st.n is not null)
  ) into v_result;
  return v_result;
end;
$function$;

-- Duplicate merge no longer moves workshop registrations.
create or replace function public.sheet_merge_duplicates(p_course text DEFAULT 'ai-for-students'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare k public.leads; d public.leads; n int := 0;
begin
  loop
    select l.* into d from public.leads l
    where l.course_id = p_course and exists (
      select 1 from public.leads o
      where o.course_id = l.course_id and o.phone = l.phone and o.id <> l.id
        and (o.created_at, o.id) < (l.created_at, l.id)
        and (lower(coalesce(o.student_name, '')) = lower(coalesce(l.student_name, '')) or o.student_name is null or l.student_name is null))
    order by l.created_at limit 1;
    exit when d.id is null;
    select o.* into k from public.leads o
    where o.course_id = d.course_id and o.phone = d.phone and o.id <> d.id and (o.created_at, o.id) < (d.created_at, d.id)
      and (lower(coalesce(o.student_name, '')) = lower(coalesce(d.student_name, '')) or o.student_name is null or d.student_name is null)
    order by o.created_at limit 1;
    update public.crm_notes set lead_id = k.id where lead_id = d.id;
    update public.leads set
      student_name = coalesce(k.student_name, d.student_name),
      parent_name = coalesce(k.parent_name, d.parent_name),
      grade = coalesce(k.grade, d.grade),
      school_name = coalesce(k.school_name, d.school_name),
      status = coalesce(k.status, d.status),
      next_step = coalesce(k.next_step, d.next_step),
      next_date = coalesce(k.next_date, d.next_date),
      student_id = coalesce(k.student_id, d.student_id),
      do_not_contact = k.do_not_contact or d.do_not_contact,
      details = d.details || k.details,
      sheet = d.sheet || k.sheet,
      -- A school tab is more specific than Website/Manual: keep the lead there.
      tab = case when public.lead_tab(k.tab, k.source, k.school_name) in ('Website', 'Manual')
                  and public.lead_tab(d.tab, d.source, d.school_name) not in ('Website', 'Manual')
                 then public.lead_tab(d.tab, d.source, d.school_name) else k.tab end
    where id = k.id;
    delete from public.leads where id = d.id;
    n := n + 1;
    d := null;
  end loop;
  return n;
end;
$function$;

drop function if exists public.admin_register_leads(uuid, uuid[], boolean);
drop function if exists public.register_workshop(text, text, int, text, text, boolean);
drop function if exists public.get_workshop(text);
drop table if exists public.workshop_registrations;
drop table if exists public.workshops;
