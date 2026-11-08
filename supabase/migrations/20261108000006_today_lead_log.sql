-- Studio → Today: log lead contacts and send them back to the Workshop leads sheet.
-- (Schools: 20261108000004 already makes the LMS the main record for outreach_schools; untouched here.)
-- leads.updated_source says who wrote a lead's outreach fields last: 'sheet' (a sheet push) or 'studio'
-- (a Today log). The sheet script writes Studio values back into the sheet only for 'studio' leads
-- (last write wins: a later edit in the sheet pushes and flips the lead back to 'sheet').
-- No data loss on a stale sheet: a push from a single edit carries "touched" (the fields edited). For a
-- 'studio' lead only touched fields are taken; the rest keep the Studio value, and the lead stays 'studio'
-- while the sheet still shows something older, so the next pull writes it in.

alter table public.leads add column updated_source text not null default 'sheet' check (updated_source in ('sheet', 'studio'));

-- ── Push: leads (same as 20261108000003, plus updated_source / touched) ────
create or replace function public.sheet_upsert_leads(p_rows jsonb, p_course text default 'ai-for-students') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; out jsonb := '[]'; v_id uuid; v_phone text; v_name text; v_res text; v_grade smallint; v_tab text; v_school text; v_sib text;
  v_keep boolean; n_status text; n_step text; n_date date; n_dnc boolean;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'rows must be a list of at most 2000'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      v_res := null;
      v_phone := public.normalize_phone(r ->> 'phone');
      v_name := nullif(left(trim(coalesce(r ->> 'student', '')), 80), '');
      v_grade := case when (r ->> 'grade') ~ '^\s*\d{1,2}\s*$' and trim(r ->> 'grade')::int between 1 and 12 then trim(r ->> 'grade')::smallint end;
      v_tab := nullif(left(trim(coalesce(r ->> 'tab', '')), 60), '');
      v_school := coalesce(nullif(left(trim(coalesce(r ->> 'school', '')), 120), ''), case when v_tab not in ('Website', 'Manual') then v_tab end);
      n_status := nullif(left(r ->> 'status', 300), '');
      n_step := nullif(left(r ->> 'next_step', 300), '');
      n_date := public.sheet_date(r ->> 'next_date');
      v_id := case when (r ->> 'id') ~ '^[0-9a-f-]{36}$' then (r ->> 'id')::uuid end;
      if v_id is not null and not exists (select 1 from public.leads where id = v_id) then v_id := null; end if;
      if v_id is null and v_phone is not null then
        select id into v_id from public.leads
        where phone = v_phone and course_id = p_course
          and (lower(coalesce(student_name, '')) = lower(coalesce(v_name, '')) or student_name is null)
        order by created_at limit 1;
        v_res := case when v_id is not null then 'matched' end;
      end if;
      if v_id is null then
        if v_phone is null then raise exception 'Parent phone must be a 10-digit Indian mobile'; end if;
        insert into public.leads (course_id, reference, phone, student_name, grade, school_name, source, tab, status, next_step, next_date, do_not_contact, sheet, updated_source)
        values (p_course, 'sheet-' || gen_random_uuid(), v_phone, v_name, v_grade, v_school, 'sheet', v_tab, n_status, n_step, n_date,
                coalesce((r ->> 'do_not_contact')::boolean, false), coalesce(r -> 'sheet', '{}'), 'sheet')
        returning id into v_id;
        v_res := 'created';
      else
        select l.updated_source = 'studio' and jsonb_typeof(r -> 'touched') = 'array' into v_keep from public.leads l where l.id = v_id;
        n_dnc := (r ->> 'do_not_contact')::boolean;
        update public.leads l set
          phone = coalesce(v_phone, phone),
          student_name = coalesce(v_name, student_name),
          grade = coalesce(v_grade, grade),
          school_name = coalesce(v_school, school_name),
          tab = coalesce(v_tab, tab),
          status = case when not v_keep or r -> 'touched' ? 'status' then n_status else l.status end,
          next_step = case when not v_keep or r -> 'touched' ? 'next_step' then n_step else l.next_step end,
          next_date = case when not v_keep or r -> 'touched' ? 'next_date' then n_date else l.next_date end,
          do_not_contact = case when not v_keep or r -> 'touched' ? 'do_not_contact' then coalesce(n_dnc, l.do_not_contact) else l.do_not_contact end,
          sheet = coalesce(r -> 'sheet', sheet),
          -- still 'studio' while an untouched cell in the sheet is older than the Studio value
          updated_source = case when v_keep and (
              (not r -> 'touched' ? 'status' and n_status is distinct from l.status)
              or (not r -> 'touched' ? 'next_step' and n_step is distinct from l.next_step)
              or (not r -> 'touched' ? 'next_date' and n_date is distinct from l.next_date)
              or (not r -> 'touched' ? 'do_not_contact' and coalesce(n_dnc, l.do_not_contact) is distinct from l.do_not_contact))
            then 'studio' else 'sheet' end
        where l.id = v_id;
        v_res := coalesce(v_res, 'updated');
      end if;
      select string_agg(coalesce(o.student_name, 'no name') || ' (' || public.lead_tab(o.tab, o.source, o.school_name) || ')', ', ')
        into v_sib from public.leads o
      where o.phone = (select phone from public.leads where id = v_id) and o.course_id = p_course and o.id <> v_id;
      out := out || jsonb_build_object('row', r -> 'row', 'tab', r -> 'tab', 'id', v_id, 'result', v_res,
                                       'duplicate_phone', v_sib is not null, 'siblings', v_sib);
    exception when others then
      out := out || jsonb_build_object('row', r -> 'row', 'tab', r -> 'tab', 'result', 'error', 'error', sqlerrm);
    end;
  end loop;
  return out;
