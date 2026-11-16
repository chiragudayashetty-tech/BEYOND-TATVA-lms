-- WhatsApp CRM: a template library (one row per AiSensy API campaign), manual sends from Studio → Pipeline
-- (one lead or a filtered group), and AiSensy contact data (tags + attributes) on every message.
--
-- Template params are placeholders filled from the LMS at queue time:
--   {parent_name} {student_name} {student_first} {school} {grade} {stage}   - anything else is sent as typed.
-- Automation rules can now point at a template instead of holding their own campaign name.

create table public.wa_templates (
  key text primary key check (key ~ '^[a-z0-9_]{1,40}$'),
  title text not null check (char_length(title) between 1 and 80),
  campaign text not null check (char_length(campaign) between 1 and 100),   -- AiSensy API campaign name
  language text not null default 'kn' check (language in ('kn', 'en')),
  category text not null default 'marketing' check (category in ('marketing', 'utility')),
  params text[] not null default '{}' check (cardinality(params) <= 10),
  body text not null default '' check (char_length(body) <= 1500),          -- preview only; the real text lives in AiSensy
  media_url text check (media_url ~ '^https://' and char_length(media_url) <= 500),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.wa_templates enable row level security;
create policy "admins read templates" on public.wa_templates for select to authenticated using ((select public.is_admin()));

alter table public.automation_rules add column template_key text references public.wa_templates (key) on delete set null;
create index automation_rules_template_idx on public.automation_rules (template_key);
alter table public.automation_rules drop constraint enabled_needs_campaign;
alter table public.automation_rules add constraint enabled_needs_campaign check (not enabled or campaign is not null or template_key is not null);

alter table public.message_queue alter column rule_key drop not null;
alter table public.message_queue
  add column template_key text references public.wa_templates (key) on delete set null,
  add column media_url text check (char_length(media_url) <= 500),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 10),
  add column attributes jsonb not null default '{}' check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 2000),
  add column sent_by uuid references public.profiles (id) on delete set null,
  add constraint rule_or_template check (rule_key is not null or template_key is not null);
alter table public.message_queue drop constraint message_queue_rule_key_dedupe_key;
create unique index message_queue_dedupe_idx on public.message_queue (coalesce(rule_key, ''), dedupe);
create index message_queue_template_idx on public.message_queue (template_key);
create index message_queue_sent_by_idx on public.message_queue (sent_by);

-- Who a message is about: a lead and/or a student account → contact details for templates and AiSensy.
create function public.wa_person(p_lead uuid, p_student uuid)
returns table (phone text, parent_name text, student_name text, school text, grade text, stage text, dnc boolean, lead_id uuid, student_id uuid)
language sql stable security definer set search_path = '' as $$
  select public.automation_phone(coalesce(l.phone, p.guardian_phone)),
         coalesce(nullif(trim(l.parent_name), ''), nullif(trim(p.guardian_name), ''), ''),
         coalesce(nullif(trim(l.student_name), ''), nullif(trim(p.full_name), ''), ''),
         coalesce(nullif(trim(l.school_name), ''), s.name, ''),
         coalesce(l.grade, p.grade)::text,
         case when exists (select 1 from public.purchases pu where pu.claimed_by = p.id and pu.status = 'claimed') then 'Paid'
              when p.id is not null then 'Signed up' else 'Lead' end,
         coalesce(l.do_not_contact, false) or public.automation_dnc(public.automation_phone(coalesce(l.phone, p.guardian_phone))),
         l.id, p.id
  from (select 1) one
  left join public.leads l on l.id = p_lead
  left join public.profiles p on p.id = coalesce(p_student, l.student_id)
  left join public.schools s on s.id = p.school_id
  where l.id is not null or p.id is not null
$$;

create function public.wa_fill(p text, w_parent text, w_student text, w_school text, w_grade text, w_stage text) returns text
language sql immutable set search_path = '' as $$
  select left(case p
    when '{parent_name}' then coalesce(nullif(w_parent, ''), 'Parent')
    when '{student_name}' then coalesce(nullif(w_student, ''), 'your child')
    when '{student_first}' then coalesce(nullif(split_part(w_student, ' ', 1), ''), 'your child')
    when '{school}' then coalesce(nullif(w_school, ''), 'your school')
    when '{grade}' then coalesce(w_grade, '')
    when '{stage}' then w_stage
    else p end, 200)
