-- Phase 2 · CRM: notes and follow-ups on Pipeline rows (one person = a student account and/or a website
-- lead). Studio (admins) only. Notes about minors stay short and factual; they're included in
-- Studio → Export and removed with the student on Delete.
create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  channel text check (channel in ('call', 'whatsapp', 'email', 'visit', 'other')),
  follow_up_at timestamptz,
  done_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint crm_note_person check (student_id is not null or lead_id is not null)
);
create index crm_notes_student_idx on public.crm_notes (student_id, created_at desc);
create index crm_notes_lead_idx on public.crm_notes (lead_id, created_at desc);
create index crm_notes_due_idx on public.crm_notes (follow_up_at) where done_at is null and follow_up_at is not null;
create index crm_notes_created_by_idx on public.crm_notes (created_by);

alter table public.crm_notes enable row level security;
create policy "admins manage crm notes" on public.crm_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke all on public.crm_notes from anon;

-- Export includes the notes about the student.
create or replace function public.admin_export_student(p_student uuid) returns json
language plpgsql stable security definer set search_path = '' as $$
declare v json;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then raise exception 'Not a student account'; end if;
  select json_build_object(
    'exported_at', now(),
    'account', (select json_build_object('email', u.email, 'phone', u.phone, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at)
                from auth.users u where u.id = p_student),
    'profile', (select to_json(p) from public.profiles p where p.id = p_student),
    'course_access', (select coalesce(json_agg(a), '[]') from public.course_access a where a.student_id = p_student),
    'purchases', (select coalesce(json_agg(x), '[]') from public.purchases x where x.claimed_by = p_student or x.suggested_student = p_student),
    'lesson_progress', (select coalesce(json_agg(x), '[]') from public.lesson_progress x where x.student_id = p_student),
    'checkpoint_answers', (select coalesce(json_agg(x), '[]') from public.checkpoint_answers x where x.student_id = p_student),
    'quiz_attempts', (select coalesce(json_agg(x), '[]') from public.quiz_attempts x where x.student_id = p_student),
    'assignment_submissions', (select coalesce(json_agg(x), '[]') from public.assignment_submissions x where x.student_id = p_student),
    'study_plans', (select coalesce(json_agg(x), '[]') from public.study_plans x where x.student_id = p_student),
    'activity_sessions', (select coalesce(json_agg(x), '[]') from public.activity_sessions x where x.user_id = p_student),
    'class_enrollments', (select coalesce(json_agg(x), '[]') from public.enrollments x where x.student_id = p_student),
    'crm_notes', (select coalesce(json_agg(x), '[]') from public.crm_notes x where x.student_id = p_student),
    'leads_with_parent_phone', (select coalesce(json_agg(x), '[]') from public.leads x
                                where x.phone = (select guardian_phone from public.profiles where id = p_student))
  ) into v;
  return v;
end;
$$;
