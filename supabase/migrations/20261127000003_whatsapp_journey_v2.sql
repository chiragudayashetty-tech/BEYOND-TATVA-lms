-- WhatsApp journey v2 (Chirag 2026-11-27): replaces the 20261127000002 rules (never applied live) with the
-- reviewed plan in docs/WHATSAPP-TEMPLATES.md. Student messages are English, parent messages Kannada.
--
-- Who gets what: every message exists twice where the plan has two versions: `_s` = student, `_p` = parent.
-- Student messages go to profiles.student_phone; with no student phone they go to the parent's WhatsApp.
-- If the parent's number is Do not contact, the student gets nothing either (minors).
-- Lead broadcasts (workshop evening / price / offer ends) and the monthly newsletter text stay manual broadcasts.
--
--  key (rule)              when (IST)                                         only if
--  j_welcome_s/_p          1 min after sign-up                                no course access
--  j_follow1_s/_p          sign-up day + 1, 18:00–20:59                       still no access (status line)
--  j_follow2_s/_p          sign-up day + 3, 18:00–20:59                       still no access
--  j_follow3_s/_p          sign-up day + 6, 18:00–20:59                       still no access, then nothing more
--  j_enrolled_s            1 min after getting access                         -
--  j_enrolled_p            1 min after getting access                         access came from a payment (receipt)
--  j_quest_s               access day + 1, 18:00–20:59                        -
--  j_module_open_s/_p      module opens (Sunday 10:00), within a day          previous module not completed
--  j_module_done_s/_p      instead of j_module_open_*                         previous module video+quiz+assignment done
--  j_nudge_tue_s           opens + 2 d 8 h (Tue 18:00), 3 h window            that module's video < 90 %
--  j_nudge_thu_s           opens + 4 d 8 h (Thu 18:00)                        video < 90 %
--  j_nudge_sat_s           opens + 6 d 8 h (Sat 18:00)                        video < 90 %
--  j_pending_tue_s         Tue 18:00                                          video ≥ 90 %, quiz or assignment pending
--  j_pending_thu_s         Thu 18:00                                          same
--  j_parent_digest_p       19:00–20:59 daily                                  the student finished something today (IST)
--  j_course_done_s/_p      once every module lesson is complete               -
--  j_review_s/_p           course done + 1 day, 18:00–20:59                   -
--  j_referral_s            course done + 3 days, 18:00–20:59                  -
--  j_newsletter_s/_p       newsletter uploaded in Studio → Content            enrolled (trigger)
--
-- Nudges (j_follow*, j_quest_s, j_nudge_*, j_pending_*, j_referral_s) are capped at 2 per number per IST day.

-- The superseded 20261127000002 rules (that migration never ran live; queue rows cascade).
delete from public.automation_rules where key in ('m0_welcome', 'm0_nudge_offer', 'enrolled_congrats', 'course_overview',
  'module_open', 'module_reminder_1', 'module_reminder_2', 'parent_progress', 'work_due', 'certificate_ready', 'newsletter');