$$;

-- Admin: queue one template for up to 500 people. p_targets: [{ "lead_id": "...", "student_id": "..." }, ...]
-- Phones and names come from the database, never from the browser. One send per template per person per day.
create function public.admin_send_template(p_template text, p_targets jsonb)
returns table (queued int, skipped int, no_phone int, duplicate int)
language plpgsql security definer set search_path = '' as $$
declare
  t public.wa_templates; x jsonb; w record; v_params jsonb; v_id uuid;
  n_q int := 0; n_s int := 0; n_p int := 0; n_d int := 0;
begin
  if not public.is_admin() then raise exception 'Only an admin can send messages' using errcode = '42501'; end if;
  select * into t from public.wa_templates where key = p_template and active;
  if t.key is null then raise exception 'Unknown or inactive template'; end if;
  if jsonb_typeof(p_targets) <> 'array' or jsonb_array_length(p_targets) > 500 then raise exception 'Send to 1–500 people at a time'; end if;
  for x in select * from jsonb_array_elements(p_targets) loop
    select * into w from public.wa_person(nullif(x ->> 'lead_id', '')::uuid, nullif(x ->> 'student_id', '')::uuid);
    if w.phone is null then n_p := n_p + 1; continue; end if;
    select coalesce(jsonb_agg(public.wa_fill(p, w.parent_name, w.student_name, w.school, w.grade, w.stage) order by i), '[]') into v_params from unnest(t.params) with ordinality u(p, i);
    insert into public.message_queue (template_key, dedupe, phone, name, params, lead_id, student_id, status, error,
                                      media_url, tags, attributes, sent_by)
    values (t.key, 'manual:' || t.key || ':' || coalesce(w.lead_id::text, w.student_id::text) || ':' || (now() at time zone 'Asia/Kolkata')::date,
            w.phone, left(coalesce(nullif(w.parent_name, ''), w.student_name, ''), 80), v_params, w.lead_id, w.student_id,
            case when w.dnc then 'skipped' else 'queued' end, case when w.dnc then 'Do not contact' end,
            t.media_url, array_remove(array[nullif(w.school, ''), w.stage, 'lms'], null),
            jsonb_strip_nulls(jsonb_build_object('student', nullif(w.student_name, ''), 'school', nullif(w.school, ''), 'grade', w.grade, 'stage', w.stage)),
            (select auth.uid()))
    on conflict do nothing
    returning id into v_id;
    if v_id is null then n_d := n_d + 1; elsif w.dnc then n_s := n_s + 1; else n_q := n_q + 1; end if;
    v_id := null;
  end loop;
  return query select n_q, n_s, n_p, n_d;
end;
$$;

