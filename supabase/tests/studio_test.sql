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
select public.complete_onboarding('student', 'Solo Student', null, 9::smallint, 'Mom', '098450 12345', 'Udupi Public School');
select 'T1 phone normalised' t, guardian_phone = '+919845012345' and school_id is null and school_name = 'Udupi Public School' as pass from public.profiles where id = auth.uid();
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select public.complete_onboarding('student', 'School Kid', 'test-abc', 8::smallint, 'Dad', '+91 99000 11224');
select 'T2 school code' t, school_id is not null as pass from public.profiles where id = auth.uid();
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
do $$ begin perform public.complete_onboarding('student', 'X', 'NOPE', 8::smallint, 'D', '9900011223'); raise exception 'T3a FAIL';
exception when others then if sqlerrm like 'T3a%' then raise; end if; raise notice 'T3a pass: %', sqlerrm; end $$;
do $$ begin perform public.complete_onboarding('student', 'X', null, 8::smallint, 'D', '12345'); raise exception 'T3b FAIL';
exception when others then if sqlerrm like 'T3b%' then raise; end if; raise notice 'T3b pass: %', sqlerrm; end $$;
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select public.complete_onboarding('student', 'Sibling One', null, 8::smallint, 'Same Parent', '9876500000');
select pg_temp.as_user('77777777-7777-7777-7777-777777777777');
select public.complete_onboarding('student', 'Sibling Two', null, 10::smallint, 'Same Parent', '9876500000');
select pg_temp.as_user('88888888-8888-8888-8888-888888888888');
select public.complete_onboarding('student', 'Phone Login Kid', null, 9::smallint, 'P', '9811111111');
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
select 'P6 parent phone given at sign-up matches one student' t, public.record_purchase('pay_5', 'someoneelse@x.in', '9900011224') = 'claimed' as pass;
do $$ begin perform public.record_purchase('pay_bad', null, '123'); raise exception 'P7 FAIL'; exception when others then if sqlerrm like 'P7%' then raise; end if; raise notice 'P7 pass: %', sqlerrm; end $$;
select 'P8 access rows' t, (select count(*) from public.course_access where source = 'payment') = 3 as pass;
reset role;

-- The buyer of pay_2 signs up later with that email: access appears on first sign-in.
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'newkid@gmail.com');
set role authenticated; select pg_temp.as_user('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select public.complete_onboarding('student', 'New Kid', null, 9::smallint, 'P', '9845077777');
select 'P9a claim on sign-in' t, public.claim_purchases() = 1 as pass;
select 'P9b course unlocked' t, public.has_course_access('ai-for-students') as pass;
select 'P10 nothing left to claim' t, public.claim_purchases() = 0 as pass;
-- Siblings: the first to sign in takes the one seat; the other gets nothing.
select pg_temp.as_user('66666666-6666-6666-6666-666666666666');
select 'P11 first sibling claims' t, public.claim_purchases() = 1 as pass;
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
insert into storage.objects (bucket_id, name) values ('submissions', '44444444-4444-4444-4444-444444444444/x/photo.jpg');
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
select 'Z1 Studio numbers' t, (s ->> 'to_review')::int = 0 and (s ->> 'enrollments_claimed')::int >= 5 as pass from (select public.admin_stats() as s) x;
reset role;
