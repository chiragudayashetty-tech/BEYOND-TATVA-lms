-- Link a lead to the exact LMS account when phone matching can't (e.g. the other parent paid, or the
-- student signed up twice). The sheet's "LMS email" column sets it; Studio can set it too.
alter table public.leads add column student_id uuid references public.profiles (id) on delete set null;
create index leads_student_idx on public.leads (student_id);

-- Push: same as before, plus "lms_email" → student_id (only an existing student account; unknown email = row note).
create or replace function public.sheet_link_lead(p_lead uuid, p_email text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
begin
  if v_email is null then update public.leads set student_id = null where id = p_lead and student_id is not null; return 'none'; end if;
  select p.id into v_student from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = v_email and p.role = 'student' limit 1;
  if v_student is null then return 'unknown_email'; end if;
  update public.leads set student_id = v_student where id = p_lead and student_id is distinct from v_student;
  return 'linked';
end;
$$;

-- Snapshot: a lead's accounts = the linked one, plus any matched by parent/student/login phone.
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
        'id', l.id, 'student', l.student_name, 'grade', l.grade, 'phone', right(l.phone, 10), 'school', l.school_name,
        'status', l.status, 'next_step', l.next_step, 'next_date', l.next_date, 'do_not_contact', l.do_not_contact,
        'signed_up', s.signed_up, 'module0', s.module0_done, 'paid', s.paid, 'lms_email', s.lms_email,
        'source', l.source, 'updated_at', l.updated_at)
        order by l.created_at)
      from public.leads l join lead_sys s on s.id = l.id), '[]'),
    'schools', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'area', o.area, 'contact', o.contact, 'phone', o.phone, 'status', o.status,
        'calls', o.calls, 'visits', o.visits, 'history', o.history, 'next_step', o.next_step, 'next_date', o.next_date,
        'notes', o.notes, 'updated_at', o.updated_at) order by o.created_at)
      from public.outreach_schools o), '[]'),
    'at', now());
$$;

revoke execute on function public.sheet_link_lead(uuid, text) from public, anon, authenticated;
grant execute on function public.sheet_link_lead(uuid, text) to service_role;
