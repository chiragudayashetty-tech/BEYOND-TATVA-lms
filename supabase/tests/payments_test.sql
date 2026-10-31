-- Behaviour tests for onboarding and payments. Every line starting with a test id must end in "| t".
\set ON_ERROR_STOP 1
-- users
insert into auth.users values ('11111111-1111-1111-1111-111111111111','solo@x.in'),('22222222-2222-2222-2222-222222222222','dup@x.in'),
 ('33333333-3333-3333-3333-333333333333','admin@x.in'),('44444444-4444-4444-4444-444444444444','school@x.in'),('55555555-5555-5555-5555-555555555555','bad@x.in');
insert into public.schools (name, code, teacher_code) values ('St Test','TEST-ABC','TEST-T-XYZ');
insert into public.profiles (id, role, full_name) values ('33333333-3333-3333-3333-333333333333','admin','Admin');

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub', u, false) $$;

-- T1: individual student with no school code
set role authenticated; select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select public.complete_onboarding('student','Solo Student',null,9::smallint,'Mom','098450 12345','Udupi Public School');
select 'T1 phone normalised' t, guardian_phone = '+919845012345' and school_id is null and school_name='Udupi Public School' as pass from public.profiles where id = auth.uid();
-- T2: student with school code still works and enrols
select pg_temp.as_user('44444444-4444-4444-4444-444444444444');
select public.complete_onboarding('student','School Kid','test-abc',8::smallint,'Dad','+91 99000 11223');
select 'T2 school code' t, school_id is not null as pass from public.profiles where id = auth.uid();
-- T3: bad school code / bad phone rejected
select pg_temp.as_user('55555555-5555-5555-5555-555555555555');
do $$ begin perform public.complete_onboarding('student','X','NOPE',8::smallint,'D','9900011223'); raise exception 'T3a FAIL';
exception when others then if sqlerrm like 'T3a%' then raise; end if; raise notice 'T3a pass: %', sqlerrm; end $$;
do $$ begin perform public.complete_onboarding('student','X',null,8::smallint,'D','12345'); raise exception 'T3b FAIL';
exception when others then if sqlerrm like 'T3b%' then raise; end if; raise notice 'T3b pass: %', sqlerrm; end $$;
do $$ begin perform public.complete_onboarding('student','X',null,null,'D','9900011223'); raise exception 'T3c FAIL';
exception when others then if sqlerrm like 'T3c%' then raise; end if; raise notice 'T3c pass: %', sqlerrm; end $$;
-- T4: authenticated users cannot call apply_payment_event, cannot write orders, cannot read coupons
do $$ begin perform public.apply_payment_event(null,'checkout.verified','order_x','pay_x',99900); raise exception 'T4a FAIL';
exception when insufficient_privilege then raise notice 'T4a pass: %', sqlerrm; end $$;
do $$ begin insert into public.payment_orders (id, student_id, course_id, amount_paise, list_price_paise, parent_consent_at) values ('order_evil', auth.uid(), 'ai-for-students', 1, 1, now()); raise exception 'T4b FAIL';
exception when insufficient_privilege then raise notice 'T4b pass: %', sqlerrm; end $$;
select 'T4c coupons hidden' t, count(*) = 0 as pass from public.coupons;
reset role;

-- service role creates orders (as the API route does)
set role service_role;
insert into public.payment_orders (id, student_id, course_id, amount_paise, list_price_paise, coupon_code, parent_consent_at) values
 ('order_A','11111111-1111-1111-1111-111111111111','ai-for-students',94905,99900,'LOKI5',now()),
 ('order_B','44444444-4444-4444-4444-444444444444','ai-for-students',99900,99900,null,now());
