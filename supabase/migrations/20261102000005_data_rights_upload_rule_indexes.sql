-- M4 (rest): Studio can export or delete one student's data (DPDP requests). Leads are kept (owner
-- decision: leads are never deleted); payments are kept for accounts with the student link removed.
-- L1: submission uploads must go to {student}/{assignment}/{file} for an assignment the student can open.
-- L6: indexes for unindexed foreign keys and the pipeline's lead lookups.

-- ── M4: export and delete ────────────────────────────────────────────────────
-- What was deleted, when and by whom. No personal data: the id only.
create table public.data_deletions (
  id bigint generated always as identity primary key,
  student_id uuid not null,
  deleted_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz not null default now(),
  files_removed int not null default 0
);
alter table public.data_deletions enable row level security;
create policy "admins read deletions" on public.data_deletions for select to authenticated using ((select public.is_admin()));

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
    'leads_with_parent_phone', (select coalesce(json_agg(x), '[]') from public.leads x
                                where x.phone = (select guardian_phone from public.profiles where id = p_student))
  ) into v;
  return v;
end;
$$;

-- Deletes the account and everything tied to it (cascade). Returns the storage paths of uploaded files
-- so the server can remove them from the bucket. Type the student's full name to confirm.
create or replace function public.admin_delete_student(p_student uuid, p_confirm_name text) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_files text[];
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select full_name into v_name from public.profiles where id = p_student and role = 'student';
  if v_name is null then raise exception 'Not a student account'; end if;
  if lower(trim(coalesce(p_confirm_name, ''))) <> lower(trim(v_name)) then raise exception 'Type the student''s full name exactly to confirm'; end if;
  select coalesce(array_agg(f), '{}') into v_files
  from public.assignment_submissions s, unnest(s.files) f where s.student_id = p_student;
  -- Payments stay for accounts (claimed_by/suggested_student become null); access, progress, answers,
  -- quiz attempts, submissions, plans, sessions and class places are removed by the cascade.
  delete from auth.users where id = p_student;
  insert into public.data_deletions (student_id, deleted_by, files_removed) values (p_student, (select auth.uid()), cardinality(v_files));
  return v_files;
end;
$$;

revoke execute on function public.admin_export_student, public.admin_delete_student from public, anon;
grant execute on function public.admin_export_student, public.admin_delete_student to authenticated;

-- ── L1: upload path rule ─────────────────────────────────────────────────────
create or replace function public.can_upload_submission(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (storage.foldername(p_name))[1] = (select auth.uid())::text
     and cardinality(storage.foldername(p_name)) = 2
     and (storage.foldername(p_name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student')
     and exists (select 1 from public.assignments a where a.id = ((storage.foldername(p_name))[2])::uuid
                 and a.published and a.allow_files and public.can_open_chapter(a.chapter_id));
$$;
revoke execute on function public.can_upload_submission from public, anon;
grant execute on function public.can_upload_submission to authenticated;

drop policy if exists "students upload own submission files" on storage.objects;
drop policy if exists "students replace own submission files" on storage.objects;
create policy "students upload own submission files" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.can_upload_submission(name));
create policy "students replace own submission files" on storage.objects for update to authenticated
  using (bucket_id = 'submissions' and public.can_upload_submission(name))
  with check (bucket_id = 'submissions' and public.can_upload_submission(name));

-- ── L6: indexes ──────────────────────────────────────────────────────────────
create index if not exists access_keys_course_id_idx on public.access_keys (course_id);
create index if not exists access_keys_created_by_idx on public.access_keys (created_by);
create index if not exists assignment_submissions_graded_by_idx on public.assignment_submissions (graded_by);
create index if not exists classes_school_id_idx on public.classes (school_id);
create index if not exists purchases_course_id_idx on public.purchases (course_id);
create index if not exists purchases_created_by_idx on public.purchases (created_by);
create index if not exists quiz_attempts_quiz_id_idx on public.quiz_attempts (quiz_id, student_id, created_at);
-- Pipeline: first lead per phone per course.
create index if not exists leads_course_phone_created_idx on public.leads (course_id, phone, created_at);
