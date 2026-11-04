-- Interim payments until Razorpay: the parent pays by UPI straight to Beyond Tatva's account and enters
-- uploads the payment screenshot (and optionally the 12-digit UPI reference, UTR). An admin checks it against the bank app and approves; approval unlocks
-- the course and records a purchase (source 'manual', reference 'upi-<UTR>') so revenue analytics count it.

create table public.upi_claims (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  course_id text not null references public.courses (id),
  amount_paise int not null check (amount_paise > 0),
  utr text unique check (utr ~ '^[0-9]{12}$'),
  proof_path text not null unique check (split_part(proof_path, '/', 1) = student_id::text),
  payer_name text check (char_length(payer_name) <= 80),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text check (char_length(note) <= 200),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index upi_claims_student_idx on public.upi_claims (student_id);
create index upi_claims_course_idx on public.upi_claims (course_id);
create index upi_claims_decided_by_idx on public.upi_claims (decided_by);
create index upi_claims_pending_idx on public.upi_claims (created_at) where status = 'pending';

alter table public.upi_claims enable row level security;
create policy "admins manage upi claims" on public.upi_claims for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "students read own upi claims" on public.upi_claims for select to authenticated
  using (student_id = (select auth.uid()));
-- No student write policy: claims are created only through submit_upi_claim.

-- Private bucket for payment screenshots: {student id}/{file}. The student uploads their own; admins read all.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;
create policy "students upload own payment proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "read own or all payment proofs" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create or replace function public.submit_upi_claim(p_proof text, p_utr text default null, p_payer_name text default null, p_course text default 'ai-for-students')
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_utr text := nullif(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'), '');
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
  select price_inr into v_price from public.courses where id = p_course;
  if v_price is null then raise exception 'Course not found'; end if;
  insert into public.upi_claims (student_id, course_id, amount_paise, utr, proof_path, payer_name)
  values (v_uid, p_course, v_price * 100, v_utr, p_proof, nullif(left(trim(coalesce(p_payer_name, '')), 80), ''));
  return 'submitted';
end;
$$;

create or replace function public.admin_decide_upi_claim(p_claim uuid, p_approve boolean, p_note text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_claim public.upi_claims;
  v_phone text;
  v_email text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into v_claim from public.upi_claims where id = p_claim for update;
  if v_claim.id is null then raise exception 'Claim not found'; end if;
  if v_claim.status <> 'pending' then raise exception 'Already decided'; end if;
  update public.upi_claims set status = case when p_approve then 'approved' else 'rejected' end,
    note = nullif(left(trim(coalesce(p_note, '')), 200), ''), decided_by = (select auth.uid()), decided_at = now()
  where id = p_claim;
  if not p_approve then return 'rejected'; end if;

  select public.normalize_phone(p.guardian_phone), lower(u.email) into v_phone, v_email
  from public.profiles p left join auth.users u on u.id = p.id where p.id = v_claim.student_id;
  insert into public.purchases (course_id, reference, email, phone, amount_paise, source, status, claimed_by, matched_by, created_by, claimed_at)
  values (v_claim.course_id, 'upi-' || coalesce(v_claim.utr, left(v_claim.id::text, 8)), v_email, v_phone, v_claim.amount_paise, 'manual', 'claimed', v_claim.student_id, 'admin', (select auth.uid()), now())
  on conflict (reference) do nothing;
  insert into public.course_access (student_id, course_id, source, reference)
  values (v_claim.student_id, v_claim.course_id, 'payment', 'upi-' || coalesce(v_claim.utr, left(v_claim.id::text, 8)))
  on conflict (student_id, course_id) do nothing;
  return 'approved';
end;
$$;

revoke execute on function public.submit_upi_claim(text, text, text, text), public.admin_decide_upi_claim(uuid, boolean, text) from public, anon;
grant execute on function public.submit_upi_claim(text, text, text, text), public.admin_decide_upi_claim(uuid, boolean, text) to authenticated;
