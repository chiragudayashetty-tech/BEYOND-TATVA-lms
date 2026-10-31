-- Individual (B2C) students and online payments.
-- 1. Students can sign up without a school code (school is optional; parent phone is still required).
-- 2. Razorpay orders are created for a signed-in student; a webhook (or the checkout's signed callback)
--    grants course_access with source 'payment'. A full refund revokes it. Every step is idempotent.
-- 3. Admins can move a student's access to another account (for duplicate sign-ups).

-- ── 1. School is optional for students ───────────────────────────────────────

alter table public.profiles drop constraint student_fields;
alter table public.profiles add constraint student_fields check (
  role <> 'student' or (grade is not null and guardian_name is not null and guardian_phone is not null)
);
-- What an individual student types instead of a school code (free text, for our records only).
alter table public.profiles add column school_name text check (char_length(school_name) <= 120);

drop function public.complete_onboarding(text, text, text, smallint, text, text);

create function public.complete_onboarding(
  p_role text,
  p_full_name text,
  p_code text default null,
  p_grade smallint default null,
  p_guardian_name text default null,
  p_guardian_phone text default null,
  p_school_name text default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_school uuid;
  v_student uuid;
  v_invite text;
  v_phone text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then raise exception 'Profile already set up'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Enter your full name'; end if;

  if p_role = 'student' then
    -- A school code is optional: school students use it, individual students leave it empty.
    if coalesce(trim(p_code), '') <> '' then
      select id into v_school from public.schools where upper(code) = upper(trim(p_code));
      if v_school is null then raise exception 'That school code doesn''t match any school. Leave it empty if you joined on your own.'; end if;
    end if;
    if p_grade is null or p_grade not between 8 and 10 then raise exception 'Grade must be 8, 9 or 10'; end if;
    if coalesce(trim(p_guardian_name), '') = '' or coalesce(trim(p_guardian_phone), '') = '' then
      raise exception 'A parent or guardian''s name and phone are required';
    end if;
    -- Indian mobile numbers, stored as +91XXXXXXXXXX so WhatsApp messages can use them as-is.
    v_phone := regexp_replace(p_guardian_phone, '\D', '', 'g');
    if length(v_phone) = 12 and left(v_phone, 2) = '91' then v_phone := right(v_phone, 10); end if;
    if length(v_phone) = 11 and left(v_phone, 1) = '0' then v_phone := right(v_phone, 10); end if;
    if v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a valid 10-digit Indian mobile number for your parent'; end if;

    v_invite := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    insert into public.profiles (id, role, full_name, school_id, school_name, grade, guardian_name, guardian_phone, invite_code)
    values (v_uid, 'student', trim(p_full_name), v_school, nullif(trim(p_school_name), ''), p_grade,
            trim(p_guardian_name), '+91' || v_phone, v_invite);
    if v_school is not null then
      insert into public.enrollments (class_id, student_id)
      select id, v_uid from public.classes where school_id = v_school and grade = p_grade
      order by created_at limit 1;
    end if;

  elsif p_role = 'teacher' then
    select id into v_school from public.schools where upper(teacher_code) = upper(trim(p_code));
    if v_school is null then raise exception 'That teacher code doesn''t match any school'; end if;
    insert into public.profiles (id, role, full_name, school_id) values (v_uid, 'teacher', trim(p_full_name), v_school);

  elsif p_role = 'parent' then
    select id into v_student from public.profiles where role = 'student' and invite_code = upper(trim(p_code));
    if v_student is null then raise exception 'That child code doesn''t match any student'; end if;
    insert into public.profiles (id, role, full_name) values (v_uid, 'parent', trim(p_full_name));
    insert into public.guardians (parent_id, student_id) values (v_uid, v_student);
    update public.profiles set guardian_consent_at = coalesce(guardian_consent_at, now()) where id = v_student;

  else
    raise exception 'Choose student, parent or teacher';
  end if;

  return p_role;
end;
$$;

revoke execute on function public.complete_onboarding from public, anon;
grant execute on function public.complete_onboarding to authenticated;

-- ── 2. Payments ──────────────────────────────────────────────────────────────

-- Discount codes, checked on the server when an order is created.
create table public.coupons (
  code text primary key check (code = upper(code)),
  percent_off int not null check (percent_off between 1 and 100),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
insert into public.coupons (code, percent_off) values ('LOKI5', 5);

-- One row per Razorpay order. student_id survives account deletion as null so money records stay.
create table public.payment_orders (
  id text primary key,                                   -- Razorpay order id (order_...)
  student_id uuid references public.profiles (id) on delete set null,
  course_id text not null references public.courses (id),
  amount_paise int not null check (amount_paise > 0),
  list_price_paise int not null,
  coupon_code text references public.coupons (code),
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'refunded')),
  payment_id text unique,                                -- Razorpay payment id (pay_...) once paid
  parent_consent_at timestamptz not null,                -- parent's consent ticked before paying
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);
create index on public.payment_orders (student_id);

-- Webhook deliveries we have processed. Razorpay retries; the event id makes each one count once.
create table public.payment_events (
  id text primary key,                                   -- x-razorpay-event-id header
  event text not null,
  order_id text,
  payment_id text,
  outcome text,
  payload jsonb,
  received_at timestamptz not null default now()
);

alter table public.coupons enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;

create policy "admins manage coupons" on public.coupons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "read own orders" on public.payment_orders for select to authenticated
  using (student_id = (select auth.uid()) or (select public.is_admin()));
create policy "admins read payment events" on public.payment_events for select to authenticated
  using ((select public.is_admin()));
-- No insert/update policies: only the server (service role) writes orders and events.

-- Applies one payment event. Called by the server with the service role, after it has verified
-- Razorpay's signature. Safe to call any number of times for the same payment.
--   p_event: 'payment.captured' | 'order.paid' | 'checkout.verified' grant access,
--            'refund.processed' | 'payment.refunded' revoke it (full refunds only),
--            'payment.failed' marks an unpaid order failed.
create function public.apply_payment_event(
  p_event_id text,          -- webhook event id; null for the checkout callback
  p_event text,
  p_order_id text,
  p_payment_id text,
  p_amount_paise int,       -- amount actually paid (grant) or refunded so far (refund)
  p_full_refund boolean default false,
  p_payload jsonb default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.payment_orders;
  v_outcome text;
begin
  if p_event_id is not null then
    insert into public.payment_events (id, event, order_id, payment_id, payload)
    values (p_event_id, p_event, p_order_id, p_payment_id, p_payload)
    on conflict (id) do nothing;
    if not found then return 'duplicate'; end if;
  end if;

  if p_order_id is not null then
    select * into v_order from public.payment_orders where id = p_order_id for update;
  elsif p_payment_id is not null then
    select * into v_order from public.payment_orders where payment_id = p_payment_id for update;
  end if;

  if v_order.id is null then
    v_outcome := 'unknown_order';
  elsif p_event in ('payment.captured', 'order.paid', 'checkout.verified') then
    if v_order.status = 'refunded' then
      v_outcome := 'already_refunded';
    elsif p_amount_paise is not null and p_amount_paise < v_order.amount_paise then
      v_outcome := 'amount_mismatch';
    else
      update public.payment_orders
      set status = 'paid', payment_id = coalesce(payment_id, p_payment_id), paid_at = coalesce(paid_at, now())
      where id = v_order.id;
      if v_order.student_id is null then
        v_outcome := 'no_student';
      else
        insert into public.course_access (student_id, course_id, source, reference)
        values (v_order.student_id, v_order.course_id, 'payment', coalesce(v_order.payment_id, p_payment_id))
        on conflict (student_id, course_id) do nothing;
        v_outcome := 'granted';
      end if;
    end if;
  elsif p_event in ('refund.processed', 'payment.refunded') then
    if not coalesce(p_full_refund, false) then
      v_outcome := 'partial_refund';
    else
      update public.payment_orders set status = 'refunded', refunded_at = coalesce(refunded_at, now()) where id = v_order.id;
      -- Remove only the access this payment gave, wherever an admin may have moved it.
      delete from public.course_access
      where course_id = v_order.course_id and source = 'payment'
        and reference = coalesce(v_order.payment_id, p_payment_id);
      v_outcome := 'revoked';
    end if;
  elsif p_event = 'payment.failed' then
    update public.payment_orders set status = 'failed' where id = v_order.id and status = 'created';
    v_outcome := 'failed';
  else
    v_outcome := 'ignored';
  end if;

  if p_event_id is not null then
    update public.payment_events set outcome = v_outcome, order_id = coalesce(order_id, v_order.id) where id = p_event_id;
  end if;
  return v_outcome;
end;
$$;

revoke execute on function public.apply_payment_event from public, anon, authenticated;
grant execute on function public.apply_payment_event to service_role;

-- ── 3. Admin: move access between duplicate accounts ─────────────────────────

create function public.admin_move_access(p_from uuid, p_to uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_moved int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_from = p_to then raise exception 'Pick two different accounts'; end if;
  if not exists (select 1 from public.profiles where id = p_to and role = 'student') then
    raise exception 'The account you are moving access to must be a student';
  end if;
  update public.course_access a set student_id = p_to
  where a.student_id = p_from
    and not exists (select 1 from public.course_access b where b.student_id = p_to and b.course_id = a.course_id);
  get diagnostics v_moved = row_count;
  delete from public.course_access where student_id = p_from;   -- target already had these courses
  update public.payment_orders set student_id = p_to where student_id = p_from;
  update public.access_keys set redeemed_by = p_to where redeemed_by = p_from;
  return v_moved;
end;
$$;

revoke execute on function public.admin_move_access from public, anon;
grant execute on function public.admin_move_access to authenticated;
