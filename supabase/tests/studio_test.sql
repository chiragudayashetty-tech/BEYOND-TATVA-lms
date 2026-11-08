-- Behaviour tests for onboarding, Studio admins, website enrollments, quizzes and assignments.
-- Every line starting with a test id must end in "| t"; NOTICE lines report expected refusals.
\set ON_ERROR_STOP 1

-- Users. 33 = admin by allowlist; 11, 44 = students; 66, 77 = siblings sharing a parent phone.
insert into auth.users (id, email, phone, raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111', 'solo@x.in', null, '{}'),
 ('22222222-2222-2222-2222-222222222222', 'dup@x.in', null, '{}'),
 ('33333333-3333-3333-3333-333333333333', 'Chirag@X.in', null, '{"full_name":"Chirag Shetty"}'),
 ('44444444-4444-4444-4444-444444444444', 'school@x.in', null, '{}'),
 ('55555555-5555-5555-5555-555555555555', 'bad@x.in', null, '{}'),
 ('66666666-6666-6666-6666-666666666666', 'sib1@x.in', null, '{}'),
 ('77777777-7777-7777-7777-777777777777', 'sib2@x.in', null, '{}'),
 ('88888888-8888-8888-8888-888888888888', null, '919900011223', '{}'),
 ('99999999-9999-9999-9999-999999999999', 'intruder@x.in', null, '{}');
insert into public.schools (name, code, teacher_code) values ('St Test', 'TEST-ABC', 'TEST-T-XYZ');
insert into public.studio_admins (entry) values ('chirag@x.in'), ('@team.in');
insert into auth.users (id, email, email_confirmed_at) values
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'intern@Team.in', now()),
 ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'fake@team.in', null),
 ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'someone@notteam.in', now());

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;
create function pg_temp.chapter(pos int) returns uuid language sql as $$ select id from public.chapters where course_id = 'ai-for-students' and position = pos $$;

-- ── Studio admin ─────────────────────────────────────────────────────────────
set role authenticated;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'S1a listed email claims admin' t, public.claim_studio_admin() as pass;
select 'S1b and is admin' t, public.is_admin() as pass;
select 'S2 second claim is a no-op' t, public.claim_studio_admin() = false as pass;
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
select 'S3 other emails do not' t, public.claim_studio_admin() = false and not public.is_admin() as pass;
do $$ begin perform 1 from public.studio_admins; raise exception 'S4 FAIL'; exception when insufficient_privilege then raise notice 'S4 pass: allowlist unreadable'; end $$;
do $$ begin insert into public.studio_admins (entry) values ('intruder@x.in'); raise exception 'S5 FAIL'; exception when insufficient_privilege then raise notice 'S5 pass: allowlist unwritable'; end $$;
select pg_temp.as_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select 'S7a any email on a listed domain' t, public.claim_studio_admin() as pass;
select 'S7b is admin' t, public.is_admin() as pass;
select pg_temp.as_user('cccccccc-cccc-cccc-cccc-cccccccccccc');
select 'S8 unverified email on the domain is refused' t, public.claim_studio_admin() = false as pass;
select pg_temp.as_user('dddddddd-dddd-dddd-dddd-dddddddddddd');
select 'S9 look-alike domain is refused' t, public.claim_studio_admin() = false as pass;
reset role;
delete from public.studio_admins where entry = '@team.in';
set role authenticated; select pg_temp.as_user('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select 'S10 removed from the list = Studio gone at once' t, not public.is_admin() as pass;
select 'S11 and cannot read admin data' t, (select count(*) from public.purchases) = 0 and public.admin_stats() is null as pass;
reset role;
do $$ begin insert into public.studio_admins (entry) values ('not-an-email'); raise exception 'S12 FAIL'; exception when check_violation then raise notice 'S12 pass: list rejects malformed entries'; end $$;
set role authenticated; select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
do $$ begin perform public.complete_onboarding('admin', 'Me'); raise exception 'S6 FAIL'; exception when others then if sqlerrm like 'S6%' then raise; end if; raise notice 'S6 pass: %', sqlerrm; end $$;

-- ── Onboarding (individual students) ─────────────────────────────────────────
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.complete_onboarding('student', 'Solo Student', null, 9::smallint, 'Mom', '098450 12345', 'Udupi Public School', p_consent => true);
select 'T1 phone normalised' t, guardian_phone = '+919845012345' and school_id is null and school_name = 'Udupi Public School' as pass from public.profiles where id = auth.uid();
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select public.complete_onboarding('student', 'School Kid', 'test-abc', 8::smallint, 'Dad', '+91 99000 11224', p_consent => true);
select 'T2 school code' t, school_id is not null as pass from public.profiles where id = auth.uid();
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
do $$ begin perform public.complete_onboarding('student', 'X', 'NOPE', 8::smallint, 'D', '9900011223', p_consent => true); raise exception 'T3a FAIL';
exception when others then if sqlerrm like 'T3a%' then raise; end if; raise notice 'T3a pass: %', sqlerrm; end $$;
do $$ begin perform public.complete_onboarding('student', 'X', null, 8::smallint, 'D', '12345', p_consent => true); raise exception 'T3b FAIL';
exception when others then if sqlerrm like 'T3b%' then raise; end if; raise notice 'T3b pass: %', sqlerrm; end $$;
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select public.complete_onboarding('student', 'Sibling One', null, 8::smallint, 'Same Parent', '9876500000', p_consent => true);
select pg_temp.as_user('77777777-7777-7777-7777-777777777777');
select public.complete_onboarding('student', 'Sibling Two', null, 10::smallint, 'Same Parent', '9876500000', p_consent => true);
select pg_temp.as_user('88888888-8888-8888-8888-888888888888');
select public.complete_onboarding('student', 'Phone Login Kid', null, 9::smallint, 'P', '9811111111', p_consent => true);
reset role;

-- ── Website enrollments ──────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$ begin perform public.record_purchase('pay_evil', 'solo@x.in'); raise exception 'P0 FAIL'; exception when insufficient_privilege then raise notice 'P0 pass: students cannot record purchases'; end $$;
do $$ begin perform public.admin_record_purchase('solo@x.in', null); raise exception 'P0b FAIL'; exception when others then if sqlerrm like 'P0b%' then raise; end if; raise notice 'P0b pass: %', sqlerrm; end $$;
reset role;

set role service_role;
select 'P1 email match unlocks at once' t, public.record_purchase('pay_1', ' SOLO@x.in ', null, 'Solo', 'Mom', 94905) = 'claimed' as pass;
select 'P2 replayed webhook' t, public.record_purchase('pay_1', 'solo@x.in') = 'already_claimed' as pass;
select 'P3 unknown buyer stays pending' t, public.record_purchase('pay_2', 'newkid@gmail.com', '98450 77777') = 'pending' as pass;
select 'P4 siblings sharing a parent phone stay pending' t, public.record_purchase('pay_3', null, '9876500000') = 'pending' as pass;
select 'P5 verified login phone matches' t, public.record_purchase('pay_4', null, '+91 99000 11223') = 'claimed' as pass;
select 'P6 parent phone only: stays pending (H2)' t, public.record_purchase('pay_5', 'someoneelse@x.in', '9900011224') = 'pending' as pass;
select 'P6b and is suggested for Studio' t, (select suggested_student is not null from public.purchases where reference = 'pay_5') as pass;
do $$ begin perform public.record_purchase('pay_bad', null, '123'); raise exception 'P7 FAIL'; exception when others then if sqlerrm like 'P7%' then raise; end if; raise notice 'P7 pass: %', sqlerrm; end $$;
select 'P8 access rows' t, (select count(*) from public.course_access where source = 'payment') = 2 as pass;
reset role;

-- The buyer of pay_2 signs up later with that email: access appears on first sign-in.
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'newkid@gmail.com');
set role authenticated; select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select public.complete_onboarding('student', 'New Kid', null, 9::smallint, 'P', '9845077777', p_consent => true);
select 'P9a claim on sign-in' t, public.claim_purchases() = 1 as pass;
select 'P9b course unlocked' t, public.has_course_access('ai-for-students') as pass;
select 'P10 nothing left to claim' t, public.claim_purchases() = 0 as pass;
-- Siblings: the first to sign in takes the one seat; the other gets nothing.
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'P11 sibling cannot claim by parent phone (H2)' t, public.claim_purchases() = 0 and not public.has_course_access('ai-for-students') as pass;
select 'P11b suggestion left for Studio' t, (select count(*) = 0 from public.purchases) as pass;
select pg_temp.as_user('77777777-7777-7777-7777-777777777777');
select 'P12 second sibling does not' t, public.claim_purchases() = 0 and not public.has_course_access('ai-for-students') as pass;
select 'P13 students see only their own enrollments' t, count(*) = 0 as pass from public.purchases;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'P14 own enrollment visible' t, count(*) = 1 as pass from public.purchases;
-- Studio adds a manual (UPI) enrollment for sibling two and revokes pay_1.
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'P15 manual enrollment pending (shared phone)' t, public.admin_record_purchase(null, '9876500000', 'Sibling Two', null, 99900, 'upi-123') = 'pending' as pass;
select public.admin_assign_purchase((select id from public.purchases where reference = 'upi-123'), '77777777-7777-7777-7777-777777777777');
select 'P16 assigned by Studio' t, (select status = 'claimed' and matched_by = 'admin' from public.purchases where reference = 'upi-123') as pass;
do $$ begin perform public.admin_approve_suggestion((select id from public.purchases where reference = 'upi-123')); raise exception 'H2a FAIL';
exception when others then if sqlerrm like 'H2a%' then raise; end if; raise notice 'H2a pass: %', sqlerrm; end $$;
select public.admin_approve_suggestion((select id from public.purchases where reference = 'pay_5'));
select 'H2b Studio approves parent-phone suggestion' t, (select status = 'claimed' and matched_by = 'parent_phone' and claimed_by = suggested_student from public.purchases where reference = 'pay_5') as pass;
select 'P17 refund revokes' t, public.admin_revoke_purchase('pay_1') = 'revoked' as pass;
reset role;
select 'P18 access gone after refund' t, not exists (select 1 from public.course_access where student_id = '11111111-1111-1111-1111-111111111111') as pass;
set role service_role;
select 'P19 refunded payment never re-unlocks' t, public.record_purchase('pay_1', 'solo@x.in') = 'already_revoked' as pass;
reset role;

