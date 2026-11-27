-- WhatsApp course journey (Chirag 2026-11-27): time-based messages through the existing AiSensy queue.
--
-- automation_tick() runs at the start of every sender run (/api/automations/run, every 5 min, 9:00–20:59 IST).
-- It looks at who is due for which message and queues it with _automation_enqueue, which does nothing while a
-- rule is switched off and keeps one message per (rule, dedupe). Everything goes to the parent's WhatsApp
-- (profiles.guardian_phone). Test and duplicate accounts never get these messages.
--
--  key                when (IST)                                        only if
--  m0_welcome         ~5 min after sign-up                              no course access
--  m0_nudge_offer     24–72 h after sign-up, 10:00–20:00                still no access AND an active coupon ends in ≤ 10 days
--  enrolled_congrats  ~5 min after getting access                       -
--  course_overview    2 h after getting access                          -
--  module_open        when a module opens (batch Sunday 10:00)          -
--  module_reminder_1  same day 20:00                                    that module < 20 % watched
--  module_reminder_2  next day 19:00                                    still < 20 % watched
--  parent_progress    Saturday 18:00, while the course runs             enrolled (has access)
--  work_due           12:00 the day the next module opens (7 days on)   that module's quiz not passed or assignment not handed in
--  certificate_ready  once every module lesson is complete              no certificate yet
--  newsletter         a newsletter is uploaded in Studio → Content       enrolled (has access) — via trigger, not the tick
--
-- Reminders (m0_nudge_offer, module_reminder_*, parent_progress, work_due) are capped at 2 per number per IST day,
-- so a parent is never flooded. A missed window is not made up later (the window conditions below).

insert into public.automation_rules (key, title, description, position) values
 ('m0_welcome', 'Signed up: watch Module 0', 'Right after sign-up, not bought. {{1}} student first name, {{2}} Module 0 link, {{3}} pay link.', 10),
 ('m0_nudge_offer', 'Day 1: offer ending', '24 h after sign-up, still not bought, only while a coupon with an end date is active. {{1}} student first name, {{2}} offer price ₹, {{3}} coupon code, {{4}} offer end date, {{5}} pay link.', 11),
 ('enrolled_congrats', 'Enrolled: congratulations', 'Right after getting the course. {{1}} student first name, {{2}} course link.', 12),
 ('course_overview', 'Enrolled: course overview', '2 h after getting the course. {{1}} student first name, {{2}} first module date, {{3}} course link.', 13),
 ('module_open', 'Module opens (Sunday 10:00)', 'Each module, when it opens for the student''s batch. {{1}} student first name, {{2}} module number, {{3}} module title, {{4}} link.', 14),
 ('module_reminder_1', 'Module not watched: 8 pm', 'Same day 8 pm, module under 20 % watched. {{1}} student first name, {{2}} module number, {{3}} link.', 15),
 ('module_reminder_2', 'Module not watched: next day', 'Next day 7 pm, still under 20 % watched. {{1}} student first name, {{2}} module number, {{3}} link.', 16),
 ('parent_progress', 'Weekly report to parent', 'Saturday 6 pm while the course runs, enrolled only. {{1}} student first name, {{2}} modules finished (e.g. 2 of 5), {{3}} this week''s module % watched, {{4}} quizzes passed (e.g. 1 of 2), {{5}} progress link.', 17),
 ('work_due', 'Quiz / assignment pending', '12:00 the day the next module opens, if last week''s quiz isn''t passed or assignment isn''t handed in. {{1}} student first name, {{2}} module number, {{3}} what is pending (quiz / assignment / quiz and assignment), {{4}} link.', 18),
 ('certificate_ready', 'Course complete: certificate', 'Every module lesson finished. {{1}} student first name, {{2}} certificate link.', 19),
 ('newsletter', 'New monthly newsletter', 'A newsletter is uploaded in Studio → Content; enrolled students only. {{1}} student first name, {{2}} newsletter title, {{3}} link.', 20)
on conflict (key) do nothing;

