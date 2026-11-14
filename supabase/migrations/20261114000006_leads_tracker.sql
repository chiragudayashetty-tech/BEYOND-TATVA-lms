-- School Leads Tracker sync (one Leads tab for every school), 2026-11-14. docs/SHEETS-SYSTEM.md.
-- Separate from the old per-school sheet and the School Outreach sync: its own functions and API route
-- (/api/sheets/leads), so a problem here can't stop the others.
--   • leads.book: which sheet a lead lives in. Existing leads = 'v2' (old, archived sheet). Every new lead
--     (tracker, website, Studio) = 'tracker'. The old sheet's sync no longer gets tracker leads.
--   • tracker_upsert_leads: sheet rows → leads (Next step = status, Short note = next_step).
--   • tracker_snapshot(since): only leads changed since the last pull (+ ones whose payment / sign-up /
--     Module 0 changed), so each 5-minute run stays tiny even at 100 schools. since = null → everything.
--   • sheet_sync_health: when each sheet last talked to the LMS (Studio → Today warns when it stops).
alter table public.leads add column book text not null default 'tracker' check (book in ('v2', 'tracker'));
update public.leads set book = 'v2';
create index leads_book_updated_idx on public.leads (book, updated_at);

create table public.sheet_sync_health (
  book text primary key check (book in ('sheets', 'tracker')),
  last_pull_at timestamptz,
  last_push_at timestamptz,
  last_rows int
);
alter table public.sheet_sync_health enable row level security;
create policy "admins read sync health" on public.sheet_sync_health for select to authenticated using (public.is_admin());