-- ── Quizzes ──────────────────────────────────────────────────────────────────
-- Studio builds a quiz for free Module 0 and an unpublished one for paid Module 1.
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.quizzes (chapter_id, title, pass_percent, xp, published) values (pg_temp.chapter(0), 'AI 101 quiz', 60, 100, true);
insert into public.quizzes (chapter_id, title, published) values (pg_temp.chapter(1), 'Draft', false);
insert into public.quiz_questions (quiz_id, position, prompt, options, correct_index, explanation)
select q.id, v.pos, v.prompt, v.opts, v.ci, v.ex from public.quizzes q,
  (values (1, 'AI stands for?', array['Artificial Intelligence', 'Auto Input'], 0, 'Artificial Intelligence.'),
          (2, 'Is ChatGPT always right?', array['Yes', 'No'], 1, 'Always check.'),
          (3, 'Free tools are enough?', array['Yes', 'No', 'Only paid'], 0, 'Yes for this course.')) as v(pos, prompt, opts, ci, ex)
where q.title = 'AI 101 quiz';
select 'Q1 Studio sees answers' t, count(*) = 3 and bool_and(correct_index is not null) as pass from public.studio_quiz_questions((select id from public.quizzes where title = 'AI 101 quiz'));
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
do $$ begin insert into public.quizzes (chapter_id, title) values (pg_temp.chapter(2), 'Evil'); raise exception 'Q2 FAIL'; exception when insufficient_privilege then raise notice 'Q2 pass: %', sqlerrm; end $$;
-- Student 44 (paid via parent phone in P6) takes the free Module 0 quiz.
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select 'Q3 student sees published quiz only' t, count(*) = 1 as pass from public.quizzes;
select 'Q4 student reads questions' t, count(*) = 3 as pass from (select id, prompt, options from public.quiz_questions) x;
do $$ begin perform correct_index from public.quiz_questions; raise exception 'Q5 FAIL'; exception when insufficient_privilege then raise notice 'Q5 pass: answers hidden from students'; end $$;
select 'Q6 Studio answer function empty for students' t, count(*) = 0 as pass from public.studio_quiz_questions((select id from public.quizzes limit 1));
do $$ begin perform public.submit_quiz((select id from public.quizzes limit 1), array[0, 1]); raise exception 'Q7 FAIL'; exception when others then if sqlerrm like 'Q7%' then raise; end if; raise notice 'Q7 pass: %', sqlerrm; end $$;
select 'Q8 2 of 3 passes at 60%' t, (r ->> 'score')::int = 2 and (r ->> 'passed')::boolean and (r ->> 'xp')::int = 100
  and (r -> 'results' -> 1 ->> 'correct')::boolean = false and r -> 'results' -> 1 ->> 'explanation' = 'Always check.' as pass
  from (select public.submit_quiz((select id from public.quizzes limit 1), array[0, 0, 0]) as r) x;
reset role; update public.quiz_attempts set created_at = created_at - interval '1 minute';
set role authenticated; select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select 'Q9 1 of 3 fails' t, ((public.submit_quiz((select id from public.quizzes limit 1), array[1, 0, 1])) ->> 'passed')::boolean = false as pass;
select 'Q10 attempts saved' t, count(*) = 2 as pass from public.quiz_attempts where student_id = auth.uid();
do $$ begin insert into public.quiz_attempts (quiz_id, student_id, answers, score, total, passed) select id, auth.uid(), '{0}', 3, 3, true from public.quizzes limit 1; raise exception 'Q11 FAIL';
exception when insufficient_privilege then raise notice 'Q11 pass: cannot forge attempts'; end $$;
reset role;
-- Paid-module quiz is closed to a student without access even when published (11 was refunded in P17).
update public.quizzes set published = true where title = 'Draft';
insert into public.quiz_questions (quiz_id, prompt, options, correct_index) select id, 'Q', array['a', 'b'], 0 from public.quizzes where title = 'Draft';
set role authenticated; select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$ begin perform public.submit_quiz((select id from public.quizzes where chapter_id = pg_temp.chapter(1)), array[0]); raise exception 'Q12 FAIL'; exception when others then if sqlerrm like 'Q12%' then raise; end if; raise notice 'Q12 pass: %', sqlerrm; end $$;
select 'Q13 locked quiz invisible' t, count(*) = 1 as pass from public.quizzes;
reset role;

-- ── Assignments ──────────────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.assignments (chapter_id, title, instructions, allow_text, allow_link, allow_files, max_marks, published)
values (pg_temp.chapter(0), 'Your first prompt', 'Ask AI to explain photosynthesis', true, false, true, 10, true);
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select 'A1 written answer' t, public.submit_assignment((select id from public.assignments limit 1), 'My answer') is not null as pass;
do $$ begin perform public.submit_assignment((select id from public.assignments limit 1), null, 'https://x.com'); raise exception 'A2 FAIL'; exception when others then if sqlerrm like 'A2%' then raise; end if; raise notice 'A2 pass: %', sqlerrm; end $$;
do $$ begin perform public.submit_assignment((select id from public.assignments limit 1), 'x', null, array['11111111-1111-1111-1111-111111111111/' || (select id from public.assignments limit 1) || '/a.jpg']); raise exception 'A3 FAIL';
exception when others then if sqlerrm like 'A3%' then raise; end if; raise notice 'A3 pass: %', sqlerrm; end $$;
select 'A4 resubmit with a photo updates the same row' t, public.submit_assignment((select id from public.assignments limit 1), 'Better answer', null,
  array['44444444-4444-4444-4444-444444444444/' || (select id from public.assignments limit 1) || '/photo.jpg']) =
  (select id from public.assignment_submissions limit 1) as pass;
do $$ begin perform public.grade_submission((select id from public.assignment_submissions limit 1), 10); raise exception 'A5 FAIL'; exception when others then if sqlerrm like 'A5%' then raise; end if; raise notice 'A5 pass: %', sqlerrm; end $$;
-- Storage: own folder only.
insert into storage.objects (bucket_id, name) select 'submissions', '44444444-4444-4444-4444-444444444444/' || id || '/photo.jpg' from public.assignments limit 1;
do $$ begin insert into storage.objects (bucket_id, name) values ('submissions', '44444444-4444-4444-4444-444444444444/x/junk.bin'); raise exception 'L1a FAIL';
exception when insufficient_privilege then raise notice 'L1a pass: only real assignment folders'; end $$;
do $$ begin insert into storage.objects (bucket_id, name) values ('submissions', '44444444-4444-4444-4444-444444444444/junk.bin'); raise exception 'L1b FAIL';
exception when insufficient_privilege then raise notice 'L1b pass: no files at the top of the folder'; end $$;
do $$ begin insert into storage.objects (bucket_id, name) values ('submissions', '11111111-1111-1111-1111-111111111111/x/evil.jpg'); raise exception 'A6 FAIL';
exception when insufficient_privilege then raise notice 'A6 pass: cannot upload into another student''s folder'; end $$;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'A7 other students cannot see the file or submission' t, (select count(*) from storage.objects) = 0 and (select count(*) from public.assignment_submissions) = 0 as pass;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'A8 Studio sees file and submission' t, (select count(*) from storage.objects) = 1 and (select count(*) from public.assignment_submissions) = 1 as pass;
do $$ begin perform public.grade_submission((select id from public.assignment_submissions limit 1), 11); raise exception 'A9 FAIL'; exception when others then if sqlerrm like 'A9%' then raise; end if; raise notice 'A9 pass: %', sqlerrm; end $$;
select public.grade_submission((select id from public.assignment_submissions limit 1), 8, 'Nice work');
select 'A10 graded' t, status = 'graded' and marks = 8 and feedback = 'Nice work' as pass from public.assignment_submissions;
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
do $$ begin perform public.submit_assignment((select id from public.assignments limit 1), 'Changed after marking'); raise exception 'A11 FAIL'; exception when others then if sqlerrm like 'A11%' then raise; end if; raise notice 'A11 pass: %', sqlerrm; end $$;
do $$ begin update public.assignment_submissions set marks = 10; if found then raise exception 'A12 FAIL'; end if; raise notice 'A12 pass: cannot change own marks';
exception when insufficient_privilege then raise notice 'A12 pass: cannot change own marks'; end $$;
select 'A13 marks unchanged' t, marks = 8 as pass from public.assignment_submissions;
reset role;