insert into public.automation_rules (key, title, description, position) values
 ('j_welcome_s', 'Login welcome (student)', '1 min after sign-up, not enrolled. {{1}} first name.', 30),
 ('j_welcome_p', 'Login welcome (parent)', '1 min after sign-up, not enrolled. {{1}} child first name.', 31),
 ('j_follow1_s', 'Follow-up day 2 (student)', 'Day 2, 6 pm, not enrolled. {{1}} first name, {{2}} status line.', 32),
 ('j_follow1_p', 'Follow-up day 2 (parent)', 'Day 2, 6 pm, not enrolled. {{1}} child first name, {{2}} status line (Kannada).', 33),
 ('j_follow2_s', 'Follow-up day 4 (student)', 'Day 4, 6 pm, not enrolled. {{1}} first name, {{2}} status line.', 34),
 ('j_follow2_p', 'Follow-up day 4 (parent)', 'Day 4, 6 pm, not enrolled. {{1}} child first name.', 35),
 ('j_follow3_s', 'Last call day 7 (student)', 'Day 7, 6 pm, not enrolled. {{1}} first name.', 36),
 ('j_follow3_p', 'Last call day 7 (parent)', 'Day 7, 6 pm, not enrolled. {{1}} child first name.', 37),
 ('j_enrolled_s', 'Enrolled welcome (student)', '1 min after getting the course. {{1}} first name, {{2}} first module date.', 38),
 ('j_enrolled_p', 'Enrolled receipt (parent)', '1 min after paying. {{1}} child first name, {{2}} amount ₹, {{3}} receipt number.', 39),
 ('j_quest_s', 'Enrolled day 2 quest (student)', 'Next day 6 pm. {{1}} first name, {{2}} next step, {{3}} first module date.', 40),
 ('j_module_open_s', 'Module out (student)', 'Module opens. {{1}} first name, {{2}} module no., {{3}} title, {{4}} XP to earn, {{5}} rank.', 41),
 ('j_module_open_p', 'Module out (parent)', 'Module opens. {{1}} child first name, {{2}} module no., {{3}} title, {{4}} what they learn.', 42),
 ('j_module_done_s', 'Module complete + next out (student)', 'Instead of Module out when last module is fully done. {{1}} first name, {{2}} done module, {{3}} new module, {{4}} new title.', 43),
 ('j_module_done_p', 'Module complete + next out (parent)', 'Same, parent. {{1}} child first name, {{2}} done module, {{3}} new module.', 44),
 ('j_nudge_tue_s', 'Not watched: Tuesday', 'Tue 6 pm, video under 90 %. {{1}} first name, {{2}} module no.', 45),
 ('j_nudge_thu_s', 'Not watched: Thursday', 'Thu 6 pm, video under 90 %. {{1}} first name, {{2}} module no., {{3}} classmates who finished.', 46),
 ('j_nudge_sat_s', 'Not watched: Saturday last call', 'Sat 6 pm, video under 90 %. {{1}} first name, {{2}} module no.', 47),
 ('j_pending_tue_s', 'Quiz/assignment pending: Tuesday', 'Tue 6 pm, watched but work pending. {{1}} first name, {{2}} module no., {{3}} XP waiting, {{4}} what is left.', 48),
 ('j_pending_thu_s', 'Quiz/assignment pending: Thursday', 'Thu 6 pm, still pending. {{1}} first name, {{2}} module no., {{3}} what is left.', 49),
 ('j_parent_digest_p', 'Parent progress (7 pm)', 'Daily 7 pm when the child finished something today. {{1}} child first name, {{2}} module no., {{3}} video, {{4}} quiz, {{5}} assignment.', 50),
 ('j_course_done_s', 'Course complete (student)', 'All modules finished. {{1}} first name, {{2}} quizzes passed, {{3}} assignments, {{4}} XP, {{5}} rank.', 51),
 ('j_course_done_p', 'Course complete (parent)', 'All modules finished. {{1}} child first name, {{2}} quizzes passed, {{3}} assignments.', 52),
 ('j_review_s', 'Review form (student)', 'Day after finishing. {{1}} first name.', 53),
 ('j_review_p', 'Review form (parent)', 'Day after finishing. {{1}} child first name.', 54),
 ('j_referral_s', 'Referral after course (student)', '3 days after finishing. {{1}} first name, {{2}} invite code. Keep Off until referral XP exists.', 55),
 ('j_newsletter_s', 'Newsletter (student)', 'Newsletter uploaded; enrolled only. {{1}} first name, {{2}} title.', 56),
 ('j_newsletter_p', 'Newsletter (parent)', 'Newsletter uploaded; enrolled only. {{1}} child first name, {{2}} title.', 57)
on conflict (key) do nothing;