end;
$$;

-- ── Snapshot: as 20261108000003, plus updated_source for leads ──
create or replace function public.sheet_snapshot(p_course text default 'ai-for-students') returns jsonb
language sql stable security definer set search_path = '' as $$
  with st as (
    select p.id, public.normalize_phone(p.guardian_phone) gp, p.student_phone sp, public.normalize_phone(u.phone) up, lower(u.email) email
    from public.profiles p join auth.users u on u.id = p.id where p.role = 'student'
  ),
  free_lessons as (
    select l.id from public.lessons l join public.chapters c on c.id = l.chapter_id where c.course_id = p_course and c.is_free
  ),
  acct as (
    select l.id lead_id, st.id student_id from public.leads l join st on st.id = l.student_id or l.phone in (st.gp, st.sp, st.up)
    where l.course_id = p_course
  ),
  lead_sys as (
    select l.id,
      exists (select 1 from acct where acct.lead_id = l.id) as signed_up,
      exists (select 1 from acct join public.lesson_progress lp on lp.student_id = acct.student_id
              where acct.lead_id = l.id and lp.lesson_id in (select id from free_lessons) and lp.completed_at is not null) as module0_done,
      exists (select 1 from acct join public.course_access a on a.student_id = acct.student_id and a.course_id = p_course where acct.lead_id = l.id)
        or exists (select 1 from public.purchases x where x.phone = l.phone and x.status in ('claimed', 'pending') and x.course_id = p_course) as paid,
      (select st.email from st where st.id = l.student_id) as lms_email
    from public.leads l where l.course_id = p_course
  )
  select jsonb_build_object(
    'leads', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'tab', public.lead_tab(l.tab, l.source, l.school_name), 'source', l.source,
        'student', l.student_name, 'parent', l.parent_name, 'grade', l.grade, 'phone', right(l.phone, 10), 'school', l.school_name,
        'status', l.status, 'next_step', l.next_step, 'next_date', l.next_date, 'do_not_contact', l.do_not_contact,
        'signed_up', s.signed_up, 'module0', s.module0_done, 'paid', s.paid, 'lms_email', s.lms_email,
        'updated_at', l.updated_at, 'updated_source', l.updated_source)
        order by l.created_at)
      from public.leads l join lead_sys s on s.id = l.id), '[]'),
    'schools', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'area', o.area, 'contact', o.contact, 'phone', o.phone, 'status', o.status,
        'calls', o.calls, 'visits', o.visits, 'history', o.history, 'next_step', o.next_step, 'next_date', o.next_date,
        'notes', o.notes, 'updated_at', o.updated_at) order by o.created_at)
      from public.outreach_schools o), '[]'),
    'at', now());
$$;

-- ── Studio → Today: log a lead contact ─────────────────────────────────────
-- Inserts a CRM note (follow-up = next date 10:00 IST) and updates the lead's outreach fields.
create or replace function public.admin_log_lead_contact(p_lead uuid, p_channel text, p_note text default null,
  p_status text default null, p_next_step text default null, p_next_date date default null, p_do_not_contact boolean default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb; v_note uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_channel is null or p_channel not in ('call', 'whatsapp', 'visit', 'other') then raise exception 'Channel must be call, whatsapp, visit or other'; end if;
  if char_length(coalesce(p_note, '')) > 1000 then raise exception 'Note is too long (max 1000)'; end if;
  update public.leads l set
    status = coalesce(nullif(left(trim(p_status), 300), ''), l.status),
    next_step = coalesce(nullif(left(trim(p_next_step), 300), ''), l.next_step),
    next_date = coalesce(p_next_date, l.next_date),
    do_not_contact = coalesce(p_do_not_contact, l.do_not_contact),
    updated_source = 'studio'
  where l.id = p_lead
  returning jsonb_build_object('id', l.id, 'status', l.status, 'next_step', l.next_step, 'next_date', l.next_date, 'do_not_contact', l.do_not_contact) into v;
  if v is null then raise exception 'Lead not found'; end if;
  insert into public.crm_notes (lead_id, channel, body, follow_up_at, created_by)
  values (p_lead, p_channel,
          coalesce(nullif(trim(p_note), ''), initcap(p_channel) || coalesce(' · ' || nullif(trim(p_status), ''), '')),
          case when p_next_date is not null then (p_next_date + time '10:00') at time zone 'Asia/Kolkata' end,
          auth.uid())
  returning id into v_note;
  return v || jsonb_build_object('note_id', v_note);
end;
$$;

revoke execute on function public.admin_log_lead_contact(uuid, text, text, text, text, date, boolean) from public, anon;
grant execute on function public.admin_log_lead_contact(uuid, text, text, text, text, date, boolean) to authenticated;
-- create or replace keeps earlier grants; restate the sheet functions' (server only).
revoke execute on function public.sheet_upsert_leads(jsonb, text), public.sheet_snapshot(text) from public, anon, authenticated;
grant execute on function public.sheet_upsert_leads(jsonb, text), public.sheet_snapshot(text) to service_role;