set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'Z1 Studio numbers' t, (s ->> 'to_review')::int = 0 and (s ->> 'enrollments_claimed')::int >= 4 as pass from (select public.admin_stats() as s) x;
reset role;

-- ── Study planner ────────────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
insert into public.study_plans (student_id, plan_date, items) values (auth.uid(), '2026-11-02', '[{"id":"a","title":"Lesson 1","time":"7:00 PM","kind":"Lesson","done":false}]');
insert into public.study_plans (student_id, plan_date, items) values (auth.uid(), '2026-11-02', '[{"id":"a","title":"Lesson 1","done":true}]')
  on conflict (student_id, plan_date) do update set items = excluded.items, updated_at = now();
select 'D1 student saves and updates own plan' t, (items -> 0 ->> 'done')::boolean as pass from public.study_plans where plan_date = '2026-11-02';
do $$ begin insert into public.study_plans (student_id, plan_date) values ('11111111-1111-1111-1111-111111111111', '2026-11-02'); raise exception 'D2 FAIL';
exception when insufficient_privilege then raise notice 'D2 pass: cannot write another student''s plan'; end $$;
do $$ begin insert into public.study_plans (student_id, plan_date, items) values (auth.uid(), '2026-11-03', '{"not":"a list"}'); raise exception 'D3 FAIL';
exception when check_violation then raise notice 'D3 pass: items must be a list'; end $$;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'D4 other students cannot read it' t, count(*) = 0 as pass from public.study_plans;
select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
do $$ begin insert into public.study_plans (student_id, plan_date) values (auth.uid(), '2026-11-02'); raise exception 'D5 FAIL';
exception when insufficient_privilege then raise notice 'D5 pass: accounts without a student profile cannot save plans'; end $$;
reset role;

-- ── Leads and pipeline ───────────────────────────────────────────────────────
set role service_role;
select 'L1 lead saved' t, public.record_lead('loki-1', '98450 12345', 'Loki', 'Mom', 'Solo') = 'saved' as pass;
select 'L2 retry counts once' t, public.record_lead('loki-1', '9845012345', 'loki') = 'duplicate' as pass;
select 'L3 website-only lead' t, public.record_lead('loki-2', '9000000001', 'qr', 'Asha') = 'saved' as pass;
do $$ begin perform public.record_lead('loki-3', '12345', 'loki'); raise exception 'L4 FAIL'; exception when others then if sqlerrm like 'L4%' then raise; end if; raise notice 'L4 pass: %', sqlerrm; end $$;
reset role;
set role authenticated; select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
do $$ begin perform public.record_lead('x', '9000000002', 'loki'); raise exception 'L5 FAIL'; exception when insufficient_privilege then raise notice 'L5 pass: signed-in users cannot write leads'; end $$;
select 'L6 non-admins cannot read leads' t, (select count(*) from public.leads) = 0 as pass;
do $$ begin perform public.admin_pipeline(); raise exception 'L7 FAIL'; exception when others then if sqlerrm like 'L7%' then raise; end if; raise notice 'L7 pass: %', sqlerrm; end $$;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'L8 signup source set once' t, public.record_signup_source('loki', '{"utm_source":"qr","evil":"x"}') and not public.record_signup_source('other') as pass;
select 'L9 only utm tags kept' t, signup_source = 'loki' and signup_utm = '{"utm_source":"qr"}' as pass from public.profiles where id = auth.uid();
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'L10 lead matched to student by parent phone' t, lead_id is not null and stage between 2 and 5 as pass
  from public.admin_pipeline() where student_id = '11111111-1111-1111-1111-111111111111';
select 'L11 unmatched lead is stage 1' t, stage = 1 and source = 'qr' as pass from public.admin_pipeline() where phone = '+919000000001';
select 'L12 one row per student' t, count(*) = count(distinct student_id) as pass from public.admin_pipeline() where student_id is not null;
reset role;

-- ── H2: unverified email never unlocks ───────────────────────────────────────
insert into auth.users (id, email, email_confirmed_at) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'unverified@x.in', null);
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select public.complete_onboarding('student', 'Unverified', null, 9::smallint, 'P', '9811122233', p_consent => true);
reset role; set role service_role;
select 'H2c unverified email stays pending' t, public.record_purchase('pay_unv', 'unverified@x.in') = 'pending' as pass;
reset role; set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select 'H2d and cannot claim it' t, public.claim_purchases() = 0 and not public.has_course_access('ai-for-students') as pass;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$ begin perform public.admin_approve_suggestion((select id from public.purchases limit 1)); raise exception 'H2e FAIL';
exception when others then if sqlerrm like 'H2e%' then raise; end if; raise notice 'H2e pass: students cannot approve (%)', sqlerrm; end $$;
reset role;

-- ── One login per child ──────────────────────────────────────────────────────
insert into auth.users (id, email, phone) values
 ('f1111111-1111-1111-1111-111111111111', 'mom@x.in', null),
 ('f2222222-2222-2222-2222-222222222222', 'kid2@x.in', null);
set role authenticated; select pg_temp.as_user('f1111111-1111-1111-1111-111111111111');
do $$ begin perform public.complete_onboarding('student', 'Kid', null, 9::smallint, 'Mom', '9845011111'); raise exception 'O1 FAIL';
exception when others then if sqlerrm like 'O1%' then raise; end if; raise notice 'O1 pass: %', sqlerrm; end $$;
do $$ begin perform public.complete_onboarding('parent', 'Mom', 'ABC123'); raise exception 'O2 FAIL';
exception when others then if sqlerrm like 'O2%' then raise; end if; raise notice 'O2 pass: %', sqlerrm; end $$;
do $$ begin perform public.complete_onboarding('student', 'Kid', null, 9::smallint, 'Mom', '9845011111', null, 'parent', '12345', true); raise exception 'O3 FAIL';
exception when others then if sqlerrm like 'O3%' then raise; end if; raise notice 'O3 pass: %', sqlerrm; end $$;
select public.complete_onboarding('student', 'Kid Rao', null, 9::smallint, 'Mom Rao', '9845011111', null, 'parent', '98450 22222', true);
select 'O4 parent sets up the child account' t, (select role = 'student' and signed_up_by = 'parent' and consent_by = 'parent' and guardian_consent_at is not null
  and student_phone = '+919845022222' and guardian_phone = '+919845011111' and invite_code is null from public.profiles where id = auth.uid()) as pass;
select pg_temp.as_user('f2222222-2222-2222-2222-222222222222');
select public.complete_onboarding('student', 'Kid Two', null, 8::smallint, 'Dad', '9845033333', null, 'student', null, true);
select 'O5 student signs up, child phone optional' t, (select signed_up_by = 'student' and student_phone is null and consent_by = 'student' from public.profiles where id = auth.uid()) as pass;
reset role;
select 'O6 no invite codes left' t, not exists (select 1 from public.profiles where invite_code is not null) as pass;
select 'O7 link_child is gone' t, not exists (select 1 from pg_proc where proname = 'link_child') as pass;

-- ── H3: teacher terms and revoke ─────────────────────────────────────────────
insert into auth.users (id, email) values ('7eac0000-0000-0000-0000-000000000001', 'teach@x.in');
set role authenticated; select pg_temp.as_user('7eac0000-0000-0000-0000-000000000001');
do $$ begin perform public.complete_onboarding('teacher', 'Ms T', 'TEST-T-XYZ'); raise exception 'H3a FAIL';
exception when others then if sqlerrm like 'H3a%' then raise; end if; raise notice 'H3a pass: %', sqlerrm; end $$;
select public.complete_onboarding('teacher', 'Ms T', 'test-t-xyz', p_consent => true);
select 'H3b teacher with terms can open the course' t, public.has_course_access('ai-for-students') and (select teacher_terms_at is not null from public.profiles where id = auth.uid()) as pass;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$ begin perform public.admin_set_teacher_revoked('7eac0000-0000-0000-0000-000000000001', true); raise exception 'H3c FAIL';
exception when others then if sqlerrm like 'H3c%' then raise; end if; raise notice 'H3c pass: students cannot revoke (%)', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.admin_set_teacher_revoked('7eac0000-0000-0000-0000-000000000001', true);
select pg_temp.as_user('7eac0000-0000-0000-0000-000000000001');
select 'H3d revoked teacher loses access' t, not public.has_course_access('ai-for-students') and not public.is_active_teacher() as pass;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.admin_set_teacher_revoked('7eac0000-0000-0000-0000-000000000001', false);
select pg_temp.as_user('7eac0000-0000-0000-0000-000000000001');
select 'H3e restored teacher has access again' t, public.has_course_access('ai-for-students') as pass;
reset role;

