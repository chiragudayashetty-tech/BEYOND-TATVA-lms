-- Audit 2026-11-09: the LMS (Razorpay) is the only payment path.
--  1. payment_orders: every Razorpay order the LMS creates, tied to the signed-in account that created it.
--  2. settle_payment / refund_payment: one idempotent path used by both the checkout callback and the
--     Razorpay webhook. A payment unlocks through record_purchase (verified login match), so paying
--     before onboarding still waits and is claimed later, exactly as before.
--  3. webhook_events: each Razorpay event id counts once (replays return 'duplicate').
--  4. otp_sends + otp_send_allowed: WhatsApp login code limits (60 s cooldown, 5 per phone per hour).
--  5. admin_payment_exceptions: paid but not unlocked, refunded but still has access.

alter table public.purchases drop constraint if exists purchases_source_check;
alter table public.purchases add constraint purchases_source_check check (source in ('website', 'manual', 'lms'));

create table public.payment_orders (
  id text primary key,                                         -- Razorpay order id (order_...)
  user_id uuid references auth.users (id) on delete set null,  -- the account that started checkout (may have no profile yet)
  course_id text not null references public.courses (id),
  amount_paise int not null check (amount_paise >= 100),
  coupon_code text,
  login_email text,                                            -- the buyer's own verified login, used to unlock
  login_phone text,
  student_name text,
  status text not null default 'created' check (status in ('created', 'paid', 'refunded')),
  payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  constraint payment_orders_login check (login_email is not null or login_phone is not null)
);
create index on public.payment_orders (user_id);
create index on public.payment_orders (status) where status <> 'created';

create table public.webhook_events (
  id text primary key,                                         -- '<source>:<event id>'
  received_at timestamptz not null default now()
);

create table public.otp_sends (
  id bigint generated always as identity primary key,
  phone text not null,
  sent_at timestamptz not null default now()
);
create index on public.otp_sends (phone, sent_at);

alter table public.payment_orders enable row level security;
alter table public.webhook_events enable row level security;
alter table public.otp_sends enable row level security;
create policy "admins read payment orders" on public.payment_orders for select to authenticated
  using ((select public.is_admin()));
-- webhook_events and otp_sends: no policies; only the service role touches them.

-- Records a new order (server, after Razorpay created it).
create function public.create_payment_order(
  p_order_id text, p_user uuid, p_course text, p_amount_paise int, p_coupon text,
  p_email text, p_phone text, p_student_name text
) returns void
language sql security definer set search_path = '' as $$
  insert into public.payment_orders (id, user_id, course_id, amount_paise, coupon_code, login_email, login_phone, student_name)
  values (p_order_id, p_user, p_course, p_amount_paise, nullif(p_coupon, ''), nullif(lower(trim(p_email)), ''),
          public.normalize_phone(p_phone), nullif(trim(p_student_name), ''));
$$;

-- Marks an order paid and unlocks it. p_event_id: Razorpay event id (webhook) or null (checkout callback).
-- p_amount_paise: amount Razorpay says was paid, or null when the checkout signature already proves it.
-- Returns duplicate | unknown_order | already_refunded | amount_mismatch | claimed | already_claimed | pending | second_payment.
create function public.settle_payment(p_order_id text, p_payment_id text, p_amount_paise int, p_event_id text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare v public.payment_orders; r text;
begin
  if p_event_id is not null then
    insert into public.webhook_events (id) values ('razorpay:' || p_event_id) on conflict do nothing;
    if not found then return 'duplicate'; end if;
  end if;
  select * into v from public.payment_orders where id = p_order_id for update;
  if v.id is null then return 'unknown_order'; end if;
  if v.status = 'refunded' then return 'already_refunded'; end if;
  if p_amount_paise is not null and p_amount_paise < v.amount_paise then return 'amount_mismatch'; end if;
  if v.payment_id is not null and v.payment_id <> p_payment_id then return 'second_payment'; end if;  -- another payment on an already-paid order
  update public.payment_orders set status = 'paid', payment_id = p_payment_id, paid_at = coalesce(paid_at, now()) where id = v.id;
  r := public._record_purchase(p_payment_id, v.login_email, v.login_phone, v.student_name, null, v.amount_paise, v.course_id, 'lms', null);
  return case r when 'duplicate' then 'pending' else r end;
end;
$$;

-- Full refund: removes the access this payment gave. Partial refunds change nothing.
create function public.refund_payment(p_payment_id text, p_full boolean, p_event_id text default null)
returns text
language plpgsql security definer set search_path = '' as $$
begin
  if p_event_id is not null then
    insert into public.webhook_events (id) values ('razorpay:' || p_event_id) on conflict do nothing;
    if not found then return 'duplicate'; end if;
  end if;
  if not coalesce(p_full, false) then return 'partial_refund'; end if;
  update public.payment_orders set status = 'refunded', refunded_at = coalesce(refunded_at, now()) where payment_id = p_payment_id;
  return public.revoke_purchase(p_payment_id);
end;
$$;

-- WhatsApp login codes: true (and counted) when this phone may get another code now.
create function public.otp_send_allowed(p_phone text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.normalize_phone(p_phone);
begin
  if v_phone is null then return 'invalid'; end if;
  delete from public.otp_sends where sent_at < now() - interval '1 day';
  if exists (select 1 from public.otp_sends where phone = v_phone and sent_at > now() - interval '60 seconds') then return 'cooldown'; end if;
  if (select count(*) from public.otp_sends where phone = v_phone and sent_at > now() - interval '1 hour') >= 5 then return 'hourly_limit'; end if;
  insert into public.otp_sends (phone) values (v_phone);
  return 'ok';
end;
$$;

-- Studio: payments that need a human. Paid more than 30 minutes ago but not unlocked
-- (includes buyers who never finished onboarding), and refunded orders whose buyer still has access.
create function public.admin_payment_exceptions()
returns table (kind text, order_id text, payment_id text, student_id uuid, student_name text, login text,
               amount_paise int, paid_at timestamptz, refunded_at timestamptz, access_source text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Studio admins only'; end if;
  return query
  select 'paid_not_unlocked'::text, o.id, o.payment_id, o.user_id, o.student_name, coalesce(o.login_email, o.login_phone),
         o.amount_paise, o.paid_at, o.refunded_at, null::text
  from public.payment_orders o
  left join public.purchases p on p.reference = o.payment_id
  where o.status = 'paid' and o.paid_at < now() - interval '30 minutes'
    and (p.id is null or p.status <> 'claimed'
         or not exists (select 1 from public.course_access a where a.student_id = p.claimed_by and a.course_id = o.course_id))
  union all
  select 'refunded_with_access', o.id, o.payment_id, a.student_id, o.student_name, coalesce(o.login_email, o.login_phone),
         o.amount_paise, o.paid_at, o.refunded_at, a.source
  from public.payment_orders o
  join public.purchases p on p.reference = o.payment_id
  join public.course_access a on a.course_id = o.course_id and a.student_id = coalesce(p.claimed_by, o.user_id)
  where o.status = 'refunded'
  order by 8 desc nulls last;
end;
$$;

revoke execute on function public.create_payment_order, public.settle_payment, public.refund_payment,
  public.otp_send_allowed, public.admin_payment_exceptions from public, anon, authenticated;
grant execute on function public.create_payment_order, public.settle_payment, public.refund_payment,
  public.otp_send_allowed to service_role;
grant execute on function public.admin_payment_exceptions to authenticated;
