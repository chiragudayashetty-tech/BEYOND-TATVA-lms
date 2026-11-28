-- Custom automations (Chirag 2026-11-28, "full control"): rules built in Studio instead of in SQL.
-- A custom rule = trigger + delay + send window + who + message. The built-in journey rules (j_*, lead_welcome …) are
-- unchanged: still On/Off + message only. Custom rules live in automation_rules (custom = true) so they share the
-- queue, sender, history and the Do-not-contact / test-account safety rules.
--
-- Triggers (anchor time + delay = due):
--   signup       the student's account was created        (students)
--   access       the student got the course                (students)
--   module_open  a paid module opened for that student     (students; aud_module = which one, null = every module)
--   lead_added   a lead was added and has no account yet   (parent phone of the lead)
--   date         a fixed date and time (run_at), once      (students + leads without an account)
-- Filters are checked when the message is queued ("still not enrolled" etc.): aud_stage, aud_school, aud_grade, aud_m0.
-- Nothing is retroactive unless include_past is ticked: by default only people whose due time is after the rule was switched On.

alter table public.automation_rules
  add column custom boolean not null default false,
  add column trigger text check (trigger in ('signup', 'access', 'module_open', 'lead_added', 'date')),
  add column delay_minutes int not null default 0 check (delay_minutes between 0 and 525600),
  add column from_hour smallint not null default 9 check (from_hour between 0 and 23),
  add column to_hour smallint not null default 21 check (to_hour between 1 and 24),
  add column run_at timestamptz,
  add column recipient text not null default 'parent' check (recipient in ('parent', 'student')),
  add column aud_stage text not null default 'any' check (aud_stage in ('any', 'not_enrolled', 'enrolled')),
  add column aud_school uuid references public.schools (id) on delete set null,
  add column aud_grade smallint check (aud_grade between 8 and 10),
  add column aud_module smallint check (aud_module between 1 and 5),
  add column aud_m0 text check (aud_m0 in ('none', 'part', 'watched', 'done')),
  add column include_past boolean not null default false,
  add column enabled_at timestamptz,
  add constraint automation_custom_shape check (
    not custom or (trigger is not null and from_hour < to_hour and (trigger <> 'date' or run_at is not null))
  );
create index automation_rules_school_idx on public.automation_rules (aud_school);

-- Who a custom rule can reach, and when each person is due. Filters applied, time not (so the Studio can count "in total").
-- Returns one row per message: the person, the exact phone to use, and a dedupe key (one message per person per rule/module).
create function public.custom_targets(r public.automation_rules)
returns table (student_id uuid, lead_id uuid, phone text, name text, due timestamptz, dedupe text)
language sql stable security definer set search_path = '' as $$
  with stu as (
    select j.*, p.school_id, p.grade, (j.granted_at is not null) as enrolled,
           case when r.recipient = 'student' then j.sphone else j.phone end as to_phone
    from public.journey_students() j join public.profiles p on p.id = j.id
    where (r.aud_school is null or p.school_id = r.aud_school)
      and (r.aud_grade is null or p.grade = r.aud_grade)
      and (r.aud_stage = 'any' or (r.aud_stage = 'enrolled') = (j.granted_at is not null))
      and (r.aud_m0 is null or public.journey_m0_status(j.id) = r.aud_m0)
      and not (r.recipient = 'student' and public.automation_dnc(public.automation_phone(j.phone)) and j.sphone <> j.phone)
  ), lds as (
    select l.id, l.phone, coalesce(nullif(trim(l.parent_name), ''), nullif(trim(l.student_name), ''), '') as nm, l.created_at
    from public.leads l
    where l.student_id is null and l.book <> 'v2' and not l.do_not_contact
      and (r.aud_grade is null or l.grade = r.aud_grade)
      and (r.aud_school is null or l.school_name = (select s.name from public.schools s where s.id = r.aud_school))
      and r.aud_stage <> 'enrolled' and r.aud_m0 is null and r.recipient = 'parent'
  )
  select s.id, null::uuid, s.to_phone, s.first_name, s.created_at + make_interval(mins => r.delay_minutes), 'c:' || s.id
    from stu s where r.trigger = 'signup'
  union all
  select s.id, null, s.to_phone, s.first_name, s.granted_at + make_interval(mins => r.delay_minutes), 'c:' || s.id
    from stu s where r.trigger = 'access' and s.enrolled
  union all
  select s.id, null, s.to_phone, s.first_name, public.chapter_release_for(ch.id, s.id) + make_interval(mins => r.delay_minutes), 'c:' || s.id || ':' || ch.id
    from stu s join public.chapters ch on ch.course_id = 'ai-for-students' and not ch.is_free and ch.position between 1 and 5
    where r.trigger = 'module_open' and s.enrolled and (r.aud_module is null or ch.position = r.aud_module)
      and public.chapter_release_for(ch.id, s.id) between '2020-01-01' and now() + interval '1 year'
  union all
  select null, l.id, l.phone, l.nm, l.created_at + make_interval(mins => r.delay_minutes), 'c:' || l.id
    from lds l where r.trigger = 'lead_added'
  union all
  select s.id, null, s.to_phone, s.first_name, r.run_at, 'c:' || s.id from stu s where r.trigger = 'date' and s.created_at <= r.run_at
  union all
  select null, l.id, l.phone, l.nm, r.run_at, 'c:' || l.id from lds l where r.trigger = 'date' and l.created_at <= r.run_at
$$;

-- Queue every custom message that is due now: rule On, inside its send window (IST), not older than 3 days
-- (unless the rule was switched On after that), not queued before. Called by the sender every minute.
create function public.automation_custom_tick() returns int
language plpgsql security definer set search_path = '' as $$
declare
  r public.automation_rules; t record; n int := 0;
  v_hour int := extract(hour from now() at time zone 'Asia/Kolkata');