-- ── M2: progress and answers only through checked functions ──────────────────
create function pg_temp.lesson(pos int) returns uuid language sql as $$
  select l.id from public.lessons l join public.chapters c on c.id = l.chapter_id where c.course_id = 'ai-for-students' and c.position = pos order by l.position limit 1 $$;
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
do $$ begin insert into public.lesson_progress (student_id, lesson_id, completed_at) values (auth.uid(), pg_temp.lesson(1), now()); raise exception 'M2a FAIL';
exception when insufficient_privilege then raise notice 'M2a pass: no direct progress writes'; end $$;
do $$ begin insert into public.checkpoint_answers (student_id, lesson_id, question, correct) values (auth.uid(), pg_temp.lesson(0), 'q', true); raise exception 'M2b FAIL';
exception when insufficient_privilege then raise notice 'M2b pass: no direct answer writes'; end $$;
do $$ begin perform public.save_progress(pg_temp.lesson(1), 100, true); raise exception 'M2c FAIL';
exception when others then if sqlerrm like 'M2c%' then raise; end if; raise notice 'M2c pass: locked lesson refused (%)', sqlerrm; end $$;
select public.save_progress(pg_temp.lesson(0), 120);
select public.save_progress(pg_temp.lesson(0), 60);
select public.save_progress(pg_temp.lesson(0), 99999999, true);
select 'M2d free lesson saved, watch time never goes down and is capped' t,
  (select seconds_watched between 120 and 14400 and completed_at is not null from public.lesson_progress where student_id = auth.uid() and lesson_id = pg_temp.lesson(0)) as pass;
select public.save_progress(pg_temp.lesson(0), null, false);
select 'M2e can un-mark done' t, (select completed_at is null from public.lesson_progress where student_id = auth.uid() and lesson_id = pg_temp.lesson(0)) as pass;
select 'M2f first answer counts' t, public.save_answer(pg_temp.lesson(0), 'Which tool?', true) and not public.save_answer(pg_temp.lesson(0), 'Which tool?', true) as pass;
select 'M2g one row' t, (select count(*) = 1 from public.checkpoint_answers where student_id = auth.uid()) as pass;
do $$ begin perform public.save_answer(pg_temp.lesson(1), 'x', true); raise exception 'M2h FAIL';
exception when others then if sqlerrm like 'M2h%' then raise; end if; raise notice 'M2h pass: %', sqlerrm; end $$;
reset role;

-- ── M3: quiz answers only after a pass or the 3rd attempt ────────────────────
set role authenticated; select pg_temp.as_user('f2222222-2222-2222-2222-222222222222');
select 'M3a 1st failed attempt hides answers' t, (r ->> 'revealed')::boolean = false and r -> 'results' -> 0 ->> 'correct_index' is null
  and r -> 'results' -> 0 ->> 'explanation' is null and (r -> 'results' -> 0 ->> 'correct') is not null as pass
  from (select public.submit_quiz((select id from public.quizzes where title = 'AI 101 quiz'), array[1, 0, 1]) as r) x;
do $$ begin perform public.submit_quiz((select id from public.quizzes where title = 'AI 101 quiz'), array[1, 0, 1]); raise exception 'M3b FAIL';
exception when others then if sqlerrm like 'M3b%' then raise; end if; raise notice 'M3b pass: %', sqlerrm; end $$;
reset role; update public.quiz_attempts set created_at = created_at - interval '1 minute'; set role authenticated; select pg_temp.as_user('f2222222-2222-2222-2222-222222222222');
select 'M3c 2nd failed attempt still hidden' t, (public.submit_quiz((select id from public.quizzes where title = 'AI 101 quiz'), array[1, 0, 1]) ->> 'revealed')::boolean = false as pass;
reset role; update public.quiz_attempts set created_at = created_at - interval '1 minute'; set role authenticated; select pg_temp.as_user('f2222222-2222-2222-2222-222222222222');
select 'M3d 3rd attempt reveals' t, (r ->> 'revealed')::boolean and (r -> 'results' -> 0 ->> 'correct_index')::int = 0 as pass
  from (select public.submit_quiz((select id from public.quizzes where title = 'AI 101 quiz'), array[1, 0, 1]) as r) x;
reset role;

-- ── M4: Studio export and delete ─────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('f2222222-2222-2222-2222-222222222222');
do $$ begin perform public.admin_export_student('44444444-4444-4444-4444-444444444444'); raise exception 'X1 FAIL';
exception when others then if sqlerrm like 'X1%' then raise; end if; raise notice 'X1 pass: students cannot export (%)', sqlerrm; end $$;
do $$ begin perform public.admin_delete_student('44444444-4444-4444-4444-444444444444', 'School Kid'); raise exception 'X2 FAIL';
exception when others then if sqlerrm like 'X2%' then raise; end if; raise notice 'X2 pass: students cannot delete (%)', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'X3 export has the account, profile and activity' t, (e -> 'account' ->> 'email') = 'school@x.in' and (e -> 'profile' ->> 'full_name') = 'School Kid'
  and json_array_length(e -> 'assignment_submissions') = 1 and json_array_length(e -> 'quiz_attempts') >= 2
  from (select public.admin_export_student('44444444-4444-4444-4444-444444444444') as e) x;
do $$ begin perform public.admin_delete_student('44444444-4444-4444-4444-444444444444', 'Wrong Name'); raise exception 'X4 FAIL';
exception when others then if sqlerrm like 'X4%' then raise; end if; raise notice 'X4 pass: %', sqlerrm; end $$;
select 'X5 delete returns the file paths' t, cardinality(public.admin_delete_student('44444444-4444-4444-4444-444444444444', ' school kid ')) = 1 as pass;
reset role;
select 'X6 account and activity gone, payment kept unlinked' t,
  not exists (select 1 from auth.users where id = '44444444-4444-4444-4444-444444444444')
  and not exists (select 1 from public.quiz_attempts where student_id = '44444444-4444-4444-4444-444444444444')
  and not exists (select 1 from public.course_access where student_id = '44444444-4444-4444-4444-444444444444')
  and exists (select 1 from public.purchases where reference = 'pay_5' and claimed_by is null)
  and exists (select 1 from public.data_deletions where student_id = '44444444-4444-4444-4444-444444444444') as pass;

-- ── CRM notes ────────────────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.crm_notes (student_id, body, channel, follow_up_at)
values ('66666666-6666-6666-6666-666666666666', 'Called mum, will pay after exams', 'call', now() - interval '1 hour');
insert into public.crm_notes (lead_id, body) select id, 'Asked for school pricing' from public.leads limit 1;
select 'C1 admin adds notes on students and leads' t, count(*) = 2 and bool_and(created_by = auth.uid()) as pass from public.crm_notes;
select 'C2 due follow-ups' t, count(*) = 1 as pass from public.crm_notes where done_at is null and follow_up_at <= now();
select 'C3 export includes notes' t, json_array_length(public.admin_export_student('66666666-6666-6666-6666-666666666666') -> 'crm_notes') = 1 as pass;
do $$ begin insert into public.crm_notes (body) values ('nobody'); raise exception 'C4 FAIL';
exception when check_violation then raise notice 'C4 pass: a note needs a person'; end $$;
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'C5 students cannot read notes' t, count(*) = 0 as pass from public.crm_notes;
do $$ begin insert into public.crm_notes (student_id, body) values (auth.uid(), 'self note'); raise exception 'C6 FAIL';
exception when insufficient_privilege then raise notice 'C6 pass: students cannot write notes'; end $$;
reset role;

-- ── School bulk enrollment ───────────────────────────────────────────────────
select set_config('bt.school', (select id::text from public.schools where code = 'TEST-ABC'), false) is not null as school_set \g /dev/null
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'B1 a bad row saves nothing and reports every error' t,
  (r ->> 'ok')::boolean = false and jsonb_array_length(r -> 'errors') = 2
  and not exists (select 1 from public.school_rosters) as pass
  from (select public.admin_bulk_enroll(current_setting('bt.school')::uuid, 'ai-for-students', null,
    '[{"name":"Asha","grade":"8","parent_phone":"98450 11111"},{"name":"","grade":"11","parent_phone":"98450 22222"}]') as r) x;
select 'B2 good list creates one key per child, grouped by class' t,
  (r ->> 'ok')::boolean and jsonb_array_length(r -> 'keys') = 3 as pass
  from (select public.admin_bulk_enroll(current_setting('bt.school')::uuid, 'ai-for-students', 'Udupi 2026',
    '[{"name":"Asha","grade":8,"parent_phone":"98450 11111","section":"a"},{"name":"Ravi","grade":"8","parent_phone":"+91 98450 22222","section":"A"},{"name":"Meera","grade":9,"parent_phone":"09845033333"}]') as r) x;
select 'B2b three roster rows, phone normalised, classes Grade 8 A and Grade 9' t,
  (select count(*) from public.school_rosters) = 3
  and (select parent_phone from public.school_rosters where student_name = 'Asha') = '+919845011111'
  and (select count(*) from public.classes where name in ('Grade 8 A', 'Grade 9')) = 2 as pass;
do $$ begin perform public.admin_bulk_enroll(current_setting('bt.school')::uuid, 'ai-for-students', null,
  (select jsonb_agg(jsonb_build_object('name', 'Kid ' || g, 'grade', 8, 'parent_phone', '9845011111')) from generate_series(1, 201) g));
  raise exception 'B3 FAIL';
exception when others then if sqlerrm like 'B3%' then raise; end if; raise notice 'B3 pass: %', sqlerrm; end $$;
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
do $$ begin perform public.admin_bulk_enroll(current_setting('bt.school')::uuid, 'ai-for-students', null,
  '[{"name":"X","grade":8,"parent_phone":"9845011111"}]'); raise exception 'B4 FAIL';