create or replace function public._automation_enqueue(
  p_rule text, p_dedupe text, p_phone text, p_name text, p_params jsonb,
  p_lead uuid default null, p_student uuid default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.automation_phone(p_phone); r public.automation_rules; t public.wa_templates; w record; v_params jsonb := p_params;
begin
  select * into r from public.automation_rules where key = p_rule and enabled;
  if r.key is null then return 'off'; end if;
  if v_phone is null then return 'no_phone'; end if;
  select * into w from public.wa_person(p_lead, p_student);
  select * into t from public.wa_templates where key = r.template_key;
  -- A message's own placeholders win over the rule's params, but only if it has some: a journey message added in
  -- Studio with no placeholders keeps the rule's own values (names, dates and links from automation_tick).
  if t.key is not null and w.phone is not null and cardinality(t.params) > 0 then
    select coalesce(jsonb_agg(public.wa_fill(p, w.parent_name, w.student_name, w.school, w.grade, w.stage) order by i), '[]') into v_params from unnest(t.params) with ordinality u(p, i);
  end if;
  insert into public.message_queue (rule_key, template_key, dedupe, phone, name, params, lead_id, student_id, status, error, media_url, tags, attributes)
  values (p_rule, t.key, left(p_dedupe, 120), v_phone, left(coalesce(trim(p_name), ''), 80), coalesce(v_params, '[]'), p_lead, p_student,
          case when public.automation_dnc(v_phone) then 'skipped' else 'queued' end,
          case when public.automation_dnc(v_phone) then 'Do not contact' end,
          t.media_url, array_remove(array[nullif(w.school, ''), w.stage, 'lms'], null),
          coalesce(jsonb_strip_nulls(jsonb_build_object('student', nullif(w.student_name, ''), 'school', nullif(w.school, ''), 'grade', w.grade, 'stage', w.stage)), '{}'))
  on conflict do nothing;
  return case when found then 'queued' else 'duplicate' end;
end;
$$;

-- Real students for messaging: student role, not a test or duplicate account, with a parent WhatsApp.
create or replace function public.journey_students()
returns table (id uuid, first_name text, phone text, created_at timestamptz, granted_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'your child'), p.guardian_phone, p.created_at, ca.granted_at
  from public.profiles p
  left join public.course_access ca on ca.student_id = p.id and ca.course_id = 'ai-for-students'
  where p.role = 'student' and not p.is_test and p.duplicate_of is null and p.guardian_phone is not null
$$;

-- % of one module watched by one student (average over its lessons, 0 for lessons never started).
create or replace function public.journey_module_pct(p_student uuid, p_chapter uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(round(avg(coalesce(lp.watched_pct, 0)))::int, 0)
  from public.lessons l
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = p_student
  where l.chapter_id = p_chapter
$$;

-- Reminders sent or waiting for this number today (IST). Skipped messages don't count.
create or replace function public.journey_reminders_today(p_phone text) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.message_queue q
  where q.phone = public.automation_phone(p_phone)
    and q.rule_key in ('m0_nudge_offer', 'module_reminder_1', 'module_reminder_2', 'parent_progress', 'work_due')
    and q.status <> 'skipped'
    and (q.created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
$$;

create or replace function public.automation_tick() returns int
language plpgsql security definer set search_path = '' as $$
declare
  site constant text := 'https://learn.beyondtatva.in';
  now_ist timestamp := now() at time zone 'Asia/Kolkata';
  n int := 0;
  s record; m record; c record;
  v_pct int; v_quiz boolean; v_asg boolean; v_pending text;
  v_done int; v_total int; v_qpass int; v_qtotal int; v_first timestamptz;
begin
  -- 1. Signed up, not bought: Module 0 welcome (wait 3 min so a /pay buyer's purchase is claimed first).
  for s in select * from public.journey_students() j
           where j.granted_at is null and j.created_at between now() - interval '2 days' and now() - interval '3 minutes' loop
    if public._automation_enqueue('m0_welcome', 'm0w:' || s.id, s.phone, s.first_name,
         jsonb_build_array(s.first_name, site || '/course', site || '/pay'), null, s.id) = 'queued' then n := n + 1; end if;
  end loop;

  -- 2. Day 1, still not bought: offer ending — only with a real coupon end date (no fake urgency).
  select code, price_inr, valid_until into c from public.coupons
  where active and course_id = 'ai-for-students' and now() between valid_from and valid_until
    and valid_until < now() + interval '10 days'
  order by valid_until limit 1;
  if c.code is not null and extract(hour from now_ist) between 10 and 19 then
    for s in select * from public.journey_students() j
             where j.granted_at is null and j.created_at between now() - interval '72 hours' and now() - interval '24 hours' loop
      continue when public.journey_reminders_today(s.phone) >= 2;
      if public._automation_enqueue('m0_nudge_offer', 'm0n:' || s.id, s.phone, s.first_name,
           jsonb_build_array(s.first_name, c.price_inr::text, c.code, to_char(c.valid_until at time zone 'Asia/Kolkata', 'DD Mon'), site || '/pay'),
           null, s.id) = 'queued' then n := n + 1; end if;
    end loop;
  end if;

  -- 3. Enrolled: congratulations now, overview 2 h later (with the first module's date).
  for s in select * from public.journey_students() j where j.granted_at > now() - interval '2 days' loop
    if public._automation_enqueue('enrolled_congrats', 'congrats:' || s.id, s.phone, s.first_name,
         jsonb_build_array(s.first_name, site || '/course'), null, s.id) = 'queued' then n := n + 1; end if;
    if s.granted_at <= now() - interval '2 hours' then
      select min(public.chapter_release_for(ch.id, s.id)) into v_first
      from public.chapters ch where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5;
      if public._automation_enqueue('course_overview', 'overview:' || s.id, s.phone, s.first_name,
           jsonb_build_array(s.first_name,
             coalesce(case when v_first < now() + interval '1 year' then to_char(v_first at time zone 'Asia/Kolkata', 'Dy DD Mon, HH12:MI AM') end, 'soon'),
             site || '/course'), null, s.id) = 'queued' then n := n + 1; end if;
    end if;
  end loop;

  -- 4. Weekly modules: open, 8 pm reminder, next-day reminder, then quiz / assignment due a week later.
  for s in select * from public.journey_students() j where j.granted_at is not null loop
    for m in
      select ch.id, ch.position, ch.title, public.chapter_release_for(ch.id, s.id) as opens
      from public.chapters ch where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5
    loop
      continue when m.opens is null or m.opens > now() or m.opens < now() - interval '9 days';
      -- Opens: within a day of opening (a module that opened before they bought isn't announced again).
      if m.opens > now() - interval '1 day' and m.opens > s.granted_at - interval '1 hour' then
        if public._automation_enqueue('module_open', 'open:' || s.id || ':' || m.id, s.phone, s.first_name,
             jsonb_build_array(s.first_name, m.position::text, m.title, site || '/course'), null, s.id) = 'queued' then n := n + 1; end if;
      end if;
      v_pct := null;
      -- Same day 8 pm (opens 10:00 + 10 h), still that day.
      if now() between m.opens + interval '10 hours' and m.opens + interval '14 hours' then
        v_pct := public.journey_module_pct(s.id, m.id);
        if v_pct < 20 and public.journey_reminders_today(s.phone) < 2 then
          if public._automation_enqueue('module_reminder_1', 'rem1:' || s.id || ':' || m.id, s.phone, s.first_name,
               jsonb_build_array(s.first_name, m.position::text, site || '/course'), null, s.id) = 'queued' then n := n + 1; end if;
        end if;
      end if;
      -- Next day 7 pm (opens + 1 day 9 h).
      if now() between m.opens + interval '33 hours' and m.opens + interval '38 hours' then
        v_pct := coalesce(v_pct, public.journey_module_pct(s.id, m.id));
        if v_pct < 20 and public.journey_reminders_today(s.phone) < 2 then
          if public._automation_enqueue('module_reminder_2', 'rem2:' || s.id || ':' || m.id, s.phone, s.first_name,
               jsonb_build_array(s.first_name, m.position::text, site || '/course'), null, s.id) = 'queued' then n := n + 1; end if;
        end if;
      end if;
      -- A week later at 12:00 (the next module's Sunday): quiz not passed / assignment not handed in.
      if now() between m.opens + interval '7 days 2 hours' and m.opens + interval '7 days 8 hours' then
        v_quiz := exists (select 1 from public.quizzes q where q.chapter_id = m.id and q.published)
          and not exists (select 1 from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id
                          where q.chapter_id = m.id and a.student_id = s.id and a.passed);
        v_asg := exists (select 1 from public.assignments x where x.chapter_id = m.id and x.published)
          and not exists (select 1 from public.assignment_submissions b join public.assignments x on x.id = b.assignment_id
                          where x.chapter_id = m.id and b.student_id = s.id);
        v_pending := case when v_quiz and v_asg then 'quiz and assignment' when v_quiz then 'quiz' when v_asg then 'assignment' end;
        if v_pending is not null and public.journey_reminders_today(s.phone) < 2 then
          if public._automation_enqueue('work_due', 'due:' || s.id || ':' || m.id, s.phone, s.first_name,
               jsonb_build_array(s.first_name, m.position::text, v_pending, site || '/course'), null, s.id) = 'queued' then n := n + 1; end if;
        end if;
      end if;
    end loop;

    -- Saturday 18:00–20:59, while a module is open and the course isn't finished: weekly report to the parent.
    if extract(isodow from now_ist) = 6 and extract(hour from now_ist) between 18 and 20
       and public.journey_reminders_today(s.phone) < 2 then
      select count(*) filter (where public.chapter_release_for(ch.id, s.id) <= now()),
             count(*) filter (where public.chapter_release_for(ch.id, s.id) <= now() and public.journey_module_pct(s.id, ch.id) >= 90)
        into v_total, v_done
      from public.chapters ch where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5;
      if v_total > 0 and v_done < 5 then
        select count(distinct q.id) filter (where exists (select 1 from public.quiz_attempts a where a.quiz_id = q.id and a.student_id = s.id and a.passed)),
               count(distinct q.id)
          into v_qpass, v_qtotal
        from public.quizzes q join public.chapters ch on ch.id = q.chapter_id
        where q.published and ch.course_id = 'ai-for-students' and not ch.is_free and public.chapter_release_for(ch.id, s.id) <= now();
        select public.journey_module_pct(s.id, ch.id) into v_pct
        from public.chapters ch where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5
          and public.chapter_release_for(ch.id, s.id) <= now()
        order by public.chapter_release_for(ch.id, s.id) desc limit 1;
        if public._automation_enqueue('parent_progress', 'prog:' || s.id || ':' || to_char(now_ist, 'IYYY-IW'), s.phone, s.first_name,
             jsonb_build_array(s.first_name, v_done || ' of 5', coalesce(v_pct, 0) || '%', v_qpass || ' of ' || v_qtotal, site || '/progress'),
             null, s.id) = 'queued' then n := n + 1; end if;
      end if;
    end if;

    -- Every module lesson finished and no certificate yet: claim it.
    if not exists (select 1 from public.certificates ce where ce.student_id = s.id and ce.course_id = 'ai-for-students')
       and exists (select 1 from public.lessons l join public.chapters ch on ch.id = l.chapter_id
                   where ch.course_id = 'ai-for-students' and not ch.is_free)
       and not exists (select 1 from public.lessons l join public.chapters ch on ch.id = l.chapter_id
                       left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = s.id
                       where ch.course_id = 'ai-for-students' and not ch.is_free and lp.completed_at is null) then
      if public._automation_enqueue('certificate_ready', 'cert:' || s.id, s.phone, s.first_name,
           jsonb_build_array(s.first_name, site || '/certificates'), null, s.id) = 'queued' then n := n + 1; end if;
    end if;
  end loop;
  return n;
end;
$$;

-- Monthly newsletter: uploaded in Studio → Content → sent to every enrolled student's parent.
create or replace function public.automation_on_newsletter() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  begin
    for s in select * from public.journey_students() j where j.granted_at is not null loop
      perform public._automation_enqueue('newsletter', 'news:' || new.id || ':' || s.id, s.phone, s.first_name,
        jsonb_build_array(s.first_name, new.title, 'https://learn.beyondtatva.in/activities'), null, s.id);
    end loop;
  exception when others then
    raise warning 'automation_on_newsletter: %', sqlerrm;
  end;
  return new;
end;
$$;
create trigger automation_newsletter after insert on public.newsletters
  for each row execute function public.automation_on_newsletter();

revoke all on function public.journey_students(), public.journey_module_pct(uuid, uuid), public.journey_reminders_today(text),
  public.automation_tick(), public.automation_on_newsletter() from public, anon, authenticated;
grant execute on function public.automation_tick() to service_role;
