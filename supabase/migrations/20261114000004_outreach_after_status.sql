-- School outreach, 2026-11-14 (Chirag split the sheet's status in two):
--   "Workshop Status"       → outreach_schools.status        (sales pipeline: Called, Meeting, Workshop confirmed, …)
--   "After-workshop Status" → outreach_schools.after_status  (once the workshop is done: Following up, Closed, Partner)
-- The sheet sends after_status only when it has that column (older sheets keep the LMS value).
alter table public.outreach_schools add column after_status text check (char_length(after_status) <= 80);

create or replace function public.sheet_upsert_schools(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; out jsonb := '[]'; v_id uuid; v_name text; v_ver timestamptz; v_cur timestamptz;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'rows must be a list of at most 2000'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      v_name := nullif(left(trim(coalesce(r ->> 'name', '')), 160), '');
      if v_name is null then raise exception 'School name is empty'; end if;
      v_id := case when (r ->> 'id') ~ '^[0-9a-f-]{36}$' then (r ->> 'id')::uuid end;
      v_ver := case when nullif(trim(coalesce(r ->> 'version', '')), '') is not null then (r ->> 'version')::timestamptz end;
      select updated_at into v_cur from public.outreach_schools where id = v_id;
      if v_id is not null and v_cur is null then                                -- deleted in Studio: the next pull removes the row
        out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', 'deleted');
        continue;
      end if;

      if v_id is null then
        select id, updated_at into v_id, v_cur from public.outreach_schools where lower(name) = lower(v_name) limit 1;
        if v_id is not null then
          out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', 'exists', 'version', v_cur);
          continue;
        end if;
        insert into public.outreach_schools (name) values (v_name) returning id into v_id;
      elsif v_ver is null or v_cur > v_ver then
        out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', 'stale', 'version', v_cur);
        continue;
      end if;

      update public.outreach_schools set
        name = v_name,
        area = nullif(left(r ->> 'area', 160), ''), contact = nullif(left(r ->> 'contact', 160), ''), phone = nullif(left(r ->> 'phone', 40), ''),
        status = nullif(left(r ->> 'status', 80), ''),
        after_status = case when r ? 'after_status' then nullif(left(trim(r ->> 'after_status'), 80), '') else after_status end,
        next_step = nullif(left(r ->> 'next_step', 300), ''),
        next_date = public.sheet_date(r ->> 'next_date'), notes = nullif(left(r ->> 'notes', 2000), ''),
        sheet = coalesce(r -> 'sheet', sheet)
      where id = v_id
      returning updated_at into v_cur;
      out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'version', v_cur,
        'result', case when v_ver is null then 'created' else 'updated' end);
    exception when others then
      out := out || jsonb_build_object('row', r -> 'row', 'result', 'error', 'error', sqlerrm);
    end;
  end loop;
  return out;
end;
$$;
revoke execute on function public.sheet_upsert_schools(jsonb) from public, anon, authenticated;
grant execute on function public.sheet_upsert_schools(jsonb) to service_role;

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
        'id', o.id, 'name', o.name, 'area', o.area, 'contact', o.contact, 'phone', o.phone, 'status', o.status, 'after_status', o.after_status,
        'calls', o.calls, 'visits', o.visits, 'history', o.history, 'next_step', o.next_step, 'next_date', o.next_date,
        'notes', o.notes, 'updated_at', o.updated_at) order by o.created_at)
      from public.outreach_schools o), '[]'),
    'at', now());
$$;
revoke execute on function public.sheet_snapshot(text) from public, anon, authenticated;
grant execute on function public.sheet_snapshot(text) to service_role;