create function public.admin_save_template(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can edit templates' using errcode = '42501'; end if;
  insert into public.wa_templates (key, title, campaign, language, category, params, body, media_url, active)
  values (lower(trim(p ->> 'key')), trim(p ->> 'title'), trim(p ->> 'campaign'), coalesce(p ->> 'language', 'kn'),
          coalesce(p ->> 'category', 'marketing'),
          coalesce((select array_agg(trim(v)) from jsonb_array_elements_text(coalesce(p -> 'params', '[]')) v where trim(v) <> ''), '{}'),
          coalesce(p ->> 'body', ''), nullif(trim(p ->> 'media_url'), ''), coalesce((p ->> 'active')::boolean, true))
  on conflict (key) do update set title = excluded.title, campaign = excluded.campaign, language = excluded.language,
    category = excluded.category, params = excluded.params, body = excluded.body, media_url = excluded.media_url,
    active = excluded.active, updated_at = now();
end;
$$;

-- Automation rules now: campaign OR template. Rule-queued messages also carry AiSensy tags/attributes.
drop function public.admin_set_automation(text, text, boolean);
create function public.admin_set_automation(p_key text, p_campaign text, p_enabled boolean, p_template text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can change automations' using errcode = '42501'; end if;
  update public.automation_rules set campaign = nullif(trim(p_campaign), ''), template_key = nullif(trim(p_template), ''),
    enabled = p_enabled, updated_at = now()
  where key = p_key;
  if not found then raise exception 'Unknown automation'; end if;
end;
$$;

create or replace function public._automation_enqueue(
  p_rule text, p_dedupe text, p_phone text, p_name text, p_params jsonb,
  p_lead uuid default null, p_student uuid default null
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.automation_phone(p_phone); r public.automation_rules; t public.wa_templates; w record; v_params jsonb := p_params;
begin
  select * into r from public.automation_rules where key = p_rule and enabled;
  if r.key is null then return 'off'; end if;
  if v_phone is null then return 'no_phone'; end if;
  select * into w from public.wa_person(p_lead, p_student);
  select * into t from public.wa_templates where key = r.template_key;
  if t.key is not null and w.phone is not null then   -- a template's own placeholders win over the rule's default params
    select coalesce(jsonb_agg(public.wa_fill(p, w.parent_name, w.student_name, w.school, w.grade, w.stage) order by i), '[]') into v_params from unnest(t.params) with ordinality u(p, i);
  end if;
  insert into public.message_queue (rule_key, template_key, dedupe, phone, name, params, lead_id, student_id, status, error, media_url, tags, attributes)
  values (p_rule, t.key, left(p_dedupe, 120), v_phone, left(coalesce(trim(p_name), ''), 80), coalesce(v_params, '[]'), p_lead, p_student,
          case when public.automation_dnc(v_phone) then 'skipped' else 'queued' end,
          case when public.automation_dnc(v_phone) then 'Do not contact' end,
          t.media_url, array_remove(array[nullif(w.school, ''), w.stage, 'lms'], null),
          coalesce(jsonb_strip_nulls(jsonb_build_object('student', nullif(w.student_name, ''), 'school', nullif(w.school, ''), 'grade', w.grade, 'stage', w.stage)), '{}'))
  on conflict do nothing;
  return case when found then 'queued' else 'duplicate' end;
end;
$$;

drop function public.automation_claim(int);
create function public.automation_claim(p_limit int default 50)
returns table (id uuid, rule_key text, campaign text, phone text, name text, params jsonb, media_url text, tags text[], attributes jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update public.message_queue q set status = 'skipped', error = 'Older than 3 days, not sent'
  where q.status in ('queued', 'sending') and q.created_at < now() - interval '3 days';
  update public.message_queue q set status = 'skipped', error = 'Do not contact'
  where q.status = 'queued' and public.automation_dnc(q.phone);
  return query
  with picked as (
    select q.id from public.message_queue q
    left join public.automation_rules r on r.key = q.rule_key
    where (q.rule_key is null or r.enabled)
      and (q.status = 'queued' or (q.status = 'sending' and q.claimed_at < now() - interval '10 minutes'))
    order by q.created_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    for update of q skip locked
  )
  update public.message_queue q set status = 'sending', claimed_at = now(), attempts = q.attempts + 1
  from picked
  where q.id = picked.id
  returning q.id, q.rule_key,
    coalesce((select t.campaign from public.wa_templates t where t.key = q.template_key),
             (select t.campaign from public.automation_rules r join public.wa_templates t on t.key = r.template_key where r.key = q.rule_key),
             (select r.campaign from public.automation_rules r where r.key = q.rule_key)),
    q.phone, q.name, q.params, q.media_url, q.tags, q.attributes;
end;
$$;

drop function public.automation_log(timestamptz);
create function public.automation_log(p_since timestamptz default now() - interval '1 day')
returns table (id uuid, at timestamptz, rule text, name text, phone text, status text, error text)
language sql stable security definer set search_path = '' as $$
  select q.id, coalesce(q.sent_at, q.claimed_at, q.created_at), coalesce(t.title, r.title), q.name, q.phone, q.status, q.error
  from public.message_queue q
  left join public.automation_rules r on r.key = q.rule_key
  left join public.wa_templates t on t.key = q.template_key
  where q.status in ('sent', 'failed', 'skipped') and coalesce(q.sent_at, q.claimed_at, q.created_at) > p_since
  order by 2 limit 500
$$;

revoke all on function public.wa_person, public.wa_fill, public.admin_send_template, public.admin_save_template,
  public.admin_set_automation, public.automation_claim, public.automation_log from public, anon;
revoke all on function public.wa_person, public.automation_claim, public.automation_log from authenticated;
grant execute on function public.automation_claim, public.automation_log to service_role;
grant execute on function public.admin_send_template, public.admin_save_template, public.admin_set_automation to authenticated;
