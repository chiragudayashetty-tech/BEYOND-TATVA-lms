-- Security hardening (audit 2026-11-14):
--  1. Studio admins need a two-step login (MFA, Supabase "aal2") before is_admin() is true.
--  2. Public workshop signup: per-IP and per-phone limits (bots can't fill seats or flood leads).
--  3. Consent records: which wording (version + hash), who gave it, how it was checked.
--  4. Parent consent by WhatsApp code to the parent's number on file.
--  5. Leaderboard is off by default; a student can join it only after a parent has confirmed.

-- ── 1. Admin MFA ─────────────────────────────────────────────────────────────
-- auth.jwt() ->> 'aal' is 'aal2' only when this login passed a second factor (authenticator app).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2' and exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = (select auth.uid()) and p.role = 'admin'
      and u.email_confirmed_at is not null and public.on_studio_list(u.email)
  );
$$;

-- ── 2. Workshop signup limits ────────────────────────────────────────────────
alter table public.workshop_registrations add column registered_ip text;

-- Caller IP as forwarded by the API gateway (null for SQL run inside the database / service role).
create function public.request_ip() returns text
language sql stable set search_path = '' as $$
  select nullif(trim(split_part(coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
    nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for', ''), ',', 1)), '');
$$;
revoke execute on function public.request_ip() from public, anon, authenticated;

create function public.workshop_signup_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Only public signups (the website form). Admin entry and the service role are not limited.
  -- current_user is the function owner inside security definer code; 'role' is the caller's API role.
  if coalesce(current_setting('role', true), '') not in ('anon', 'authenticated') or public.is_admin() then return new; end if;
  new.registered_ip := public.request_ip();
  if (select count(*) from public.workshop_registrations
      where parent_phone = new.parent_phone and created_at > now() - interval '1 day') >= 3 then
    raise exception 'This number has signed up for several workshops today. Please WhatsApp us to add more.';
  end if;
  if new.registered_ip is not null and (select count(*) from public.workshop_registrations
      where registered_ip = new.registered_ip and created_at > now() - interval '1 hour') >= 8 then
    raise exception 'Too many signups from this connection. Please try again in an hour.';
  end if;
  return new;
end;
$$;
revoke execute on function public.workshop_signup_limit() from public, anon, authenticated;
create trigger workshop_signup_limit before insert on public.workshop_registrations
  for each row execute function public.workshop_signup_limit();
create index workshop_registrations_ip_idx on public.workshop_registrations (registered_ip, created_at);
create index workshop_registrations_phone_idx on public.workshop_registrations (parent_phone, created_at);

-- ── 3. Consent wording and records ───────────────────────────────────────────
create table public.consent_texts (
  version text primary key,                 -- e.g. student-signup-v1
  purpose text not null check (purpose in ('student_signup', 'parent_confirm')),
  body text not null,
  body_sha256 text not null default '',     -- set by the trigger below
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.consent_texts enable row level security;
create policy "anyone reads consent wording" on public.consent_texts for select to anon, authenticated using (true);
-- Wording is never edited in place: a new wording is a new version row.
create function public.consent_text_hash() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.body is distinct from old.body then raise exception 'Add a new version instead of editing wording'; end if;
  new.body_sha256 := encode(sha256(convert_to(new.body, 'UTF8')), 'hex');
  return new;
end;
$$;
revoke execute on function public.consent_text_hash() from public, anon, authenticated;
create trigger consent_text_hash before insert or update on public.consent_texts
  for each row execute function public.consent_text_hash();
create unique index consent_texts_one_active on public.consent_texts (purpose) where active;

insert into public.consent_texts (version, purpose, body) values
('student-signup-v1', 'student_signup',
 'My parent or guardian knows I am joining Beyond Tatva and agrees that Beyond Tatva may keep my name, school, grade, '
 || 'their name and phone number, and my learning progress, only to run my course. They can ask for this data to be '
 || 'shown or deleted at any time.'),
('parent-confirm-v1', 'parent_confirm',
 'I am the parent or guardian of this student. I agree that Beyond Tatva may keep my child''s name, school, grade, '
 || 'my name and phone number, and my child''s learning progress, only to run the course. I can ask for this data to '
 || 'be shown or deleted at any time by writing to Beyond Tatva.');

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  version text not null references public.consent_texts (version),
  body_sha256 text not null,                -- copy of the wording hash at the time, so later edits can't rewrite history
  method text not null check (method in ('student_tick', 'parent_tick', 'parent_whatsapp_otp')),
  guardian_phone text,
  created_at timestamptz not null default now()
);
alter table public.consent_records enable row level security;
create index consent_records_student_idx on public.consent_records (student_id, created_at desc);
create index consent_records_version_idx on public.consent_records (version);
create policy "students and admins read consent records" on public.consent_records for select to authenticated
  using (student_id = (select auth.uid()) or public.is_admin());
-- No insert/update/delete policies: rows are written only by the functions below.

alter table public.profiles add column parent_verified_at timestamptz;

create function public.add_consent_record(p_student uuid, p_purpose text, p_method text, p_phone text)
returns void language sql security definer set search_path = '' as $$
  insert into public.consent_records (student_id, version, body_sha256, method, guardian_phone)
  select p_student, t.version, t.body_sha256, p_method, p_phone
  from public.consent_texts t where t.purpose = p_purpose and t.active;
$$;
revoke execute on function public.add_consent_record(uuid, text, text, text) from public, anon, authenticated;

-- Every new student profile with a consent tick gets a record of the wording they saw.
create function public.record_signup_consent() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' and new.guardian_consent_at is not null then
    perform public.add_consent_record(new.id, 'student_signup',
      case when new.consent_by = 'parent' then 'parent_tick' else 'student_tick' end, new.guardian_phone);
  end if;
  return new;
end;
$$;
revoke execute on function public.record_signup_consent() from public, anon, authenticated;
create trigger record_signup_consent after insert on public.profiles
  for each row execute function public.record_signup_consent();

-- Students who signed up before records existed: keep what we know (a tick, version unknown → v1 wording).
insert into public.consent_records (student_id, version, body_sha256, method, guardian_phone, created_at)
select p.id, t.version, t.body_sha256, case when p.consent_by = 'parent' then 'parent_tick' else 'student_tick' end,
       p.guardian_phone, p.guardian_consent_at
from public.profiles p cross join public.consent_texts t
where p.role = 'student' and p.guardian_consent_at is not null and t.version = 'student-signup-v1';

-- ── 4. Parent confirmation by WhatsApp code ──────────────────────────────────
-- The server makes a 6-digit code, sends it to the parent's number on file and stores only its hash here.
create table public.parent_consent_codes (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  phone text not null,
  code_sha256 text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now(),
  sends_today int not null default 1,
  day date not null default current_date
);
alter table public.parent_consent_codes enable row level security;  -- no policies: functions only

-- Service role only (the /api/parent-consent route, after it checked the signed-in student).
-- Returns 'ok', 'cooldown', 'daily_limit', 'no_phone' or 'already'. The phone is the guardian's number on file.
create function public.parent_consent_issue(p_student uuid, p_code_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_p public.profiles; v_c public.parent_consent_codes;
begin
  select * into v_p from public.profiles where id = p_student and role = 'student';
  if v_p.id is null then raise exception 'Student not found'; end if;
  if v_p.parent_verified_at is not null then return jsonb_build_object('status', 'already'); end if;
  if v_p.guardian_phone is null or v_p.guardian_phone = v_p.student_phone then
    return jsonb_build_object('status', 'no_phone');
  end if;
  if p_code_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'bad code hash'; end if;
  select * into v_c from public.parent_consent_codes where student_id = p_student for update;
  if v_c.student_id is not null then
    if v_c.sent_at > now() - interval '1 minute' then return jsonb_build_object('status', 'cooldown'); end if;
    if v_c.day = current_date and v_c.sends_today >= 5 then return jsonb_build_object('status', 'daily_limit'); end if;
  end if;
  insert into public.parent_consent_codes (student_id, phone, code_sha256, expires_at)
  values (p_student, v_p.guardian_phone, p_code_sha256, now() + interval '15 minutes')
  on conflict (student_id) do update set phone = excluded.phone, code_sha256 = excluded.code_sha256,
    expires_at = excluded.expires_at, attempts = 0, sent_at = now(),
    sends_today = case when parent_consent_codes.day = current_date then parent_consent_codes.sends_today + 1 else 1 end,
    day = current_date;
  return jsonb_build_object('status', 'ok', 'phone', v_p.guardian_phone);
end;
$$;
revoke execute on function public.parent_consent_issue(uuid, text) from public, anon, authenticated;

-- The signed-in student types the code their parent read out. 5 tries per code.
-- Returns 'verified', 'wrong', 'expired', 'too_many' or 'no_code'.
create function public.parent_consent_verify(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_c public.parent_consent_codes;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_c from public.parent_consent_codes where student_id = v_uid for update;
  if v_c.student_id is null then return 'no_code'; end if;
  if v_c.attempts >= 5 then return 'too_many'; end if;
  if v_c.expires_at < now() then return 'expired'; end if;
  if encode(sha256(convert_to(coalesce(trim(p_code), ''), 'UTF8')), 'hex') <> v_c.code_sha256 then
    update public.parent_consent_codes set attempts = attempts + 1 where student_id = v_uid;
    return 'wrong';
  end if;
  delete from public.parent_consent_codes where student_id = v_uid;
  update public.profiles set parent_verified_at = now(), guardian_consent_at = coalesce(guardian_consent_at, now())
  where id = v_uid;
  perform public.add_consent_record(v_uid, 'parent_confirm', 'parent_whatsapp_otp', v_c.phone);
  return 'verified';
end;
$$;
revoke execute on function public.parent_consent_verify(text) from public, anon;
grant execute on function public.parent_consent_verify(text) to authenticated;

-- A parent who links their own account (existing flow) also counts as confirmed.
create function public.parent_link_verifies() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set parent_verified_at = coalesce(parent_verified_at, now()) where id = new.student_id;
  return new;
end;
$$;
revoke execute on function public.parent_link_verifies() from public, anon, authenticated;
create trigger parent_link_verifies after insert on public.guardians
  for each row execute function public.parent_link_verifies();
update public.profiles p set parent_verified_at = coalesce(p.guardian_consent_at, now())
where exists (select 1 from public.guardians g where g.student_id = p.id);

-- ── 5. Leaderboard: off by default, parent confirmation to join ──────────────
alter table public.profiles alter column leaderboard_hidden set default true;
update public.profiles set leaderboard_hidden = true where role = 'student' and parent_verified_at is null;

create or replace function public.set_leaderboard_hidden(p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;
  if not coalesce(p_hidden, true) and not exists (
    select 1 from public.profiles where id = (select auth.uid()) and parent_verified_at is not null
  ) then
    raise exception 'Ask a parent to confirm on WhatsApp first (Profile → Parent confirmation).';
  end if;
  update public.profiles set leaderboard_hidden = coalesce(p_hidden, true) where id = (select auth.uid()) and role = 'student';
end;
$$;
revoke execute on function public.set_leaderboard_hidden(boolean) from public, anon;
grant execute on function public.set_leaderboard_hidden(boolean) to authenticated;