drop function if exists public.journey_students();
-- Real students: student role, not test/duplicate, with a parent WhatsApp. sphone = student's own number or the parent's.
create function public.journey_students()
returns table (id uuid, first_name text, phone text, sphone text, created_at timestamptz, granted_at timestamptz, source text)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(nullif(split_part(trim(p.full_name), ' ', 1), ''), 'your child'), p.guardian_phone,
         coalesce(public.normalize_phone(p.student_phone), p.guardian_phone), p.created_at, ca.granted_at, ca.source
  from public.profiles p
  left join public.course_access ca on ca.student_id = p.id and ca.course_id = 'ai-for-students'
  where p.role = 'student' and not p.is_test and p.duplicate_of is null and p.guardian_phone is not null
$$;

-- Nudges sent or waiting for this number today (IST). Skipped messages don't count.
create or replace function public.journey_reminders_today(p_phone text) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.message_queue q
  where q.phone = public.automation_phone(p_phone)
    and (q.rule_key like 'j\_follow%' or q.rule_key like 'j\_nudge%' or q.rule_key like 'j\_pending%'
         or q.rule_key in ('j_quest_s', 'j_referral_s'))
    and q.status <> 'skipped'
    and (q.created_at at time zone 'Asia/Kolkata')::date = (now() at time zone 'Asia/Kolkata')::date
$$;

-- Already queued? Checked before any expensive work (rank, XP) so a 1-minute tick stays cheap.
create function public.journey_has(p_rule text, p_dedupe text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.message_queue where rule_key = p_rule and dedupe = left(p_dedupe, 120))
$$;

-- Rule switched on? Checked before expensive params (rank, XP) so rules that are Off cost nothing.
create function public.journey_on(p_rule text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.automation_rules where key = p_rule and enabled)
$$;

-- One journey message for a student: student rules (_s) to sphone, parent rules to the parent; a parent on
-- Do not contact silences the student's messages too. Returns 1 when queued, else 0.
create function public.journey_send(p_rule text, p_dedupe text, s record, p_params jsonb, p_nudge boolean default false)
returns int language plpgsql security definer set search_path = '' as $$
declare v_to text := case when p_rule like '%\_s' then s.sphone else s.phone end;
begin
  if public.journey_has(p_rule, p_dedupe) then return 0; end if;
  if public.automation_dnc(public.automation_phone(s.phone)) and v_to <> s.phone then return 0; end if;
  if p_nudge and public.journey_reminders_today(v_to) >= 2 then return 0; end if;
  return case when public._automation_enqueue(p_rule, p_dedupe, v_to, s.first_name, p_params, null, s.id) = 'queued' then 1 else 0 end;
end;
$$;