exception when others then if sqlerrm like 'B4%' then raise; end if; raise notice 'B4 pass: %', sqlerrm; end $$;
select 'B5 students cannot read rosters' t, count(*) = 0 as pass from public.school_rosters;
reset role;
create temp table b_codes as select r.student_name, k.code from public.school_rosters r join public.access_keys k on k.id = r.access_key_id;
grant select on b_codes to authenticated;
set role authenticated; select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'B6 redeeming a roster key links the row and joins the class' t,
  public.redeem_access_key((select code from b_codes where student_name = 'Asha')) = 'ai-for-students' as pass;
reset role;
select 'B6b roster row linked, child in Grade 8 A' t,
  (select redeemed_by from public.school_rosters where student_name = 'Asha') = '66666666-6666-6666-6666-666666666666'
  and exists (select 1 from public.enrollments e join public.classes c on c.id = e.class_id
              where e.student_id = '66666666-6666-6666-6666-666666666666' and c.name = 'Grade 8 A') as pass;
set role authenticated; select pg_temp.as_user('77777777-7777-7777-7777-777777777777');
do $$ begin perform public.redeem_access_key((select code from b_codes where student_name = 'Asha')); raise exception 'B7 FAIL';
exception when others then if sqlerrm like 'B7%' then raise; end if; raise notice 'B7 pass: %', sqlerrm; end $$;
reset role;

-- ── Workshops ────────────────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.workshops (slug, title, starts_at, venue, seats, published) values
  ('udupi-ai-day', 'AI Day', now() + interval '7 days', 'Town Hall', 2, true),
  ('draft-day', 'Draft', now() + interval '7 days', null, 10, false),
  ('past-day', 'Past', now() - interval '1 day', null, 10, true);
reset role;
set role anon; select pg_temp.as_user('');
select 'W1 public sees published workshops only' t, count(*) = 2 and bool_and(published) as pass from public.workshops;
select 'W2 seats left shown, draft hidden' t, (public.get_workshop('udupi-ai-day') ->> 'seats_left')::int = 2 and public.get_workshop('draft-day') is null as pass;
select 'W3 parent registers without an account' t, public.register_workshop('udupi-ai-day', 'Asha', 9, 'Mum', '98450 44444', true) = 'registered' as pass;
select 'W4 same phone again is not a second seat' t, public.register_workshop('udupi-ai-day', 'Asha', 9, 'Mum', '+919845044444', true) = 'already' as pass;
do $$ begin perform public.register_workshop('udupi-ai-day', 'Ravi', 8, 'Dad', '9845055555', false); raise exception 'W5 FAIL';
exception when others then if sqlerrm like 'W5%' then raise; end if; raise notice 'W5 pass: %', sqlerrm; end $$;
select 'W6 second family takes the last seat' t, public.register_workshop('udupi-ai-day', 'Ravi', 8, 'Dad', '9845055555', true) = 'registered' as pass;
do $$ begin perform public.register_workshop('udupi-ai-day', 'Meera', 10, 'Mum', '9845066666', true); raise exception 'W7 FAIL';
exception when others then if sqlerrm like 'W7%' then raise; end if; raise notice 'W7 pass: %', sqlerrm; end $$;
do $$ begin perform public.register_workshop('draft-day', 'Meera', 10, 'Mum', '9845066666', true); raise exception 'W8 FAIL';
exception when others then if sqlerrm like 'W8%' then raise; end if; raise notice 'W8 pass: %', sqlerrm; end $$;
do $$ begin perform public.register_workshop('past-day', 'Meera', 10, 'Mum', '9845066666', true); raise exception 'W9 FAIL';
exception when others then if sqlerrm like 'W9%' then raise; end if; raise notice 'W9 pass: %', sqlerrm; end $$;
select 'W10 public cannot read registrations' t, count(*) = 0 as pass from public.workshop_registrations;
do $$ begin insert into public.workshop_registrations (workshop_id, student_name, grade, parent_name, parent_phone, consent_at)
  select id, 'X', 9, 'Y', '+919845077777', now() from public.workshops limit 1; raise exception 'W11 FAIL';
exception when others then if sqlerrm like 'W11%' then raise; end if; raise notice 'W11 pass: %', sqlerrm; end $$;
reset role;
set role authenticated; select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'W12 students cannot read registrations' t, count(*) = 0 as pass from public.workshop_registrations;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'W13 admin sees registrations, each linked to a workshop lead' t, count(*) = 2
  and bool_and(exists (select 1 from public.leads l where l.id = r.lead_id and l.source = 'workshop')) as pass from public.workshop_registrations r;
update public.workshop_registrations set attended_at = now() where student_name = 'Asha';
select 'W14 admin marks attendance' t, count(*) = 1 as pass from public.workshop_registrations where attended_at is not null;
reset role;

-- ── Learning log and dashboard stats ─────────────────────────────────────────
-- Student eeee watched lesson 0 in the M2 block: 120 s then a jump to the cap a moment later.
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select 'G1 today logged, skipping ahead does not count as watching' t,
  (select seconds between 60 and 120 from public.learning_days where student_id = auth.uid()) as pass;
select 'G2 dashboard stats: XP, answers, watch time (no streaks since migration 10)' t,
  (s ->> 'xp')::int >= 10 and (s ->> 'checks_answered')::int >= 1 and (s ->> 'minutes_total')::int >= 1
  and s ? 'xp_breakdown' and not s ? 'streak' as pass
  from (select public.my_learning_stats() as s) x;
do $$ begin insert into public.learning_days (student_id, day, seconds) values (auth.uid(), current_date - 1, 3600); raise exception 'G3 FAIL';
exception when insufficient_privilege then raise notice 'G3 pass: no direct writes to the learning log'; end $$;
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'G4 students cannot see another student''s days' t, count(*) = 0 as pass from public.learning_days where student_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
reset role;
insert into public.learning_days (student_id, day, seconds) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (now() at time zone 'Asia/Kolkata')::date - 1, 600),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (now() at time zone 'Asia/Kolkata')::date - 2, 600),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (now() at time zone 'Asia/Kolkata')::date - 5, 600);
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select 'G5 daily log keeps one row per day for the student' t,
  (select count(*) = 4 and sum(seconds) between 1860 and 1920 from public.learning_days where student_id = auth.uid()) as pass;
reset role;

-- ── XP, leaderboard, owner insights ──────────────────────────────────────────
insert into public.assignment_submissions (assignment_id, student_id, status, marks)
  select id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'graded', round(max_marks * 0.8) from public.assignments limit 1;
select 'K1 XP adds checks, quizzes and graded assignments (8/10 marks = 40 XP)' t,
  (x ->> 'assignments')::int = 40 and (x ->> 'total')::int = (x ->> 'checks')::int + (x ->> 'quizzes')::int + 40 as pass
  from (select public.student_xp('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee') x) s;
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
do $$ begin perform public.student_xp(auth.uid()); raise exception 'K2 FAIL';
exception when others then if sqlerrm like 'K2%' then raise; end if; raise notice 'K2 pass: XP helper is internal'; end $$;
select 'K3 dashboard XP matches the shared XP' t, (public.my_learning_stats() ->> 'xp')::int >= 10 as pass;
select 'K4 leaderboard: top list, my rank, short names only' t,
  jsonb_array_length(b -> 'top') between 1 and 10 and (b -> 'me' ->> 'rank')::int >= 1
  and not exists (select 1 from jsonb_array_elements(b -> 'top') e where e ->> 'name' ~ ' [A-Za-z]{2,}') as pass
  from (select public.xp_leaderboard() b) x;
select public.set_leaderboard_hidden(true);
select 'K5 hidden: not in the list, still sees own rank' t,
  not exists (select 1 from jsonb_array_elements(b -> 'top') e where (e ->> 'me')::boolean) and (b -> 'me' ->> 'hidden')::boolean as pass
  from (select public.xp_leaderboard() b) x;
select public.set_leaderboard_hidden(false);
do $$ begin perform public.admin_insights(30); raise exception 'K6 FAIL';
exception when others then if sqlerrm like 'K6%' then raise; end if; raise notice 'K6 pass: %', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'K7 owner insights: engagement, lessons, sources, schools, workshops' t,
  (i -> 'engagement' ->> 'students')::int > 0 and jsonb_array_length(i -> 'lessons') > 0
  and jsonb_typeof(i -> 'sources') = 'array' and jsonb_array_length(i -> 'schools') >= 1
  and (i -> 'workshops' -> 0 ->> 'registered')::int = 2 and (i -> 'workshops' -> 0 ->> 'attended')::int = 1 as pass
  from (select public.admin_insights(30) i) x;
reset role;

-- ── Module resources ─────────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.module_resources (chapter_id, title, file_path, mime, size_bytes) values
  (pg_temp.chapter(0), 'AI 101 worksheet', pg_temp.chapter(0) || '/worksheet.pdf', 'application/pdf', 1000),
  (pg_temp.chapter(1), 'Module 1 notes', pg_temp.chapter(1) || '/notes.pdf', 'application/pdf', 1000);
insert into storage.objects (bucket_id, name) values
  ('module-resources', pg_temp.chapter(0) || '/worksheet.pdf'), ('module-resources', pg_temp.chapter(1) || '/notes.pdf');
select 'R1 admin adds resources and files' t, (select count(*) from public.module_resources) = 2
  and (select count(*) from storage.objects where bucket_id = 'module-resources') = 2 as pass;
