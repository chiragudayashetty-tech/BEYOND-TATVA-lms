-- Coupons for interim UPI payments: a code with a fixed price, valid between two times (e.g. workshop day + 2 days).
-- The price is always taken from the coupon on the server; the browser only displays it.

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  course_id text not null references public.courses (id) default 'ai-for-students',
  price_inr int not null check (price_inr between 1 and 100000),
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint coupon_window check (valid_until > valid_from)
);
create index coupons_course_idx on public.coupons (course_id);
create index coupons_created_by_idx on public.coupons (created_by);
alter table public.coupons enable row level security;
create policy "admins manage coupons" on public.coupons for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Students never read the table; they check one code at a time through coupon_price.

alter table public.upi_claims add column coupon_code text;

-- Price for a code right now, or null if it doesn't exist, expired or is switched off.
create or replace function public.coupon_price(p_code text, p_course text default 'ai-for-students') returns int
language sql stable security definer set search_path = '' as $$
  select price_inr from public.coupons
  where code = upper(trim(coalesce(p_code, ''))) and course_id = p_course and active and now() between valid_from and valid_until;
$$;

drop function public.submit_upi_claim(text, text, text, text);
create function public.submit_upi_claim(p_proof text, p_utr text default null, p_payer_name text default null,
  p_course text default 'ai-for-students', p_coupon text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_utr text := nullif(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'), '');
  v_code text := nullif(upper(trim(coalesce(p_coupon, ''))), '');
  v_price int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then raise exception 'Only students can unlock the course'; end if;
  if split_part(coalesce(p_proof, ''), '/', 1) <> v_uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'payment-proofs' and name = p_proof) then
    raise exception 'Please upload the payment screenshot first';
  end if;
  if v_utr is not null and v_utr !~ '^[0-9]{12}$' then raise exception 'The UPI reference (UTR) is the 12-digit number in your payment app'; end if;
  if v_utr is not null and exists (select 1 from public.upi_claims where utr = v_utr) then raise exception 'This UPI reference was already submitted. Message us if this is a mistake.'; end if;
  if public.has_course_access(p_course) then return 'already_unlocked'; end if;
  if exists (select 1 from public.upi_claims where student_id = v_uid and status = 'pending') then return 'already_pending'; end if;
  if (select count(*) from public.upi_claims where student_id = v_uid and created_at > now() - interval '1 day') >= 3 then
    raise exception 'Too many tries today. Please message us.';
  end if;
  if v_code is not null then
    v_price := public.coupon_price(v_code, p_course);
    if v_price is null then raise exception 'That coupon code is not valid or has expired'; end if;
  else
    select price_inr into v_price from public.courses where id = p_course;
  end if;
  if v_price is null then raise exception 'Course not found'; end if;
  insert into public.upi_claims (student_id, course_id, amount_paise, utr, proof_path, payer_name, coupon_code)
  values (v_uid, p_course, v_price * 100, v_utr, p_proof, nullif(left(trim(coalesce(p_payer_name, '')), 80), ''), v_code);
  return 'submitted';
end;
$$;

revoke execute on function public.coupon_price(text, text), public.submit_upi_claim(text, text, text, text, text) from public, anon;
grant execute on function public.coupon_price(text, text), public.submit_upi_claim(text, text, text, text, text) to authenticated;
