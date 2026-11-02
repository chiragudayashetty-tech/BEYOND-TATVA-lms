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
select 'G2 stats: week of 7 days, streak, answers' t,
  jsonb_array_length(s -> 'week') = 7 and (s ->> 'streak')::int = 1 and (s ->> 'best_streak')::int = 1
  and (s ->> 'checks_answered')::int >= 1 and (s ->> 'minutes_this_week')::int between 1 and 2
  and jsonb_array_length(s -> 'active_days') = 1 as pass
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
select 'G5 streak counts consecutive days; best streak kept' t,
  (s ->> 'streak')::int = 3 and (s ->> 'best_streak')::int = 3 and (s ->> 'minutes_this_week')::int between 31 and 32 as pass
  from (select public.my_learning_stats() as s) x;
reset role;