do $$ begin insert into public.module_resources (chapter_id, title, file_path, mime, size_bytes)
  values (pg_temp.chapter(0), 'Wrong folder', pg_temp.chapter(1) || '/x.pdf', 'application/pdf', 10); raise exception 'R2 FAIL';
exception when check_violation then raise notice 'R2 pass: file must sit in its module folder'; end $$;
select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select 'R3 student sees only resources of open modules' t,
  (select count(*) from public.module_resources) = 1 and (select title from public.module_resources) = 'AI 101 worksheet' as pass;
select 'R4 and can read only those files' t,
  (select count(*) from storage.objects where bucket_id = 'module-resources') = 1 as pass;
do $$ begin insert into public.module_resources (chapter_id, title, file_path, mime, size_bytes)
  values (pg_temp.chapter(0), 'Mine', pg_temp.chapter(0) || '/mine.pdf', 'application/pdf', 10); raise exception 'R5 FAIL';
exception when insufficient_privilege then raise notice 'R5 pass: students cannot add resources'; end $$;
do $$ begin insert into storage.objects (bucket_id, name) values ('module-resources', pg_temp.chapter(0) || '/evil.pdf'); raise exception 'R6 FAIL';
exception when insufficient_privilege then raise notice 'R6 pass: students cannot upload module files'; end $$;
reset role;

