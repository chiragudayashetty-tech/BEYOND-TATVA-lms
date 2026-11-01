-- Study planner saved to the student's account (it used to live only on one device).
-- Adapted from the isolated Codex copy (codex/lms-completion-isolated), renamed so its version
-- doesn't clash with 20261101000001_studio_enrollments_quizzes_assignments.sql.

create table public.study_plans (
  student_id uuid not null references public.profiles (id) on delete cascade,
  plan_date date not null,
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 30 and pg_column_size(items) <= 16384),
  updated_at timestamptz not null default now(),
  primary key (student_id, plan_date)
);

alter table public.study_plans enable row level security;

create policy "students read own study plans" on public.study_plans for select to authenticated
  using (student_id = (select auth.uid()));
create policy "students create own study plans" on public.study_plans for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student')
  );
create policy "students update own study plans" on public.study_plans for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student')
  );
create policy "admins manage study plans" on public.study_plans for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
