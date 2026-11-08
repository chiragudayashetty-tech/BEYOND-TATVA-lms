-- Workshop leads spreadsheet = one tab per source: one tab per school workshop ("SRVK", "Durga EMS", …),
-- "Website" (website form + Loki chat), "Manual" (anything else). A lead's tab is stored (leads.tab) or derived.
-- True duplicates (same parent phone + same child name, or one of them has no child name) are merged
-- automatically: the oldest row is kept, empty fields are filled from the copy, notes and workshop
-- registrations move over, the copy is deleted. Same phone + different names = siblings: both kept.

alter table public.leads add column tab text check (char_length(tab) between 1 and 60);

create or replace function public.lead_tab(p_tab text, p_source text, p_school text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(trim(p_tab), ''),
    case when p_source in ('loki', 'website', 'module0', 'qr', 'schools', 'web') then 'Website'
         when nullif(trim(p_school), '') is not null then left(trim(p_school), 60)
         else 'Manual' end);
$$;

-- Merge true duplicates. Returns how many copies were merged away.
create or replace function public.sheet_merge_duplicates(p_course text default 'ai-for-students') returns int
language plpgsql security definer set search_path = '' as $$
declare k public.leads; d public.leads; n int := 0;
begin
  loop
    select l.* into d from public.leads l
    where l.course_id = p_course and exists (
      select 1 from public.leads o
      where o.course_id = l.course_id and o.phone = l.phone and o.id <> l.id
        and (o.created_at, o.id) < (l.created_at, l.id)
        and (lower(coalesce(o.student_name, '')) = lower(coalesce(l.student_name, '')) or o.student_name is null or l.student_name is null))
    order by l.created_at limit 1;
    exit when d.id is null;
    select o.* into k from public.leads o
    where o.course_id = d.course_id and o.phone = d.phone and o.id <> d.id and (o.created_at, o.id) < (d.created_at, d.id)
      and (lower(coalesce(o.student_name, '')) = lower(coalesce(d.student_name, '')) or o.student_name is null or d.student_name is null)
    order by o.created_at limit 1;
    update public.crm_notes set lead_id = k.id where lead_id = d.id;
    update public.workshop_registrations set lead_id = k.id where lead_id = d.id;
    update public.leads set
      student_name = coalesce(k.student_name, d.student_name),
      parent_name = coalesce(k.parent_name, d.parent_name),
      grade = coalesce(k.grade, d.grade),
      school_name = coalesce(k.school_name, d.school_name),
      status = coalesce(k.status, d.status),
      next_step = coalesce(k.next_step, d.next_step),
      next_date = coalesce(k.next_date, d.next_date),
      student_id = coalesce(k.student_id, d.student_id),
      do_not_contact = k.do_not_contact or d.do_not_contact,
      details = d.details || k.details,
      sheet = d.sheet || k.sheet,
      -- A school workshop tab is more specific than Website/Manual: keep the lead there.
      tab = case when public.lead_tab(k.tab, k.source, k.school_name) in ('Website', 'Manual')
                  and public.lead_tab(d.tab, d.source, d.school_name) not in ('Website', 'Manual')
                 then public.lead_tab(d.tab, d.source, d.school_name) else k.tab end
    where id = k.id;
    delete from public.leads where id = d.id;
    n := n + 1;
    d := null;
  end loop;
  return n;
end;
$$;

-- Push: same as before, plus the tab the row lives in.
create or replace function public.sheet_upsert_leads(p_rows jsonb, p_course text default 'ai-for-students') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; out jsonb := '[]'; v_id uuid; v_phone text; v_name text; v_res text; v_grade smallint; v_tab text; v_school text; v_sib text;
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
        insert into public.leads (course_id, reference, phone, student_name, grade, school_name, source, tab, status, next_step, next_date, do_not_contact, sheet)
        values (p_course, 'sheet-' || gen_random_uuid(), v_phone, v_name, v_grade, v_school, 'sheet', v_tab,
                nullif(left(r ->> 'status', 300), ''), nullif(left(r ->> 'next_step', 300), ''), public.sheet_date(r ->> 'next_date'),
                coalesce((r ->> 'do_not_contact')::boolean, false), coalesce(r -> 'sheet', '{}'))
        returning id into v_id;
        v_res := 'created';
      else
        update public.leads set
          phone = coalesce(v_phone, phone),
          student_name = coalesce(v_name, student_name),
          grade = coalesce(v_grade, grade),
          school_name = coalesce(v_school, school_name),
          tab = coalesce(v_tab, tab),
          status = nullif(left(r ->> 'status', 300), ''),
          next_step = nullif(left(r ->> 'next_step', 300), ''),
          next_date = public.sheet_date(r ->> 'next_date'),
          do_not_contact = coalesce((r ->> 'do_not_contact')::boolean, do_not_contact),
          sheet = coalesce(r -> 'sheet', sheet)
        where id = v_id;
        v_res := coalesce(v_res, 'updated');
      end if;
      -- Siblings: same parent phone, different child. Name them so the note is useful.
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

-- Snapshot: as before, plus each lead's tab and source.
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
        'signed_up', s.signed_up, 'module0', s.module0_done, 'paid', s.paid, 'lms_email', s.lms_email, 'updated_at', l.updated_at)
        order by l.created_at)
      from public.leads l join lead_sys s on s.id = l.id), '[]'),
    'schools', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'area', o.area, 'contact', o.contact, 'phone', o.phone, 'status', o.status,
        'calls', o.calls, 'visits', o.visits, 'history', o.history, 'next_step', o.next_step, 'next_date', o.next_date,
        'notes', o.notes, 'updated_at', o.updated_at) order by o.created_at)
      from public.outreach_schools o), '[]'),
    'at', now());
$$;

revoke execute on function public.sheet_merge_duplicates(text) from public, anon, authenticated;
grant execute on function public.sheet_merge_duplicates(text) to service_role;