-- ── UPI claims (interim payments) ────────────────────────────────────────────
insert into storage.objects (bucket_id, name) values
  ('payment-proofs', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/pay.jpg'), ('payment-proofs', '66666666-6666-6666-6666-666666666666/pay.jpg');
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
do $$ begin perform public.submit_upi_claim('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/missing.jpg'); raise exception 'U1 FAIL';
exception when others then if sqlerrm like 'U1%' then raise; end if; raise notice 'U1 pass: %', sqlerrm; end $$;
do $$ begin perform public.submit_upi_claim('66666666-6666-6666-6666-666666666666/pay.jpg'); raise exception 'U1b FAIL';
exception when others then if sqlerrm like 'U1b%' then raise; end if; raise notice 'U1b pass: cannot use another student''s screenshot'; end $$;
select 'U2 student submits screenshot + UTR' t, public.submit_upi_claim('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/pay.jpg', '4321 5678 9012', 'Mum') = 'submitted' as pass;
select 'U3 a second claim while one is pending is not added' t, (select count(*) from public.upi_claims) = 1 as pass;
do $$ begin insert into public.upi_claims (student_id, course_id, amount_paise, proof_path) values (auth.uid(), 'ai-for-students', 1, auth.uid() || '/x.jpg'); raise exception 'U4 FAIL';
exception when insufficient_privilege then raise notice 'U4 pass: no direct claim writes'; end $$;
do $$ begin perform public.admin_decide_upi_claim((select id from public.upi_claims limit 1), true); raise exception 'U5 FAIL';
exception when others then if sqlerrm like 'U5%' then raise; end if; raise notice 'U5 pass: %', sqlerrm; end $$;
select 'U5b student sees only own screenshots' t, (select count(*) from storage.objects where bucket_id = 'payment-proofs') = 1 as pass;
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'U6 other students cannot see the claim' t, count(*) = 0 as pass from public.upi_claims;
do $$ begin perform public.submit_upi_claim('66666666-6666-6666-6666-666666666666/pay.jpg', '432156789012'); raise exception 'U7 FAIL';
exception when others then if sqlerrm like 'U7%' then raise; end if; raise notice 'U7 pass: %', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'U8 admin sees screenshots and approves' t, (select count(*) from storage.objects where bucket_id = 'payment-proofs') = 2
  and public.admin_decide_upi_claim((select id from public.upi_claims where utr = '432156789012'), true) = 'approved' as pass;
reset role;
select 'U9 access + purchase rows exist' t,
  exists (select 1 from public.course_access where student_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and reference = 'upi-432156789012')
  and exists (select 1 from public.purchases where reference = 'upi-432156789012' and status = 'claimed' and amount_paise > 0) as pass;

-- ── Coupons ──────────────────────────────────────────────────────────────────
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.coupons (code, price_inr, valid_until) values ('WORKSHOP499', 499, now() + interval '2 days');
insert into public.coupons (code, price_inr, valid_from, valid_until) values ('OLD199', 199, now() - interval '5 days', now() - interval '3 days');
reset role;
insert into storage.objects (bucket_id, name) values ('payment-proofs', '77777777-7777-7777-7777-777777777777/pay.jpg');
delete from public.course_access where student_id = '77777777-7777-7777-7777-777777777777';
set role authenticated; select pg_temp.as_user('77777777-7777-7777-7777-777777777777');
select 'V1 valid code gives the coupon price, expired and unknown give nothing' t,
  public.coupon_price('workshop499') = 499 and public.coupon_price('OLD199') is null and public.coupon_price('NOPE') is null as pass;
select 'V2 students cannot list coupons' t, count(*) = 0 as pass from public.coupons;
do $$ begin perform public.submit_upi_claim('77777777-7777-7777-7777-777777777777/pay.jpg', null, null, 'ai-for-students', 'OLD199'); raise exception 'V3 FAIL';
exception when others then if sqlerrm like 'V3%' then raise; end if; raise notice 'V3 pass: %', sqlerrm; end $$;
select 'V4 claim with a valid code is priced by the server at 499' t,
  public.submit_upi_claim('77777777-7777-7777-7777-777777777777/pay.jpg', null, null, 'ai-for-students', ' workshop499 ') = 'submitted' as pass;
select 'V4b claim stored at 499 with the code' t, coalesce((select amount_paise = 49900 and coupon_code = 'WORKSHOP499' from public.upi_claims where student_id = auth.uid()), false) as pass;
do $$ begin insert into public.coupons (code, price_inr, valid_until) values ('FREE1', 1, now() + interval '1 day'); raise exception 'V5 FAIL';
exception when insufficient_privilege then raise notice 'V5 pass: students cannot create coupons'; end $$;
reset role;

-- ── Leads: delete, clear, duplicates ─────────────────────────────────────────
reset role;
set role service_role;
select 'Y0 two leads, same phone' t, public.record_lead('dup-1', '9111111111', 'qr') = 'saved' and public.record_lead('dup-2', '91111 11111', 'loki') in ('saved', 'duplicate') as pass;
reset role;
insert into public.leads (reference, phone, source) values ('dup-3', '+919111111111', 'schools');
select 'Y1 email key folds Gmail dots and +tags' t, public.email_key('A.B+x@Gmail.com') = 'ab@gmail.com' and public.email_key('A@x.in') = 'a@x.in' and public.phone_key('+91 91111-11111') = '9111111111' as pass;
set role authenticated; select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$ begin perform public.admin_duplicates(); raise exception 'Y2 FAIL'; exception when others then if sqlerrm like 'Y2%' then raise; end if; raise notice 'Y2 pass: %', sqlerrm; end $$;
do $$ begin perform public.admin_clear_leads('DELETE ALL LEADS'); raise exception 'Y3 FAIL'; exception when others then if sqlerrm like 'Y3%' then raise; end if; raise notice 'Y3 pass: %', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'Y4 duplicate phone found' t, count(*) >= 2 as pass from public.admin_duplicates() where match = 'phone' and match_key = '9111111111';
select 'Y5 dedupe removes extra copies' t, public.admin_dedupe_leads() >= 1 as pass;
select 'Y5b one lead left for that phone' t, count(*) = 1 as pass from public.leads where public.phone_key(phone) = '9111111111';
select 'Y6 delete lead by id' t, public.admin_delete_leads(array(select id from public.leads where public.phone_key(phone) = '9111111111')) = 1 as pass;
do $$ begin perform public.admin_clear_leads('yes'); raise exception 'Y7 FAIL'; exception when others then if sqlerrm like 'Y7%' then raise; end if; raise notice 'Y7 pass: %', sqlerrm; end $$;
select 'Y8 clear all leads' t, public.admin_clear_leads('DELETE ALL LEADS') >= 0 as pass;
select 'Y8b no leads left' t, count(*) = 0 as pass from public.leads where course_id = 'ai-for-students';
reset role;

-- ── Course price and original price ──────────────────────────────────────────
select 'F1 list price set' t, list_price_inr = 3000 as pass from public.courses where id = 'ai-for-students';
do $$ begin update public.courses set price_inr = 0 where id = 'ai-for-students'; raise exception 'F2 FAIL'; exception when check_violation then raise notice 'F2 pass: price 0 rejected'; end $$;
do $$ begin update public.courses set list_price_inr = 10 where id = 'ai-for-students'; raise exception 'F3 FAIL'; exception when check_violation then raise notice 'F3 pass: original price below price rejected'; end $$;

-- ── Admin lead entry, import, workshop invites ───────────────────────────────
reset role;
insert into public.workshops (id, slug, title, starts_at, seats) values ('abababab-abab-abab-abab-abababababab', 'test-ws', 'Test', now() + interval '1 day', 2);
set role authenticated; select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
do $$ begin perform public.admin_add_lead('9222222222'); raise exception 'J1 FAIL'; exception when others then if sqlerrm like 'J1%' then raise; end if; raise notice 'J1 pass: %', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'J2 admin adds a lead' t, public.admin_add_lead('92222 22222', 'manual', 'Ravi', 'Anu', 9::smallint, 'SVS', 'met at fair') = 'saved' as pass;
select 'J3 same phone again counts once' t, public.admin_add_lead('9222222222') = 'duplicate' as pass;
select 'J4 import saves good rows, reports bad ones' t,
  r -> 'saved' = '2' and jsonb_array_length(r -> 'invalid') = 1 as pass
  from (select public.admin_import_leads('[{"phone":"9333333333","parent_name":"A","student_name":"B","grade":"8"},{"phone":"123"},{"phone":"9444444444"}]', 'fair') r) x;
do $$ begin perform public.admin_register_leads('abababab-abab-abab-abab-abababababab', array(select id from public.leads), false); raise exception 'J5 FAIL'; exception when others then if sqlerrm like 'J5%' then raise; end if; raise notice 'J5 pass: %', sqlerrm; end $$;
select 'J6 complete leads registered, incomplete skipped' t,
  (r ->> 'added')::int = 2 and jsonb_array_length(r -> 'skipped') >= 1 as pass
  from (select public.admin_register_leads('abababab-abab-abab-abab-abababababab', array(select id from public.leads where phone in ('+919222222222', '+919333333333', '+919444444444')), true) r) x;
reset role;

-- ── Newsletters ──────────────────────────────────────────────────────────────
reset role;
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.newsletters (title, issue_date, file_path, mime, size_bytes) values ('November 2026', '2026-11-01', '2026-11/nov.pdf', 'application/pdf', 1000);
insert into storage.objects (bucket_id, name) values ('newsletters', '2026-11/nov.pdf');
select 'N1 admin uploads a newsletter' t, (select count(*) from public.newsletters) = 1 as pass;
do $$ begin insert into public.newsletters (title, file_path, mime, size_bytes) values ('Bad', 'nov.pdf', 'application/pdf', 1); raise exception 'N2 FAIL';
exception when check_violation then raise notice 'N2 pass: file must sit in a yyyy-mm folder'; end $$;
reset role;
delete from public.course_access where student_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select 'N3 student without access sees no newsletters' t, (select count(*) from public.newsletters) = 0
  and (select count(*) from storage.objects where bucket_id = 'newsletters') = 0 as pass;
do $$ begin insert into public.newsletters (title, file_path, mime, size_bytes) values ('Mine', '2026-11/mine.pdf', 'application/pdf', 1); raise exception 'N4 FAIL';
exception when insufficient_privilege then raise notice 'N4 pass: students cannot add newsletters'; end $$;
reset role;
insert into public.course_access (student_id, course_id, source) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ai-for-students', 'admin');
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
select 'N5 enrolled student reads newsletters and files' t, (select count(*) from public.newsletters) = 1
  and (select count(*) from storage.objects where bucket_id = 'newsletters') = 1 as pass;
reset role;

-- ── Google Sheets sync ───────────────────────────────────────────────────────
reset role;
select 'E1 new sheet row creates a lead' t,
  r -> 0 ->> 'result' = 'created' and (r -> 0 ->> 'id') is not null as pass
  from (select public.sheet_upsert_leads('[{"row":2,"student":"Sheet Kid","grade":"8","phone":"98450 55555 (verify)","school":"SRVK","status":"Called","next_date":"Wed 11 Nov 2026","sheet":{"Join?":"Yes"}}]') r) x;
select 'E2 same phone+name without ID matches, no duplicate' t,
  r -> 0 ->> 'result' = 'matched' and (select count(*) from public.leads where phone = '+919845055555') = 1 as pass
  from (select public.sheet_upsert_leads('[{"row":2,"student":"Sheet Kid","phone":"9845055555","status":"Interested"}]') r) x;
select 'E3 edit by ID updates status and date' t,
  status = 'Interested' and next_date is null and sheet ->> 'Join?' = 'Yes' as pass
  from public.leads where phone = '+919845055555';
select 'E4 sibling on same phone is flagged' t,
  (r -> 0 ->> 'duplicate_phone')::boolean as pass
  from (select public.sheet_upsert_leads('[{"row":3,"student":"Sheet Sibling","phone":"9845055555"}]') r) x;
select 'E5 bad phone reports an error, saves nothing' t,
  r -> 0 ->> 'result' = 'error' as pass
  from (select public.sheet_upsert_leads('[{"row":4,"student":"No Phone","phone":"123"}]') r) x;
select 'E6 schools upsert creates a school' t,
  (public.sheet_upsert_schools('[{"row":2,"name":"Test School","calls":"3","visits":"x","next_date":"2026-11-11"}]') -> 0 ->> 'result') = 'created' as pass;
select 'E6b sheet cannot set calls/visits; date parsed' t, calls = 0 and visits = 0 and next_date = '2026-11-11' as pass from public.outreach_schools where name = 'Test School';
select 'E7 snapshot lists leads with system columns' t,
  jsonb_array_length(s -> 'leads') >= 2 and (s -> 'leads' -> 0) ? 'paid' and jsonb_array_length(s -> 'schools') = 1 as pass
  from (select public.sheet_snapshot() s) x;
set role authenticated; select pg_temp.as_user('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
do $$ begin perform public.sheet_snapshot(); raise exception 'E8 FAIL'; exception when insufficient_privilege then raise notice 'E8 pass: students cannot read the sheet snapshot'; end $$;
select 'E9 students see no outreach schools' t, (select count(*) from public.outreach_schools) = 0 as pass;
reset role;

-- ── Lead ↔ account link ──────────────────────────────────────────────────────
reset role;
select 'E10 unknown email is reported' t, public.sheet_link_lead((select id from public.leads where student_name = 'Sheet Kid'), 'nobody@example.com') = 'unknown_email' as pass;
select 'E11 link by email makes the lead signed up' t,
  public.sheet_link_lead((select id from public.leads where student_name = 'Sheet Kid'),
    (select email from auth.users u join public.profiles p on p.id = u.id where p.role = 'student' and u.email is not null limit 1)) = 'linked' as pass;
select 'E12 snapshot follows the link' t,
  (select (e ->> 'signed_up')::boolean and e ->> 'lms_email' is not null from jsonb_array_elements(public.sheet_snapshot() -> 'leads') e where e ->> 'student' = 'Sheet Kid') as pass;

-- ── Tabs and duplicate merge ─────────────────────────────────────────────────
reset role;
select 'E13 website lead saved' t, public.record_lead('web-merge-1', '9845077777', 'loki', 'Parent', null, 9::smallint) = 'saved' as pass;
select 'E13b and lands in the Website tab' t, public.lead_tab(tab, source, school_name) = 'Website' as pass from public.leads where reference = 'web-merge-1';
select 'E14 sheet row in a school tab with same phone links to it (no copy)' t,
  r -> 0 ->> 'result' = 'matched' and (select count(*) from public.leads where phone = '+919845077777') = 1 as pass
  from (select public.sheet_upsert_leads('[{"row":2,"tab":"Durga EMS","student":"Kiran","phone":"9845077777"}]') r) x;
select 'E15 matched lead moved to the school tab' t,
  public.lead_tab(tab, source, school_name) = 'Durga EMS' and student_name = 'Kiran' and school_name = 'Durga EMS' as pass
  from public.leads where phone = '+919845077777';
select 'E16 a later website copy is merged away' t,
  public.record_lead('web-merge-2', '9845077777', 'website', 'Parent 2', 'Kiran') = 'saved'
  and public.sheet_merge_duplicates() >= 1 and (select count(*) from public.leads where phone = '+919845077777') = 1 as pass;
select 'E17 merged lead keeps the school tab and fills the parent name' t,
  public.lead_tab(tab, source, school_name) = 'Durga EMS' and parent_name = 'Parent' as pass
  from public.leads where phone = '+919845077777';
select 'E18 two siblings saved' t, public.record_lead('sib-1', '9845088888', 'workshop', null, 'Asha', 8::smallint, 'SRVK') = 'saved'
  and public.record_lead('sib-2', '9845088888', 'workshop', null, 'Ravi', 9::smallint, 'SRVK') = 'saved' as pass;
select 'E18b merge leaves siblings alone' t, public.sheet_merge_duplicates() = 0 as pass;
select 'E18c both kept' t, count(*) = 2 as pass from public.leads where phone = '+919845088888';
select 'E19 sibling note names the other child' t,
  r -> 0 ->> 'siblings' like 'Ravi (SRVK)%' as pass
  from (select public.sheet_upsert_leads('[{"row":5,"tab":"SRVK","student":"Asha","phone":"9845088888"}]') r) x;

-- ── School outreach: Studio is the main record ──────────────────────────────
reset role;
insert into public.outreach_schools (name, calls, visits, history) values ('Studio School', 2, 1, '8 Nov: call');
create temp table g1 as select public.sheet_upsert_schools(jsonb_build_array(jsonb_build_object('row', 2, 'name', 'Studio School', 'status', 'Called',
    'calls', '99', 'visits', '99', 'history', 'wiped', 'id', id, 'version', updated_at))) r
  from public.outreach_schools where name = 'Studio School';
select 'I1 sheet edit with the current version saves, but not calls/visits/history' t,
  r -> 0 ->> 'result' = 'updated' and o.status = 'Called' and o.calls = 2 and o.visits = 1 and o.history = '8 Nov: call'
  and (r -> 0 ->> 'version')::timestamptz = o.updated_at as pass
  from g1, public.outreach_schools o where o.name = 'Studio School';
-- Studio changes the row after the sheet's last pull.
update public.outreach_schools set updated_at = now() + interval '1 minute', next_step = 'Studio step' where name = 'Studio School';
select 'I2 older sheet version is skipped' t, r -> 0 ->> 'result' = 'stale' as pass
  from (select public.sheet_upsert_schools(jsonb_build_array(jsonb_build_object('row', 2, 'name', 'Studio School', 'next_step', 'Sheet step',
          'id', id, 'version', updated_at - interval '1 minute'))) r from public.outreach_schools where name = 'Studio School') x;
select 'I2b Studio value kept' t, next_step = 'Studio step' as pass from public.outreach_schools where name = 'Studio School';
select 'I3 ID without a version is skipped' t, r -> 0 ->> 'result' = 'stale' as pass
  from (select public.sheet_upsert_schools(jsonb_build_array(jsonb_build_object('row', 2, 'name', 'Studio School', 'id', id))) r
        from public.outreach_schools where name = 'Studio School') x;
select 'I4 same name without ID links, does not overwrite' t,
  r -> 0 ->> 'result' = 'exists' and (select next_step from public.outreach_schools where name = 'Studio School') = 'Studio step' as pass
  from (select public.sheet_upsert_schools('[{"row":3,"name":"studio school","next_step":"x"}]') r) x;
select 'I5 new row typed in the sheet is created with a version' t,
  r -> 0 ->> 'result' = 'created' and r -> 0 ->> 'version' is not null as pass
  from (select public.sheet_upsert_schools('[{"row":4,"name":"Sheet New School","status":"Not contacted"}]') r) x;
select 'I6 snapshot carries updated_at for the version column' t,
  (select bool_and(e ? 'updated_at') from jsonb_array_elements(public.sheet_snapshot() -> 'schools') e) as pass;
select 'I7 edit to a school deleted in Studio does not bring it back' t,
  r -> 0 ->> 'result' = 'deleted' and not exists (select 1 from public.outreach_schools where name = 'Gone School') as pass
  from (select public.sheet_upsert_schools('[{"row":5,"name":"Gone School","id":"00000000-0000-0000-0000-00000000dead","version":"2026-11-08T00:00:00+00:00"}]') r) x;

-- ── Student scorecard + resource views ──────────────────────────────────────
reset role;
insert into public.module_resources (id, chapter_id, title, file_path, mime, size_bytes)
  values ('aaaaaaaa-0000-0000-0000-00000000f00d', pg_temp.chapter(0), 'Notes', pg_temp.chapter(0)::text || '/notes.pdf', 'application/pdf', 100);
set role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.log_resource_view('aaaaaaaa-0000-0000-0000-00000000f00d', 'open');
select public.log_resource_view('aaaaaaaa-0000-0000-0000-00000000f00d', 'open');
select public.log_resource_view('aaaaaaaa-0000-0000-0000-00000000f00d', 'download');
select 'Z1 student sees own resource view, counts add up' t, opens = 2 and downloads = 1 as pass from public.resource_views;
do $$ begin perform public.admin_student_scores(); raise exception 'Z2 FAIL'; exception when others then if sqlerrm like 'Z2%' then raise; end if; raise notice 'Z2 pass: %', sqlerrm; end $$;
do $$ begin perform public.admin_student_activity('11111111-1111-1111-1111-111111111111'); raise exception 'Z3 FAIL'; exception when others then if sqlerrm like 'Z3%' then raise; end if; raise notice 'Z3 pass: %', sqlerrm; end $$;
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select 'Z4 other student cannot see the view row' t, count(*) = 0 as pass from public.resource_views;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select public.log_resource_view('aaaaaaaa-0000-0000-0000-00000000f00d', 'open');
select 'Z5 admin opens are not logged' t, count(*) = 1 as pass from public.resource_views;
select 'Z6 scores list every student with a 0-100 score' t,
  jsonb_array_length(s) = (select count(*) from public.profiles where role = 'student')
  and (select bool_and((e->>'score')::int between 0 and 100) from jsonb_array_elements(s) e) as pass
  from (select public.admin_student_scores() s) x;
select 'Z7 student 11 has the resource counted and a score' t,
  (e->>'resources_opened')::int = 1 and (e->>'score')::int > 0 as pass
  from jsonb_array_elements(public.admin_student_scores()) e where e->>'student_id' = '11111111-1111-1111-1111-111111111111';
reset role;
update public.profiles set school_id = (select id from public.schools where code = 'TEST-ABC') where id = '11111111-1111-1111-1111-111111111111';
select set_config('bt.sc_school', (select id::text from public.schools where code = 'TEST-ABC'), false);
set role authenticated;
select 'Z8 school filter only returns that school' t,
  (select count(*) > 0 and bool_and(e->>'school_id' = current_setting('bt.sc_school')) from jsonb_array_elements(public.admin_student_scores(current_setting('bt.sc_school')::uuid)) e) as pass;
select 'Z9 school roll-up counts match' t,
  (select sum((e->>'students')::int) from jsonb_array_elements(public.admin_school_scores()) e) = (select count(*) from public.profiles where role = 'student') as pass;
select 'Z10 activity has timeline with resource + quiz' t,
  a->'timeline' @> '[{"kind":"resource_opened"}]' and jsonb_array_length(a->'quizzes') >= 0 and a->'summary'->>'student_id' is not null as pass
  from (select public.admin_student_activity('11111111-1111-1111-1111-111111111111') a) x;

-- ── Today: Studio lead logs flow back to the Workshop leads sheet ────────────
reset role;
create temp table f_ids as select (select id from public.leads where student_name = 'Sheet Kid') l;
grant select on f_ids to authenticated;
select 'Z21 sheet push marks leads as sheet' t, updated_source = 'sheet' as pass from public.leads, f_ids where id = l;
set role authenticated; select pg_temp.as_user('99999999-9999-9999-9999-999999999999');
do $$ begin perform public.admin_log_lead_contact((select l from f_ids), 'call', 'x'); raise exception 'Z22 FAIL'; exception when others then if sqlerrm like 'Z22%' then raise; end if; raise notice 'Z22 pass: non-admin cannot log a lead contact (%)', sqlerrm; end $$;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
do $$ begin perform public.admin_log_lead_contact((select l from f_ids), 'email', 'x'); raise exception 'Z23 FAIL'; exception when others then if sqlerrm like 'Z23%' then raise; end if; raise notice 'Z23 pass: bad channel refused (%)', sqlerrm; end $$;
select 'Z24 lead contact logged' t, public.admin_log_lead_contact(l, 'whatsapp', 'Sent fee details', 'Interested', 'Call back', '2026-11-10', null) ->> 'note_id' is not null as pass from f_ids;
select 'Z25 note with 10:00 IST follow-up' t, channel = 'whatsapp' and body = 'Sent fee details' and follow_up_at = '2026-11-10 04:30:00+00' and done_at is null as pass
  from public.crm_notes, f_ids where lead_id = l order by created_at desc limit 1;
select 'Z26 lead fields and source' t, status = 'Interested' and next_step = 'Call back' and next_date = '2026-11-10' and not do_not_contact and updated_source = 'studio' as pass
  from public.leads, f_ids where id = l;
select 'Z27 do not contact set' t, (public.admin_log_lead_contact(l, 'call', '', null, null, null, true) ->> 'do_not_contact')::boolean as pass from f_ids;
select 'Z27b empty note gets a label, status kept' t, (select body from public.crm_notes where lead_id = l order by created_at desc limit 1) = 'Call'
  and (select status from public.leads where id = l) = 'Interested' as pass from f_ids;
reset role;
select 'Z28 snapshot carries updated_source' t,
  (select e ->> 'updated_source' = 'studio' and e ? 'updated_at' from jsonb_array_elements(public.sheet_snapshot() -> 'leads') e where e ->> 'student' = 'Sheet Kid') as pass;
select 'Z29 edit to Status in a stale row' t,
  (public.sheet_upsert_leads(jsonb_build_array(jsonb_build_object('row', 2, 'id', l, 'student', 'Sheet Kid', 'phone', '9845055555', 'status', 'Will join', 'do_not_contact', false, 'touched', '["status"]'::jsonb))) -> 0 ->> 'result') = 'updated' as pass from f_ids;
select 'Z29b status taken, do-not-contact and next step kept, still studio' t,
  (select status = 'Will join' and do_not_contact and next_step = 'Call back' and updated_source = 'studio' from public.leads where id = l) as pass from f_ids;
select 'Z30 full push without touched is the sheet' t,
  (public.sheet_upsert_leads(jsonb_build_array(jsonb_build_object('row', 2, 'id', l, 'student', 'Sheet Kid', 'phone', '9845055555', 'status', 'Will join', 'do_not_contact', true))) -> 0 ->> 'result') = 'updated' as pass from f_ids;
select 'Z30b source sheet' t, (select updated_source = 'sheet' and do_not_contact from public.leads where id = l) as pass from f_ids;
select 'Z11 school started_module0 never exceeds students' t,
  (select bool_and((e->>'started_module0')::int <= (e->>'students')::int) from jsonb_array_elements(public.admin_school_scores()) e) as pass;