create function public.sheet_sync_seen(p_book text, p_kind text, p_rows int default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.sheet_sync_health (book, last_pull_at, last_push_at, last_rows)
  values (p_book, case when p_kind = 'pull' then now() end, case when p_kind = 'push' then now() end, p_rows)
  on conflict (book) do update set
    last_pull_at = case when p_kind = 'pull' then now() else public.sheet_sync_health.last_pull_at end,
    last_push_at = case when p_kind = 'push' then now() else public.sheet_sync_health.last_push_at end,
    last_rows = coalesce(p_rows, public.sheet_sync_health.last_rows);
$$;
revoke execute on function public.sheet_sync_seen(text, text, int) from public, anon, authenticated;
grant execute on function public.sheet_sync_seen(text, text, int) to service_role;

-- Sheet "Source" (Workshop, Website, WhatsApp…) → leads.source slug.
create function public.source_slug(p text) returns text
language sql immutable set search_path = '' as $$
  select nullif(left(trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9_]+', '-', 'g')), 40), '');
$$;

-- p_rows: [{ row, id, school, student, grade, section, phone, parent, status, note, next_date, do_not_contact,
--            source, sheet: {other columns}, touched: [fields edited by hand] }]
-- → [{ row, id, result: created|matched|updated|error, error?, siblings? }]
create function public.tracker_upsert_leads(p_rows jsonb, p_course text default 'ai-for-students') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; out jsonb := '[]'; v_id uuid; v_phone text; v_name text; v_res text; v_grade smallint; v_sib text;
  v_keep boolean; n_status text; n_note text; n_date date; n_dnc boolean; v_t jsonb;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 500 then raise exception 'rows must be a list of at most 500'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      v_res := null;
      v_phone := public.normalize_phone(r ->> 'phone');
      v_name := nullif(left(trim(coalesce(r ->> 'student', '')), 80), '');
      if v_name is null then raise exception 'Student name is empty'; end if;
      if v_phone is null then raise exception 'Parent phone must be a 10-digit Indian mobile'; end if;
      v_grade := case when (r ->> 'grade') ~ '^\s*\d{1,2}\s*$' and trim(r ->> 'grade')::int between 1 and 12 then trim(r ->> 'grade')::smallint end;
      n_status := nullif(left(trim(coalesce(r ->> 'status', '')), 300), '');
      n_note := nullif(left(trim(coalesce(r ->> 'note', '')), 300), '');
      n_date := public.sheet_date(r ->> 'next_date');
      n_dnc := coalesce((r ->> 'do_not_contact')::boolean, false);
      v_t := case when jsonb_typeof(r -> 'touched') = 'array' then r -> 'touched' end;
      v_id := case when (r ->> 'id') ~ '^[0-9a-f-]{36}$' then (r ->> 'id')::uuid end;
      if v_id is not null and not exists (select 1 from public.leads where id = v_id and course_id = p_course) then v_id := null; end if;
      -- No ID yet: the same child already in the LMS (same parent phone + same name) keeps its record.
      if v_id is null then
        select id into v_id from public.leads
        where phone = v_phone and course_id = p_course and lower(coalesce(student_name, '')) = lower(v_name)
        order by created_at limit 1;
        v_res := case when v_id is not null then 'matched' end;
      end if;
      if v_id is null then
        insert into public.leads (course_id, reference, phone, student_name, parent_name, grade, section, school_name, source, tab, book,
                                  status, next_step, next_date, do_not_contact, sheet, updated_source)
        values (p_course, 'tracker-' || gen_random_uuid(), v_phone, v_name, nullif(left(trim(coalesce(r ->> 'parent', '')), 80), ''), v_grade,
                nullif(upper(left(trim(coalesce(r ->> 'section', '')), 10)), ''), nullif(left(trim(coalesce(r ->> 'school', '')), 120), ''),
                coalesce(public.source_slug(r ->> 'source'), 'sheet'), 'Leads', 'tracker',
                n_status, n_note, n_date, n_dnc, coalesce(r -> 'sheet', '{}'), 'sheet')
        returning id into v_id;
        v_res := 'created';
      else
        -- Logged in Studio and the sheet row hasn't caught up: take only the cells typed by hand.
        select l.updated_source = 'studio' and v_t is not null into v_keep from public.leads l where l.id = v_id;
        update public.leads l set
          phone = v_phone, student_name = v_name,
          parent_name = coalesce(nullif(left(trim(coalesce(r ->> 'parent', '')), 80), ''), l.parent_name),
          grade = coalesce(v_grade, l.grade),
          section = coalesce(nullif(upper(left(trim(coalesce(r ->> 'section', '')), 10)), ''), l.section),
          school_name = coalesce(nullif(left(trim(coalesce(r ->> 'school', '')), 120), ''), l.school_name),
          source = coalesce(public.source_slug(r ->> 'source'), l.source),
          book = 'tracker', tab = 'Leads',
          status = case when not v_keep or v_t ? 'status' then n_status else l.status end,
          next_step = case when not v_keep or v_t ? 'note' then n_note else l.next_step end,
          next_date = case when not v_keep or v_t ? 'next_date' then n_date else l.next_date end,
          do_not_contact = case when not v_keep or v_t ? 'do_not_contact' then n_dnc else l.do_not_contact end,
          sheet = coalesce(r -> 'sheet', l.sheet),
          updated_source = case when v_keep and (
              (not v_t ? 'status' and n_status is distinct from l.status)
              or (not v_t ? 'note' and n_note is distinct from l.next_step)
              or (not v_t ? 'next_date' and n_date is distinct from l.next_date)
              or (not v_t ? 'do_not_contact' and n_dnc is distinct from l.do_not_contact))
            then 'studio' else 'sheet' end
        where l.id = v_id;
        v_res := coalesce(v_res, 'updated');
      end if;
      select string_agg(coalesce(o.student_name, 'no name'), ', ' order by o.student_name) into v_sib
      from public.leads o where o.phone = v_phone and o.course_id = p_course and o.id <> v_id;
      out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', v_res, 'siblings', v_sib);
    exception when others then
      out := out || jsonb_build_object('row', r -> 'row', 'result', 'error', 'error', sqlerrm);
    end;
  end loop;
  return out;
end;
$$;
revoke execute on function public.tracker_upsert_leads(jsonb, text) from public, anon, authenticated;
grant execute on function public.tracker_upsert_leads(jsonb, text) to service_role;

-- Leads for the tracker sheet. p_since = null → all (full pull, also returns every ID so the sheet can drop
-- rows deleted in Studio); else only leads changed since then, or whose account / payment / Module 0 changed.
create function public.tracker_snapshot(p_since timestamptz default null, p_course text default 'ai-for-students') returns jsonb
language sql stable security definer set search_path = '' as $$
  with st as (
    select p.id, public.normalize_phone(p.guardian_phone) gp, public.normalize_phone(p.student_phone) sp, public.normalize_phone(u.phone) up,
           lower(u.email) email, greatest(p.created_at, a.granted_at) as acct_changed
    from public.profiles p join auth.users u on u.id = p.id
    left join public.course_access a on a.student_id = p.id and a.course_id = p_course
    where p.role = 'student'
  ),
  tl as (select * from public.leads where course_id = p_course and book = 'tracker'),
  acct as (select tl.id lead_id, st.* from tl join st on st.id = tl.student_id or tl.phone in (st.gp, st.sp, st.up)),
  free_lessons as (select l.id from public.lessons l join public.chapters c on c.id = l.chapter_id where c.course_id = p_course and c.is_free),
  sys as (
    select tl.id,
      exists (select 1 from acct where acct.lead_id = tl.id) as signed_up,
      exists (select 1 from acct join public.lesson_progress lp on lp.student_id = acct.id
              where acct.lead_id = tl.id and lp.lesson_id in (select id from free_lessons) and lp.completed_at is not null) as module0,
      exists (select 1 from acct join public.course_access a on a.student_id = acct.id and a.course_id = p_course where acct.lead_id = tl.id)
        or exists (select 1 from public.purchases x where x.phone = tl.phone and x.status in ('claimed', 'pending') and x.course_id = p_course) as paid,
      (select acct.email from acct where acct.lead_id = tl.id and acct.id = tl.student_id) as lms_email,
      greatest(tl.updated_at,
        (select max(acct.acct_changed) from acct where acct.lead_id = tl.id),
        (select max(lp.updated_at) from acct join public.lesson_progress lp on lp.student_id = acct.id where acct.lead_id = tl.id),
        (select max(x.created_at) from public.purchases x where x.phone = tl.phone and x.course_id = p_course)) as changed_at
    from tl
  )
  select jsonb_build_object(
    'full', p_since is null,
    'leads', coalesce((select jsonb_agg(jsonb_build_object(
        'id', tl.id, 'school', tl.school_name, 'student', tl.student_name, 'grade', tl.grade, 'section', tl.section,
        'phone', right(tl.phone, 10), 'parent', tl.parent_name, 'status', tl.status, 'note', tl.next_step,
        'next_date', tl.next_date, 'do_not_contact', tl.do_not_contact, 'source', tl.source,
        'signed_up', s.signed_up, 'module0', s.module0, 'paid', s.paid, 'lms_email', s.lms_email,
        'updated_at', tl.updated_at, 'updated_source', tl.updated_source) order by tl.created_at)
      from tl join sys s on s.id = tl.id where p_since is null or s.changed_at > p_since), '[]'),
    'ids', case when p_since is null then coalesce((select jsonb_agg(id) from tl), '[]') end,
    'schools', case when p_since is null then coalesce((select jsonb_agg(o.name order by o.name) from public.outreach_schools o
        where coalesce(o.status, '') !~* '^(dropped|referral)$'), '[]') end,
    'at', now());
$$;
revoke execute on function public.tracker_snapshot(timestamptz, text) from public, anon, authenticated;
grant execute on function public.tracker_snapshot(timestamptz, text) to service_role;

-- Old per-school sheet: no longer sent tracker leads (it is archived; this keeps it from re-adding them).
-- Done in /api/sheets by filtering on book, so sheet_snapshot itself is unchanged.
