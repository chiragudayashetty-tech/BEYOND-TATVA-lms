-- Automations: WhatsApp messages through AiSensy (API campaigns), with a send log Studio and the Leads sheet can read.
--
-- How it works:
--   1. An event (new lead, "payment link" status, payment, new student) calls _automation_enqueue from a trigger.
--      Nothing is queued while the rule is switched off, so switching a rule on never blasts an old backlog.
--   2. The sender (/api/automations/run, started every 5 min by the Leads Tracker Apps Script, or "Send now" in Studio)
--      claims a batch with automation_claim, calls AiSensy, and records the result with automation_done.
--   3. Do-not-contact is checked when queued and again when sent. Messages older than 3 days are never sent.
-- A messaging problem never blocks the lead, payment or sign-up that caused it (triggers swallow their own errors).

create table public.automation_rules (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  title text not null check (char_length(title) <= 80),
  description text not null default '' check (char_length(description) <= 400),
  campaign text check (char_length(campaign) between 1 and 100),   -- the AiSensy API campaign name
  enabled boolean not null default false,
  position smallint not null default 0,
  updated_at timestamptz not null default now(),
  constraint enabled_needs_campaign check (not enabled or campaign is not null)
);
alter table public.automation_rules enable row level security;
create policy "admins read automation rules" on public.automation_rules for select to authenticated
  using ((select public.is_admin()));

insert into public.automation_rules (key, title, description, position) values
 ('lead_welcome', 'New lead: welcome', 'A new lead (Leads sheet, website, Loki chat). Template params: {{1}} parent name, {{2}} child name.', 1),
 ('payment_link', 'Send payment link', 'A lead''s Next step becomes something with "payment link". Put the /unlock link in the template. Params: {{1}} parent name, {{2}} child name.', 2),
 ('payment_received', 'Payment received', 'A payment is recorded (Razorpay or manual). Params: {{1}} student name.', 3),
 ('student_welcome', 'New student: how to log in', 'A student finishes sign-up; goes to the parent WhatsApp. Params: {{1}} student first name.', 4);