-- Module 0 status for the not-enrolled follow-ups: 'none' | 'part' | 'watched' (no quiz/PDF yet) | 'done'.
create function public.journey_m0_status(p_student uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare v_ch uuid; v_pct int; v_quiz boolean; v_pdf boolean;
begin
  select id into v_ch from public.chapters where course_id = 'ai-for-students' and is_free order by position limit 1;
  if v_ch is null then return 'none'; end if;
  v_pct := public.journey_module_pct(p_student, v_ch);
  if v_pct < 5 then return 'none'; end if;
  if v_pct < 90 then return 'part'; end if;
  v_quiz := not exists (select 1 from public.quizzes q where q.chapter_id = v_ch and q.published)
    or exists (select 1 from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id where q.chapter_id = v_ch and a.student_id = p_student);
  v_pdf := not exists (select 1 from public.module_resources r where r.chapter_id = v_ch)
    or exists (select 1 from public.resource_views v join public.module_resources r on r.id = v.resource_id where r.chapter_id = v_ch and v.student_id = p_student);
  return case when v_quiz and v_pdf then 'done' else 'watched' end;
end;
$$;

-- What is left in one module: video % plus quiz passed / assignment handed in (true when the module has none).
create function public.journey_module_state(p_student uuid, p_chapter uuid,
  out pct int, out quiz_ok boolean, out asg_ok boolean, out xp_left int)
language plpgsql stable security definer set search_path = '' as $$
begin
  pct := public.journey_module_pct(p_student, p_chapter);
  quiz_ok := not exists (select 1 from public.quizzes q where q.chapter_id = p_chapter and q.published)
    or exists (select 1 from public.quiz_attempts a join public.quizzes q on q.id = a.quiz_id where q.chapter_id = p_chapter and a.student_id = p_student and a.passed);
  asg_ok := not exists (select 1 from public.assignments x where x.chapter_id = p_chapter and x.published)
    or exists (select 1 from public.assignment_submissions b join public.assignments x on x.id = b.assignment_id where x.chapter_id = p_chapter and b.student_id = p_student);
  xp_left := (case when quiz_ok then 0 else 10 * coalesce((select count(*) from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id where q.chapter_id = p_chapter), 0) end)
           + (case when asg_ok then 0 else 50 end);
end;
$$;

-- Leaderboard rank among real enrolled students (1 = top).
create function public.journey_rank(p_student uuid) returns int
language sql stable security definer set search_path = '' as $$
  with xp as (select j.id, (public.student_xp(j.id) ->> 'total')::int as t from public.journey_students() j where j.granted_at is not null)
  select 1 + count(*)::int from xp where t > coalesce((select t from xp where id = p_student), 0)
$$;

create or replace function public.automation_tick() returns int
language plpgsql security definer set search_path = '' as $$
declare
  now_ist timestamp := now() at time zone 'Asia/Kolkata';
  today date := (now() at time zone 'Asia/Kolkata')::date;
  evening boolean := extract(hour from now() at time zone 'Asia/Kolkata') between 18 and 20;
  n int := 0;
  s record; m record; prev record; st record; pr record;
  v_day int; v_status text; v_first timestamptz; v_first_txt text; v_pending text; v_done_at timestamptz;
  v_mods int; v_left int;
begin
  for s in select * from public.journey_students() loop
    if s.granted_at is null then
      -- Not enrolled: welcome after 1 minute, follow-ups on day 2, 4 and 7 (6–9 pm), then nothing.
      if s.created_at between now() - interval '2 days' and now() - interval '1 minute' then
        n := n + public.journey_send('j_welcome_s', 'w:' || s.id, s, jsonb_build_array(s.first_name));
        n := n + public.journey_send('j_welcome_p', 'w:' || s.id, s, jsonb_build_array(s.first_name));
      end if;
      v_day := today - (s.created_at at time zone 'Asia/Kolkata')::date;
      if evening and v_day in (1, 3, 6) then
        v_status := public.journey_m0_status(s.id);
        if v_day = 1 then
          n := n + public.journey_send('j_follow1_s', 'f1:' || s.id, s, jsonb_build_array(s.first_name, case v_status
            when 'none' then 'Module 0 is waiting. 30 minutes. That''s it.'
            when 'part' then 'You''re halfway in. Don''t leave the story half way!'
            when 'watched' then 'Video done. Quiz and PDF still locked: XP waiting.'
            else 'Module 0 complete. That was 1% of the course.' end), true);
          n := n + public.journey_send('j_follow1_p', 'f1:' || s.id, s, jsonb_build_array(s.first_name, case v_status
            when 'none' then 'Module 0 ಇನ್ನೂ ನೋಡಿಲ್ಲ'
            when 'part' then 'Module 0 ಅರ್ಧ ನೋಡಿದ್ದಾರೆ'
            when 'watched' then 'ವೀಡಿಯೊ ನೋಡಿದ್ದಾರೆ, ಕ್ವಿಜ್ ಬಾಕಿ'
            else 'Module 0 ಪೂರ್ಣ' end), true);
        elsif v_day = 3 then
          n := n + public.journey_send('j_follow2_s', 'f2:' || s.id, s, jsonb_build_array(s.first_name, case v_status
            when 'none' then 'Start Module 0 today and earn your first 100 XP.'
            when 'part' then 'Finish Module 0 and earn 100 XP.'
            when 'watched' then 'Take the Module 0 quiz for extra XP.'
            else 'Unlock the full course and keep going.' end), true);
          n := n + public.journey_send('j_follow2_p', 'f2:' || s.id, s, jsonb_build_array(s.first_name), true);
        else
          n := n + public.journey_send('j_follow3_s', 'f3:' || s.id, s, jsonb_build_array(s.first_name), true);
          n := n + public.journey_send('j_follow3_p', 'f3:' || s.id, s, jsonb_build_array(s.first_name), true);
        end if;
      end if;
      continue;
    end if;

    -- Enrolled: welcome + receipt after 1 minute, a quest the next evening.
    if s.granted_at > now() - interval '3 days' then
      select min(public.chapter_release_for(ch.id, s.id)) into v_first
      from public.chapters ch where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5;
      v_first_txt := coalesce(case when v_first > now() and v_first < now() + interval '1 year'
        then to_char(v_first at time zone 'Asia/Kolkata', 'Dy DD Mon') end, 'now');
      if s.granted_at <= now() - interval '1 minute' then
        n := n + public.journey_send('j_enrolled_s', 'e:' || s.id, s, jsonb_build_array(s.first_name, v_first_txt));
        if s.source = 'payment' and not public.journey_has('j_enrolled_p', 'e:' || s.id) then
          select round(coalesce(p.amount_paise, 0) / 100.0)::int as amt, p.reference into pr
          from public.purchases p where p.claimed_by = s.id and p.course_id = 'ai-for-students' and p.status = 'claimed'
          order by p.claimed_at desc nulls last limit 1;
          if pr.reference is not null then
            n := n + public.journey_send('j_enrolled_p', 'e:' || s.id, s, jsonb_build_array(s.first_name, pr.amt::text, pr.reference));
          end if;
        end if;
      end if;
      if evening and today = (s.granted_at at time zone 'Asia/Kolkata')::date + 1 then
        v_status := public.journey_m0_status(s.id);
        n := n + public.journey_send('j_quest_s', 'q:' || s.id, s, jsonb_build_array(s.first_name, case v_status
          when 'done' then 'you finished Module 0, so you''re ready.'
          when 'watched' then 'take the Module 0 quiz for extra XP.'
          else 'finish Module 0 and grab your first 100 XP.' end, v_first_txt), true);
      end if;
    end if;

    -- Weekly modules.
    for m in
      select ch.id, ch.position, ch.title, coalesce(nullif(trim(ch.blurb), ''), ch.title) as blurb,
             public.chapter_release_for(ch.id, s.id) as opens
      from public.chapters ch where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5
    loop
      continue when m.opens is null or m.opens > now() or m.opens < now() - interval '8 days';
      -- Opens (within a day; not for a module that opened before they enrolled).
      if m.opens > now() - interval '1 day' and m.opens > s.granted_at - interval '1 hour'
         and not public.journey_has('j_module_open_s', 'o:' || s.id || ':' || m.id)
         and not public.journey_has('j_module_done_s', 'o:' || s.id || ':' || m.id) then
        select ch.id, ch.position into prev from public.chapters ch
        where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position = m.position - 1;
        st := null;
        if prev.id is not null then select * into st from public.journey_module_state(s.id, prev.id); end if;
        if prev.id is not null and st.pct >= 90 and st.quiz_ok and st.asg_ok then
          n := n + public.journey_send('j_module_done_s', 'o:' || s.id || ':' || m.id, s,
            jsonb_build_array(s.first_name, prev.position::text, m.position::text, m.title));
          n := n + public.journey_send('j_module_done_p', 'o:' || s.id || ':' || m.id, s,
            jsonb_build_array(s.first_name, prev.position::text, m.position::text));
        elsif public.journey_on('j_module_open_s') or public.journey_on('j_module_open_p') then
          select * into st from public.journey_module_state(s.id, m.id);
          n := n + public.journey_send('j_module_open_s', 'o:' || s.id || ':' || m.id, s,
            jsonb_build_array(s.first_name, m.position::text, m.title, (100 + st.xp_left)::text, public.journey_rank(s.id)::text));
          n := n + public.journey_send('j_module_open_p', 'o:' || s.id || ':' || m.id, s,
            jsonb_build_array(s.first_name, m.position::text, m.title, m.blurb));
        end if;
      end if;
      -- Tue / Thu / Sat 18:00 (+2 d 8 h, +4 d 8 h, +6 d 8 h), 3-hour windows.
      v_day := case when now() between m.opens + interval '2 days 8 hours' and m.opens + interval '2 days 11 hours' then 2
                    when now() between m.opens + interval '4 days 8 hours' and m.opens + interval '4 days 11 hours' then 4
                    when now() between m.opens + interval '6 days 8 hours' and m.opens + interval '6 days 11 hours' then 6 end;
      if v_day is not null and not public.journey_has(case v_day when 2 then 'j_nudge_tue_s' when 4 then 'j_nudge_thu_s' else 'j_nudge_sat_s' end, 'n:' || s.id || ':' || m.id)
         and not (v_day < 6 and public.journey_has(case v_day when 2 then 'j_pending_tue_s' else 'j_pending_thu_s' end, 'p:' || s.id || ':' || m.id)) then
        select * into st from public.journey_module_state(s.id, m.id);
        if st.pct < 90 then
          if v_day = 2 then
            n := n + public.journey_send('j_nudge_tue_s', 'n:' || s.id || ':' || m.id, s, jsonb_build_array(s.first_name, m.position::text), true);
          elsif v_day = 4 then
            select count(*)::int into v_mods from public.journey_students() j
            where j.granted_at is not null and j.id <> s.id and public.journey_module_pct(j.id, m.id) >= 90;
            n := n + public.journey_send('j_nudge_thu_s', 'n:' || s.id || ':' || m.id, s, jsonb_build_array(s.first_name, m.position::text, v_mods::text), true);
          else
            n := n + public.journey_send('j_nudge_sat_s', 'n:' || s.id || ':' || m.id, s, jsonb_build_array(s.first_name, m.position::text), true);
          end if;
        elsif v_day < 6 and not (st.quiz_ok and st.asg_ok) then
          v_pending := case when not st.quiz_ok and not st.asg_ok then 'the quiz and the assignment'
                            when not st.quiz_ok then 'the quiz' else 'the assignment' end;
          if v_day = 2 then
            n := n + public.journey_send('j_pending_tue_s', 'p:' || s.id || ':' || m.id, s,
              jsonb_build_array(s.first_name, m.position::text, st.xp_left::text, v_pending), true);
          else
            n := n + public.journey_send('j_pending_thu_s', 'p:' || s.id || ':' || m.id, s,
              jsonb_build_array(s.first_name, m.position::text, v_pending), true);
          end if;
        end if;
      end if;
    end loop;

    -- Parent digest, 19:00–20:59: only on a day the child finished a lesson, passed a quiz or handed in work.
    if extract(hour from now_ist) between 19 and 20 and not public.journey_has('j_parent_digest_p', 'd:' || s.id || ':' || today) then
      select ch.id, ch.position into prev from public.chapters ch
      where ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5
        and public.chapter_release_for(ch.id, s.id) <= now()
      order by public.chapter_release_for(ch.id, s.id) desc limit 1;
      if prev.id is not null and (
           exists (select 1 from public.lesson_progress lp where lp.student_id = s.id and (lp.completed_at at time zone 'Asia/Kolkata')::date = today)
        or exists (select 1 from public.quiz_attempts a where a.student_id = s.id and a.passed and (a.created_at at time zone 'Asia/Kolkata')::date = today)
        or exists (select 1 from public.assignment_submissions b where b.student_id = s.id and (b.submitted_at at time zone 'Asia/Kolkata')::date = today)) then
        select * into st from public.journey_module_state(s.id, prev.id);
        n := n + public.journey_send('j_parent_digest_p', 'd:' || s.id || ':' || today, s, jsonb_build_array(s.first_name, prev.position::text,
          case when st.pct >= 90 then 'ಪೂರ್ಣ ✅' else st.pct || '% ⏳' end,
          case when st.quiz_ok then 'ಪೂರ್ಣ ✅' else 'ಬಾಕಿ ⏳' end,
          case when st.asg_ok then 'ಪೂರ್ಣ ✅' else 'ಬಾಕಿ ⏳' end));
      end if;
    end if;

    -- Course end: every module lesson finished → achievement; review the next evening; referral 3 days later.
    select q.created_at into v_done_at from public.message_queue q
    where q.rule_key = 'j_course_done_s' and q.dedupe = 'c:' || s.id;
    if v_done_at is null then
      if public.journey_on('j_course_done_s') and exists (select 1 from public.lessons l join public.chapters ch on ch.id = l.chapter_id
                 where ch.course_id = 'ai-for-students' and not ch.is_free)
         and not exists (select 1 from public.lessons l join public.chapters ch on ch.id = l.chapter_id
                         left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = s.id
                         where ch.course_id = 'ai-for-students' and not ch.is_free and lp.completed_at is null) then
        select count(distinct a.quiz_id)::int into v_mods from public.quiz_attempts a where a.student_id = s.id and a.passed;
        select count(*)::int into v_left from public.assignment_submissions b where b.student_id = s.id;
        n := n + public.journey_send('j_course_done_s', 'c:' || s.id, s, jsonb_build_array(s.first_name, v_mods::text, v_left::text,
          (public.student_xp(s.id) ->> 'total'), public.journey_rank(s.id)::text));
        n := n + public.journey_send('j_course_done_p', 'c:' || s.id, s, jsonb_build_array(s.first_name, v_mods::text, v_left::text));
      end if;
    elsif evening then
      if today = (v_done_at at time zone 'Asia/Kolkata')::date + 1 then
        n := n + public.journey_send('j_review_s', 'r:' || s.id, s, jsonb_build_array(s.first_name));
        n := n + public.journey_send('j_review_p', 'r:' || s.id, s, jsonb_build_array(s.first_name));
      elsif today = (v_done_at at time zone 'Asia/Kolkata')::date + 3 then
        n := n + public.journey_send('j_referral_s', 'ref:' || s.id, s,
          jsonb_build_array(s.first_name, 'BT' || upper(left(replace(s.id::text, '-', ''), 6))), true);
      end if;
    end if;
  end loop;
  return n;
end;
$$;

-- Monthly newsletter: uploaded in Studio → Content → every enrolled student and parent.
create or replace function public.automation_on_newsletter() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  begin
    for s in select * from public.journey_students() j where j.granted_at is not null loop
      perform public.journey_send('j_newsletter_s', 'news:' || new.id || ':' || s.id, s, jsonb_build_array(s.first_name, new.title));
      perform public.journey_send('j_newsletter_p', 'news:' || new.id || ':' || s.id, s, jsonb_build_array(s.first_name, new.title));
    end loop;
  exception when others then
    raise warning 'automation_on_newsletter: %', sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.journey_students(), public.journey_reminders_today(text), public.journey_has(text, text),
  public.journey_send(text, text, record, jsonb, boolean), public.journey_m0_status(uuid), public.journey_module_state(uuid, uuid),
  public.journey_rank(uuid), public.journey_on(text), public.automation_tick(), public.automation_on_newsletter() from public, anon, authenticated;
grant execute on function public.automation_tick() to service_role;
