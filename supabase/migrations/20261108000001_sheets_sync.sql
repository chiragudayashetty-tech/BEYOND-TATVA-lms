-- Two-way sync with Chirag's two Google Sheets (no copies, one row = one record):
--   "Workshop leads"   ↔ public.leads            (one row per student, any school)
--   "School Outreach"  ↔ public.outreach_schools (one row per school we approach)
-- A small Apps Script in each sheet pushes edited rows (POST /api/sheets) and pulls a snapshot every few
-- minutes (GET /api/sheets). Rows are matched by the hidden "ID" column, never by position or name.
-- Column ownership: outreach columns (status, notes, next step…) belong to the sheet; "Signed up",
-- "Module 0" and "Paid" are computed here and only ever written by the sync.
-- Only the server (service role) calls these functions; Studio admins can read and edit the tables.

-- ── Leads: outreach fields the sheet edits ─────────────────────────────────
alter table public.leads
  add column status text check (char_length(status) <= 300),
  add column next_step text check (char_length(next_step) <= 300),
  add column next_date date,
  add column do_not_contact boolean not null default false,
  add column sheet jsonb not null default '{}' check (jsonb_typeof(sheet) = 'object' and pg_column_size(sheet) <= 16000),
  add column updated_at timestamptz not null default now();

-- ── Outreach schools (prospects), separate from public.schools (login codes) ─
create table public.outreach_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  area text check (char_length(area) <= 160),
  contact text check (char_length(contact) <= 160),
  phone text check (char_length(phone) <= 40),
  status text check (char_length(status) <= 80),
  calls int not null default 0 check (calls between 0 and 10000),
  visits int not null default 0 check (visits between 0 and 10000),
  history text check (char_length(history) <= 4000),
  next_step text check (char_length(next_step) <= 300),
  next_date date,
  notes text check (char_length(notes) <= 2000),
  school_id uuid references public.schools (id) on delete set null,   -- once it becomes an LMS school
  sheet jsonb not null default '{}' check (jsonb_typeof(sheet) = 'object' and pg_column_size(sheet) <= 16000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outreach_schools_school_idx on public.outreach_schools (school_id);
create index outreach_schools_next_idx on public.outreach_schools (next_date);
alter table public.outreach_schools enable row level security;
create policy "admins manage outreach schools" on public.outreach_schools for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.outreach_schools from anon;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger leads_touch before update on public.leads for each row execute function public.touch_updated_at();
create trigger outreach_schools_touch before update on public.outreach_schools for each row execute function public.touch_updated_at();

-- Text cell → date (accepts 2026-11-11, 11/11/2026, "Wed 11 Nov 2026"); null when empty or unreadable.
create or replace function public.sheet_date(p text) returns date
language plpgsql immutable set search_path = '' as $$
declare v text := trim(coalesce(p, ''));
begin
  if v = '' then return null; end if;
  if v ~ '^\d{4}-\d{2}-\d{2}' then return left(v, 10)::date; end if;
  if v ~ '^\d{1,2}/\d{1,2}/\d{4}$' then return to_date(v, 'DD/MM/YYYY'); end if;
  return to_date(regexp_replace(v, '^[A-Za-z]{3,}\s+', ''), 'DD Mon YYYY');
exception when others then return null;
end;
$$;

-- ── Push: upsert lead rows from the sheet ──────────────────────────────────
-- p_rows: [{ "row": 5, "id": "uuid or empty", "student": "...", "grade": "8", "phone": "98450 12345 (verify)",
--            "school": "SRVK", "status": "...", "next_step": "...", "next_date": "...", "do_not_contact": false,
--            "sheet": { other columns } }]
-- Returns [{ "row": 5, "id": "...", "result": "updated|created|matched|error", "error": "...", "duplicate_phone": bool }]
create or replace function public.sheet_upsert_leads(p_rows jsonb, p_course text default 'ai-for-students') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; out jsonb := '[]'; v_id uuid; v_phone text; v_name text; v_res text; v_dup boolean; v_grade smallint;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'rows must be a list of at most 2000'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      v_res := null;
      v_phone := public.normalize_phone(r ->> 'phone');
      v_name := nullif(left(trim(coalesce(r ->> 'student', '')), 80), '');
      v_grade := case when (r ->> 'grade') ~ '^\s*\d{1,2}\s*$' and trim(r ->> 'grade')::int between 1 and 12 then trim(r ->> 'grade')::smallint end;
      v_id := case when (r ->> 'id') ~ '^[0-9a-f-]{36}$' then (r ->> 'id')::uuid end;
      if v_id is not null and not exists (select 1 from public.leads where id = v_id) then v_id := null; end if;
      -- No ID yet: the same student already in Supabase (same phone + name) keeps its record.
      if v_id is null and v_phone is not null then
        select id into v_id from public.leads
        where phone = v_phone and lower(coalesce(student_name, '')) = lower(coalesce(v_name, '')) and course_id = p_course
        order by created_at limit 1;
        v_res := case when v_id is not null then 'matched' end;
      end if;
      if v_id is null then
        if v_phone is null then raise exception 'Parent phone must be a 10-digit Indian mobile'; end if;
        insert into public.leads (course_id, reference, phone, student_name, grade, school_name, source, status, next_step, next_date, do_not_contact, sheet)
        values (p_course, 'sheet-' || gen_random_uuid(), v_phone, v_name, v_grade, nullif(left(trim(coalesce(r ->> 'school', '')), 120), ''), 'sheet',
                nullif(left(r ->> 'status', 300), ''), nullif(left(r ->> 'next_step', 300), ''), public.sheet_date(r ->> 'next_date'),
                coalesce((r ->> 'do_not_contact')::boolean, false), coalesce(r -> 'sheet', '{}'))
        returning id into v_id;
        v_res := 'created';
      else
        update public.leads set
          phone = coalesce(v_phone, phone),
          student_name = coalesce(v_name, student_name),
          grade = coalesce(v_grade, grade),
          school_name = coalesce(nullif(left(trim(coalesce(r ->> 'school', '')), 120), ''), school_name),
          status = nullif(left(r ->> 'status', 300), ''),
          next_step = nullif(left(r ->> 'next_step', 300), ''),
          next_date = public.sheet_date(r ->> 'next_date'),
          do_not_contact = coalesce((r ->> 'do_not_contact')::boolean, do_not_contact),
          sheet = coalesce(r -> 'sheet', sheet)
        where id = v_id;
        v_res := coalesce(v_res, 'updated');
      end if;
      select count(*) > 1 into v_dup from public.leads where phone = (select phone from public.leads where id = v_id) and course_id = p_course;
      out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', v_res, 'duplicate_phone', v_dup);
    exception when others then
      out := out || jsonb_build_object('row', r -> 'row', 'result', 'error', 'error', sqlerrm);
    end;
  end loop;
  return out;
end;
$$;

-- ── Push: upsert outreach school rows ──────────────────────────────────────
create or replace function public.sheet_upsert_schools(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; out jsonb := '[]'; v_id uuid; v_res text; v_name text;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'rows must be a list of at most 2000'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      v_res := null;
      v_name := nullif(left(trim(coalesce(r ->> 'name', '')), 160), '');
      if v_name is null then raise exception 'School name is empty'; end if;
      v_id := case when (r ->> 'id') ~ '^[0-9a-f-]{36}$' then (r ->> 'id')::uuid end;
      if v_id is not null and not exists (select 1 from public.outreach_schools where id = v_id) then v_id := null; end if;
      if v_id is null then select id into v_id from public.outreach_schools where lower(name) = lower(v_name) limit 1; v_res := case when v_id is not null then 'matched' end; end if;
      if v_id is null then
        insert into public.outreach_schools (name) values (v_name) returning id into v_id; v_res := 'created';
      end if;
      update public.outreach_schools set
        name = v_name,
        area = nullif(left(r ->> 'area', 160), ''), contact = nullif(left(r ->> 'contact', 160), ''), phone = nullif(left(r ->> 'phone', 40), ''),
        status = nullif(left(r ->> 'status', 80), ''),
        calls = case when (r ->> 'calls') ~ '^\s*\d{1,4}\s*$' then trim(r ->> 'calls')::int else 0 end,
        visits = case when (r ->> 'visits') ~ '^\s*\d{1,4}\s*$' then trim(r ->> 'visits')::int else 0 end,
        history = nullif(left(r ->> 'history', 4000), ''), next_step = nullif(left(r ->> 'next_step', 300), ''),
        next_date = public.sheet_date(r ->> 'next_date'), notes = nullif(left(r ->> 'notes', 2000), ''),
        sheet = coalesce(r -> 'sheet', sheet)
      where id = v_id;
      out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', coalesce(v_res, 'updated'));
    exception when others then
      out := out || jsonb_build_object('row', r -> 'row', 'result', 'error', 'error', sqlerrm);
    end;
  end loop;
  return out;
end;
$$;

-- ── Pull: everything the sheets show, with system columns computed here ────
-- Leads are linked to a student account by parent phone (onboarding) or the student's own phone.
create or replace function public.sheet_snapshot(p_course text default 'ai-for-students') returns jsonb
language sql stable security definer set search_path = '' as $$
  with st as (
    select p.id, public.normalize_phone(p.guardian_phone) gp, p.student_phone sp, public.normalize_phone(u.phone) up
    from public.profiles p join auth.users u on u.id = p.id where p.role = 'student'
  ),
  free_lessons as (
    select l.id from public.lessons l join public.chapters c on c.id = l.chapter_id where c.course_id = p_course and c.is_free
  ),
  lead_sys as (
    select l.id,
      exists (select 1 from st where l.phone in (st.gp, st.sp, st.up)) as signed_up,
      exists (select 1 from st join public.lesson_progress lp on lp.student_id = st.id
              where l.phone in (st.gp, st.sp, st.up) and lp.lesson_id in (select id from free_lessons) and lp.completed_at is not null) as module0_done,
      exists (select 1 from st join public.course_access a on a.student_id = st.id and a.course_id = p_course
              where l.phone in (st.gp, st.sp, st.up))
        or exists (select 1 from public.purchases x where x.phone = l.phone and x.status in ('claimed', 'pending') and x.course_id = p_course) as paid
    from public.leads l where l.course_id = p_course
  )
  select jsonb_build_object(
    'leads', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'student', l.student_name, 'grade', l.grade, 'phone', right(l.phone, 10), 'school', l.school_name,
        'status', l.status, 'next_step', l.next_step, 'next_date', l.next_date, 'do_not_contact', l.do_not_contact,
        'signed_up', s.signed_up, 'module0', s.module0_done, 'paid', s.paid, 'source', l.source, 'updated_at', l.updated_at)
        order by l.created_at)
      from public.leads l join lead_sys s on s.id = l.id), '[]'),
    'schools', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'area', o.area, 'contact', o.contact, 'phone', o.phone, 'status', o.status,
        'calls', o.calls, 'visits', o.visits, 'history', o.history, 'next_step', o.next_step, 'next_date', o.next_date,
        'notes', o.notes, 'updated_at', o.updated_at) order by o.created_at)
      from public.outreach_schools o), '[]'),
    'at', now());
$$;

revoke execute on function public.sheet_upsert_leads(jsonb, text), public.sheet_upsert_schools(jsonb), public.sheet_snapshot(text)
  from public, anon, authenticated;
grant execute on function public.sheet_upsert_leads(jsonb, text), public.sheet_upsert_schools(jsonb), public.sheet_snapshot(text) to service_role;