create table public.message_queue (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null references public.automation_rules (key) on delete cascade,
  dedupe text not null check (char_length(dedupe) between 1 and 120),
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  name text not null default '' check (char_length(name) <= 80),
  params jsonb not null default '[]' check (jsonb_typeof(params) = 'array' and pg_column_size(params) <= 2000),
  lead_id uuid references public.leads (id) on delete set null,
  student_id uuid references public.profiles (id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts smallint not null default 0,
  error text check (char_length(error) <= 300),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  unique (rule_key, dedupe)
);
create index message_queue_status_idx on public.message_queue (status, created_at);
create index message_queue_created_idx on public.message_queue (created_at desc);
create index message_queue_lead_idx on public.message_queue (lead_id);
create index message_queue_student_idx on public.message_queue (student_id);
alter table public.message_queue enable row level security;
create policy "admins read message queue" on public.message_queue for select to authenticated
  using ((select public.is_admin()));
-- No write policies: only the functions below write.

-- '+919876543210', '9876543210', '91 98765 43210' → '+919876543210'; anything else → null.
create function public.automation_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when d ~ '^[6-9][0-9]{9}$' then '+91' || d
    when d ~ '^91[6-9][0-9]{9}$' then '+' || d
    when d ~ '^091[6-9][0-9]{9}$' then '+' || substr(d, 2)
    when d ~ '^0[6-9][0-9]{9}$' then '+91' || substr(d, 2)
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x
$$;

create function public.automation_dnc(p_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leads where phone = p_phone and do_not_contact)
$$;

create function public._automation_enqueue(
  p_rule text, p_dedupe text, p_phone text, p_name text, p_params jsonb,
  p_lead uuid default null, p_student uuid default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.automation_phone(p_phone);
begin
  if not exists (select 1 from public.automation_rules where key = p_rule and enabled) then return 'off'; end if;
  if v_phone is null then return 'no_phone'; end if;
  insert into public.message_queue (rule_key, dedupe, phone, name, params, lead_id, student_id, status, error)
  values (p_rule, left(p_dedupe, 120), v_phone, left(coalesce(trim(p_name), ''), 80), coalesce(p_params, '[]'),
          p_lead, p_student,
          case when public.automation_dnc(v_phone) then 'skipped' else 'queued' end,
          case when public.automation_dnc(v_phone) then 'Do not contact' end)
  on conflict (rule_key, dedupe) do nothing;
  return case when found then 'queued' else 'duplicate' end;
end;
$$;

-- ── Event triggers ───────────────────────────────────────────────────────────
create function public.automation_on_lead() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.book = 'v2' then return new; end if;   -- the archived old sheet never sends
    if tg_op = 'INSERT' then
      perform public._automation_enqueue('lead_welcome', 'lead:' || new.id, new.phone,
        coalesce(new.parent_name, new.student_name, ''),
        jsonb_build_array(coalesce(nullif(trim(new.parent_name), ''), 'Parent'), coalesce(nullif(trim(new.student_name), ''), 'your child')),
        new.id, new.student_id);
    end if;
    if coalesce(new.status, '') ~* 'payment\s*link' and (tg_op = 'INSERT' or coalesce(old.status, '') !~* 'payment\s*link') then
      perform public._automation_enqueue('payment_link', 'paylink:' || new.id, new.phone,
        coalesce(new.parent_name, new.student_name, ''),
        jsonb_build_array(coalesce(nullif(trim(new.parent_name), ''), 'Parent'), coalesce(nullif(trim(new.student_name), ''), 'your child')),
        new.id, new.student_id);
    end if;
  exception when others then
    raise warning 'automation_on_lead: %', sqlerrm;
  end;
  return new;
end;
$$;
create trigger automation_lead after insert or update of status on public.leads
  for each row execute function public.automation_on_lead();

create function public.automation_on_purchase() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_phone text := new.phone; v_name text := new.student_name; v_student uuid := new.claimed_by;
begin
  begin
    if new.status = 'revoked' then return new; end if;
    if v_student is not null then
      select coalesce(v_phone, p.guardian_phone), coalesce(v_name, p.full_name) into v_phone, v_name
      from public.profiles p where p.id = v_student;
    end if;
    perform public._automation_enqueue('payment_received', 'paid:' || new.reference, v_phone, coalesce(new.parent_name, v_name, ''),
      jsonb_build_array(coalesce(nullif(split_part(trim(v_name), ' ', 1), ''), 'your child')), null, v_student);
  exception when others then
    raise warning 'automation_on_purchase: %', sqlerrm;
  end;
  return new;
end;
$$;
-- Insert, and claim (an email-only purchase gets the parent phone once the student claims it; dedupe keeps it to one).
create trigger automation_purchase after insert or update of claimed_by on public.purchases
  for each row execute function public.automation_on_purchase();

create function public.automation_on_student() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.role = 'student' and new.guardian_phone is not null then
      perform public._automation_enqueue('student_welcome', 'welcome:' || new.id, new.guardian_phone, coalesce(new.guardian_name, ''),
        jsonb_build_array(coalesce(nullif(split_part(trim(new.full_name), ' ', 1), ''), 'there')), null, new.id);
    end if;
  exception when others then
    raise warning 'automation_on_student: %', sqlerrm;
  end;
  return new;
end;
$$;
create trigger automation_student after insert or update of guardian_phone on public.profiles
  for each row execute function public.automation_on_student();

-- ── Sender (service role only) ───────────────────────────────────────────────
-- Claims up to p_limit messages. Also: retries 'sending' rows stuck > 10 min, skips too-old and do-not-contact rows.
create function public.automation_claim(p_limit int default 50)
returns table (id uuid, rule_key text, campaign text, phone text, name text, params jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update public.message_queue q set status = 'skipped', error = 'Older than 3 days, not sent'
  where q.status in ('queued', 'sending') and q.created_at < now() - interval '3 days';
  update public.message_queue q set status = 'skipped', error = 'Do not contact'
  where q.status = 'queued' and public.automation_dnc(q.phone);
  return query
  with picked as (
    select q.id from public.message_queue q
    join public.automation_rules r on r.key = q.rule_key and r.enabled
    where q.status = 'queued' or (q.status = 'sending' and q.claimed_at < now() - interval '10 minutes')
    order by q.created_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    for update of q skip locked
  )
  update public.message_queue q set status = 'sending', claimed_at = now(), attempts = q.attempts + 1
  from picked, public.automation_rules r
  where q.id = picked.id and r.key = q.rule_key
  returning q.id, q.rule_key, r.campaign, q.phone, q.name, q.params;
end;
$$;

-- Result of one send. A failure is retried on the next run, up to 3 attempts.
create function public.automation_done(p_id uuid, p_ok boolean, p_error text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  update public.message_queue set
    status = case when p_ok then 'sent' when attempts >= 3 then 'failed' else 'queued' end,
    sent_at = case when p_ok then now() end,
    error = case when p_ok then null else left(coalesce(p_error, 'Unknown error'), 300) end
  where id = p_id and status = 'sending'
  returning status into v;
  return coalesce(v, 'unknown');
end;
$$;

-- Log for the Leads sheet's "Automations" tab: everything finished since p_since (newest last, max 500).
create function public.automation_log(p_since timestamptz default now() - interval '1 day')
returns table (id uuid, at timestamptz, rule text, name text, phone text, status text, error text)
language sql stable security definer set search_path = '' as $$
  select q.id, coalesce(q.sent_at, q.claimed_at, q.created_at), r.title, q.name, q.phone, q.status, q.error
  from public.message_queue q join public.automation_rules r on r.key = q.rule_key
  where q.status in ('sent', 'failed', 'skipped') and coalesce(q.sent_at, q.claimed_at, q.created_at) > p_since
  order by 2 limit 500
$$;

-- ── Studio (admins) ──────────────────────────────────────────────────────────
create function public.admin_set_automation(p_key text, p_campaign text, p_enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can change automations' using errcode = '42501'; end if;
  update public.automation_rules set campaign = nullif(trim(p_campaign), ''), enabled = p_enabled, updated_at = now()
  where key = p_key;
  if not found then raise exception 'Unknown automation'; end if;
end;
$$;

create function public.admin_retry_message(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can retry messages' using errcode = '42501'; end if;
  update public.message_queue set status = 'queued', attempts = 0, error = null, created_at = now()
  where id = p_id and status in ('failed', 'skipped') and error is distinct from 'Do not contact';
end;
$$;

revoke all on function public.automation_phone, public.automation_dnc, public._automation_enqueue, public.automation_on_lead,
  public.automation_on_purchase, public.automation_on_student, public.automation_claim, public.automation_done,
  public.automation_log, public.admin_set_automation, public.admin_retry_message from public, anon;
revoke all on function public.automation_dnc, public._automation_enqueue, public.automation_claim, public.automation_done,
  public.automation_log from authenticated;
grant execute on function public.automation_claim, public.automation_done, public.automation_log to service_role;
grant execute on function public.admin_set_automation, public.admin_retry_message to authenticated;