-- T5: underpayment refused
select 'T5 amount mismatch' t, public.apply_payment_event('evt_0','payment.captured','order_A','pay_A',100) = 'amount_mismatch' as pass;
-- T6: grant via checkout callback then webhook; duplicate webhook ignored
select 'T6a verified' t, public.apply_payment_event(null,'checkout.verified','order_A','pay_A',null) = 'granted' as pass;
select 'T6b webhook' t, public.apply_payment_event('evt_1','payment.captured','order_A','pay_A',94905) = 'granted' as pass;
select 'T6c duplicate' t, public.apply_payment_event('evt_1','payment.captured','order_A','pay_A',94905) = 'duplicate' as pass;
select 'T6d order.paid' t, public.apply_payment_event('evt_2','order.paid','order_A','pay_A',94905) = 'granted' as pass;
select 'T6e one access row' t, count(*) = 1 and bool_and(source='payment' and reference='pay_A') as pass from public.course_access where student_id='11111111-1111-1111-1111-111111111111';
select 'T6f order paid' t, status='paid' and payment_id='pay_A' and paid_at is not null as pass from public.payment_orders where id='order_A';
-- T7: unknown order
select 'T7 unknown' t, public.apply_payment_event('evt_3','payment.captured','order_ZZZ','pay_Z',1) = 'unknown_order' as pass;
-- T8: failed attempt then success on order_B
select 'T8a failed' t, public.apply_payment_event('evt_4','payment.failed','order_B','pay_Bfail',null) = 'failed' as pass;
select 'T8b retry ok' t, public.apply_payment_event('evt_5','payment.captured','order_B','pay_B',99900) = 'granted' as pass;
select 'T8c pay id' t, payment_id = 'pay_B' as pass from public.payment_orders where id='order_B';
reset role;

-- T9: student reads own orders only; sees access
set role authenticated; select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select 'T9a own orders only' t, count(*) = 1 as pass from public.payment_orders;
select 'T9b has access' t, public.has_course_access('ai-for-students') as pass;
select 'T9c paid lesson visible' t, count(*) > 0 as pass from public.lesson_media m join public.lessons l on l.id=m.lesson_id join public.chapters c on c.id=l.chapter_id where not c.is_free and c.release_at <= now();
-- T10: non-admin cannot move access
do $$ begin perform public.admin_move_access('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444'); raise exception 'T10 FAIL';
exception when others then if sqlerrm like 'T10%' then raise; end if; raise notice 'T10 pass: %', sqlerrm; end $$;
reset role;

-- T11: admin moves access from duplicate account; refund still revokes it on the new account
set role service_role; insert into public.profiles (id, role, full_name, grade, guardian_name, guardian_phone) values ('22222222-2222-2222-2222-222222222222','student','Dup',9,'Mom','+919845012345'); reset role;
set role authenticated; select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select 'T11a moved' t, public.admin_move_access('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222') = 1 as pass;
reset role;
select 'T11b access on new' t, (select count(*) from public.course_access where student_id='22222222-2222-2222-2222-222222222222') = 1
  and (select count(*) from public.course_access where student_id='11111111-1111-1111-1111-111111111111') = 0
  and (select student_id from public.payment_orders where id='order_A') = '22222222-2222-2222-2222-222222222222' as pass;
set role service_role;
select 'T12a partial refund keeps access' t, public.apply_payment_event('evt_6','refund.processed',null,'pay_A',1000,false) = 'partial_refund' as pass;
select 'T12b full refund revokes' t, public.apply_payment_event('evt_7','refund.processed',null,'pay_A',94905,true) = 'revoked' as pass;
select 'T12c no access' t, count(*) = 0 as pass from public.course_access where student_id='22222222-2222-2222-2222-222222222222';
select 'T12d replayed capture does not regrant' t, public.apply_payment_event('evt_8','payment.captured','order_A','pay_A',94905) = 'already_refunded' as pass;
select 'T12e order refunded' t, status = 'refunded' as pass from public.payment_orders where id='order_A';
-- T13: refund of a payment never revokes a key-based access
insert into public.course_access (student_id, course_id, source, reference) values ('11111111-1111-1111-1111-111111111111','ai-for-students','key','BT-1234-5678');
insert into public.payment_orders (id, student_id, course_id, amount_paise, list_price_paise, parent_consent_at) values ('order_C','11111111-1111-1111-1111-111111111111','ai-for-students',99900,99900,now());
select public.apply_payment_event('evt_9','payment.captured','order_C','pay_C',99900);
select public.apply_payment_event('evt_10','payment.refunded','order_C','pay_C',99900,true);
select 'T13 key access kept' t, count(*) = 1 as pass from public.course_access where student_id='11111111-1111-1111-1111-111111111111' and source='key';
select 'T14 events logged' t, count(*) = 11 and count(*) filter (where outcome is null) = 0 as pass from public.payment_events;
reset role;