begin
  for r in select * from public.automation_rules where custom and enabled and template_key is not null
           and v_hour >= from_hour and v_hour < to_hour loop
    for t in select * from public.custom_targets(r) x
             where x.phone is not null and x.due <= now() and x.due > now() - interval '3 days'
               and (r.include_past or x.due >= coalesce(r.enabled_at, now()))
               and not exists (select 1 from public.message_queue q where q.rule_key = r.key and q.dedupe = left(x.dedupe, 120))
    loop
      if public._automation_enqueue(r.key, t.dedupe, t.phone, t.name, '[]', t.lead_id, t.student_id) = 'queued' then n := n + 1; end if;
    end loop;
  end loop;
  return n;
end;
$$;

-- Studio: how many people would this rule reach? total = match the filters, due_now = would be queued this minute
-- (ignores the send window), already = got it before.
create function public.admin_custom_preview(p_key text)
returns table (total int, due_now int, already int)
language plpgsql security definer set search_path = '' as $$
declare r public.automation_rules;
begin
  if not public.is_admin() then raise exception 'Only an admin can do this' using errcode = '42501'; end if;
  select * into r from public.automation_rules where key = p_key and custom;
  if r.key is null then raise exception 'Unknown rule'; end if;
  return query
    select count(*)::int,
           (count(*) filter (where x.due <= now() and x.due > now() - interval '3 days' and (r.include_past or x.due >= coalesce(r.enabled_at, now()))
                             and not q.sent))::int,
           (count(*) filter (where q.sent))::int
    from public.custom_targets(r) x
    left join lateral (select true as sent from public.message_queue m where m.rule_key = r.key and m.dedupe = left(x.dedupe, 120) limit 1) q on true
    where x.phone is not null;
end;
$$;

-- Studio: create or update one custom rule. Always saved Off when new; an edit keeps On/Off.
create function public.admin_save_custom_rule(p jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_key text := nullif(trim(p ->> 'key'), '');
  v_trigger text := p ->> 'trigger';
  v_run timestamptz := nullif(p ->> 'run_at', '')::timestamptz;
begin
  if not public.is_admin() then raise exception 'Only an admin can edit automations' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p ->> 'title', ''))) not between 1 and 80 then raise exception 'Give the rule a name (up to 80 letters)'; end if;
  if v_trigger = 'date' and (v_run is null or v_run < now() - interval '1 minute') then raise exception 'Pick a date and time in the future'; end if;
  if v_key is null then
    insert into public.automation_rules (key, title, description, position, custom, trigger, run_at) values
      ('c_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), trim(p ->> 'title'), '', 200, true, v_trigger,
       case when v_trigger = 'date' then v_run end)
    returning key into v_key;
  elsif not exists (select 1 from public.automation_rules where key = v_key and custom) then
    raise exception 'Unknown rule';
  end if;
  update public.automation_rules set
    title = trim(p ->> 'title'), trigger = v_trigger,
    delay_minutes = case when v_trigger = 'date' then 0 else coalesce((p ->> 'delay_minutes')::int, 0) end,
    from_hour = coalesce((p ->> 'from_hour')::smallint, 9), to_hour = coalesce((p ->> 'to_hour')::smallint, 21),
    run_at = case when v_trigger = 'date' then v_run end,
    recipient = coalesce(p ->> 'recipient', 'parent'), aud_stage = coalesce(p ->> 'aud_stage', 'any'),
    aud_school = nullif(p ->> 'aud_school', '')::uuid, aud_grade = nullif(p ->> 'aud_grade', '')::smallint,
    aud_module = case when v_trigger = 'module_open' then nullif(p ->> 'aud_module', '')::smallint end,
    aud_m0 = nullif(p ->> 'aud_m0', ''), include_past = coalesce((p ->> 'include_past')::boolean, false),
    template_key = nullif(trim(p ->> 'template_key'), ''),
    enabled = enabled and nullif(trim(p ->> 'template_key'), '') is not null,
    updated_at = now()
  where key = v_key;
  return v_key;
end;
$$;

-- Switching a rule On starts its clock: nobody whose time came before this moment is messaged (unless include_past).
create or replace function public.admin_set_automation(p_key text, p_campaign text, p_enabled boolean, p_template text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can change automations' using errcode = '42501'; end if;
  update public.automation_rules set campaign = nullif(trim(p_campaign), ''), template_key = nullif(trim(p_template), ''),
    enabled_at = case when p_enabled and not enabled then now() else enabled_at end,
    enabled = p_enabled, updated_at = now()
  where key = p_key;
  if not found then raise exception 'Unknown automation'; end if;
end;
$$;

-- Delete a custom rule that never sent anything (otherwise turn it Off: its history stays).
create function public.admin_delete_custom_rule(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can delete automations' using errcode = '42501'; end if;
  if exists (select 1 from public.message_queue where rule_key = p_key) then
    raise exception 'rule_has_history';
  end if;
  delete from public.automation_rules where key = p_key and custom;
  if not found then raise exception 'Unknown rule'; end if;
end;
$$;

revoke all on function public.custom_targets(public.automation_rules), public.automation_custom_tick(), public.admin_custom_preview(text),
  public.admin_save_custom_rule(jsonb), public.admin_delete_custom_rule(text), public.admin_set_automation(text, text, boolean, text)
  from public, anon;
revoke all on function public.custom_targets(public.automation_rules), public.automation_custom_tick() from authenticated;
grant execute on function public.automation_custom_tick() to service_role;
grant execute on function public.admin_custom_preview(text), public.admin_save_custom_rule(jsonb),
  public.admin_delete_custom_rule(text), public.admin_set_automation(text, text, boolean, text) to authenticated;
