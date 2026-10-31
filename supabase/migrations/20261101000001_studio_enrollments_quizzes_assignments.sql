-- Studio: website enrollments, module quizzes and assignments.
--
-- Payments happen on the website (beyondtatva.in), not in the LMS. The website tells the LMS about each
-- paid enrollment (email and/or parent phone); the student gets access when they sign in with either.
-- This replaces the LMS's own Razorpay checkout from 20261031000001 (never used; the tables are empty).

-- ── 0. Remove the in-LMS checkout ────────────────────────────────────────────

drop function public.apply_payment_event(text, text, text, text, int, boolean, jsonb);
drop table public.payment_events;
drop table public.payment_orders;
drop table public.coupons;

-- ── 1. Shared helpers ────────────────────────────────────────────────────────

-- Indian mobile → +91XXXXXXXXXX, or null if it isn't one.
create function public.normalize_phone(p text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if length(v) = 12 and left(v, 2) = '91' then v := right(v, 10); end if;
  if length(v) = 11 and left(v, 1) = '0' then v := right(v, 10); end if;
  return case when v ~ '^[6-9][0-9]{9}$' then '+91' || v end;
end;
$$;

-- A module is open to the viewer once it has premiered and is free or unlocked.
create function public.can_open_chapter(p_chapter uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chapters ch
    where ch.id = p_chapter
      and (public.is_admin() or (
        coalesce(ch.release_at, now()) <= now()
        and (ch.is_free or public.has_course_access(ch.course_id))
      ))
  );
$$;

-- ── 1b. Studio admins ────────────────────────────────────────────────────────
-- The only way to be an admin. Each entry is a full email ('name@gmail.com') or a whole domain
-- ('@beyondtatva.in'). There are no policies, so the app can't read or change it; rows are added
-- from the Supabase dashboard (SQL editor) only. Removing an entry removes Studio access at once.
create table public.studio_admins (
  entry text primary key check (entry = lower(entry) and entry ~ '^([^@\s]+)?@[a-z0-9.-]+\.[a-z]{2,}$'),
  added_at timestamptz not null default now()
);
alter table public.studio_admins enable row level security;
revoke all on public.studio_admins from anon, authenticated;

-- Is this verified email on the list (exactly, or by its domain)?
create function public.on_studio_list(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_email is not null and exists (
    select 1 from public.studio_admins
    where entry = lower(p_email) or entry = '@' || split_part(lower(p_email), '@', 2)
  );
$$;

-- Admin = admin profile AND a verified login email that is still on the list.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = (select auth.uid()) and p.role = 'admin'
      and u.email_confirmed_at is not null and public.on_studio_list(u.email)
  );
$$;

-- Called after sign-in when the account has no profile yet: listed, verified emails become admin
-- directly (no student/parent/teacher onboarding). Returns true when an admin profile was created.
create function public.claim_studio_admin() returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_email text; v_name text;
begin
  if v_uid is null or exists (select 1 from public.profiles where id = v_uid) then return false; end if;
  select lower(email), coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1)) into v_email, v_name
  from auth.users where id = v_uid and email_confirmed_at is not null;
  if not public.on_studio_list(v_email) then return false; end if;
  insert into public.profiles (id, role, full_name) values (v_uid, 'admin', left(v_name, 80));
  return true;
end;
$$;

-- ── 2. Website enrollments ───────────────────────────────────────────────────

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id),
  reference text not null unique,                 -- website payment id (pay_...) or manual-...
  email text check (email = lower(email)),
  phone text check (phone ~ '^\+91[6-9][0-9]{9}$'),
  student_name text,
  parent_name text,
  amount_paise int,
  source text not null default 'website' check (source in ('website', 'manual')),
  status text not null default 'pending' check (status in ('pending', 'claimed', 'revoked')),
  claimed_by uuid references public.profiles (id) on delete set null,
  matched_by text check (matched_by in ('email', 'phone', 'parent_phone', 'admin')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  revoked_at timestamptz,
  constraint purchase_contact check (email is not null or phone is not null)
);
create index on public.purchases (email) where status = 'pending';
create index on public.purchases (phone) where status = 'pending';
create index on public.purchases (claimed_by);

alter table public.purchases enable row level security;
create policy "read own or admin purchases" on public.purchases for select to authenticated
  using (claimed_by = (select auth.uid()) or (select public.is_admin()));
-- Writes only through the functions below.

-- Gives the purchase's course to a student. Internal; callers check who may do this.
create function public._grant_purchase(p_purchase uuid, p_student uuid, p_matched_by text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.purchases;
begin
  update public.purchases set status = 'claimed', claimed_by = p_student, matched_by = p_matched_by, claimed_at = now()
  where id = p_purchase and status = 'pending'
  returning * into v;
  if v.id is null then return; end if;
  insert into public.course_access (student_id, course_id, source, reference)
  values (p_student, v.course_id, 'payment', v.reference)
  on conflict (student_id, course_id) do nothing;
end;
$$;

-- Records an enrollment and unlocks it at once if exactly one student account matches.
-- Email (verified at login) wins; otherwise a phone that matches one student only.
create function public._record_purchase(
  p_reference text, p_email text, p_phone text, p_student_name text, p_parent_name text,
  p_amount_paise int, p_course text, p_source text, p_created_by uuid
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_email text := nullif(lower(trim(p_email)), '');
  v_phone text := public.normalize_phone(p_phone);
  v_match uuid;
  v_by text;
  v_n int;
begin
  if coalesce(trim(p_reference), '') = '' then raise exception 'reference is required'; end if;
  if v_email is null and v_phone is null then raise exception 'An email or a valid Indian mobile number is required'; end if;
  if not exists (select 1 from public.courses where id = p_course) then raise exception 'Unknown course %', p_course; end if;

  insert into public.purchases (course_id, reference, email, phone, student_name, parent_name, amount_paise, source, created_by)
  values (p_course, trim(p_reference), v_email, v_phone, nullif(trim(p_student_name), ''), nullif(trim(p_parent_name), ''), p_amount_paise, p_source, p_created_by)
  on conflict (reference) do nothing
  returning id into v_id;
  if v_id is null then
    return (select case status when 'claimed' then 'already_claimed' when 'revoked' then 'already_revoked' else 'duplicate' end
            from public.purchases where reference = trim(p_reference));
  end if;

  if v_email is not null then
    select p.id into v_match from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and lower(u.email) = v_email limit 1;
    v_by := 'email';
  end if;
  if v_match is null and v_phone is not null then
    select count(*), min(p.id::text)::uuid into v_n, v_match from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and public.normalize_phone(u.phone) = v_phone;
    v_by := 'phone';
    if v_n <> 1 then
      select count(*), min(p.id::text)::uuid into v_n, v_match from public.profiles p
      where p.role = 'student' and p.guardian_phone = v_phone;
      v_by := 'parent_phone';
      if v_n <> 1 then v_match := null; end if;   -- siblings share a parent phone: leave for the student or admin
    end if;
  end if;

  if v_match is null then return 'pending'; end if;
  perform public._grant_purchase(v_id, v_match, v_by);
  return 'claimed';
end;
$$;

-- Server-to-server (website → LMS) with the service role.
create function public.record_purchase(
  p_reference text, p_email text default null, p_phone text default null, p_student_name text default null,
  p_parent_name text default null, p_amount_paise int default null, p_course text default 'ai-for-students'
) returns text
language sql security definer set search_path = '' as $$
  select public._record_purchase(p_reference, p_email, p_phone, p_student_name, p_parent_name, p_amount_paise, p_course, 'website', null);
$$;

-- Refund on the website → access ends, unless the student also has another source of access.
create function public.revoke_purchase(p_reference text) returns text
language plpgsql security definer set search_path = '' as $$
declare v public.purchases;
begin
  update public.purchases set status = 'revoked', revoked_at = coalesce(revoked_at, now())
  where reference = trim(p_reference) returning * into v;
  if v.id is null then return 'unknown'; end if;
  delete from public.course_access where course_id = v.course_id and source = 'payment' and reference = v.reference;
  return 'revoked';
end;
$$;

-- Called for a signed-in student without access: claims a pending purchase made with their
-- login email, login phone or the parent phone they gave at sign-up.
create function public.claim_purchases() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_phone text;
  v_parent text;
  r record;
  n int := 0;
begin
  if v_uid is null then return 0; end if;
  select lower(u.email), public.normalize_phone(u.phone), p.guardian_phone into v_email, v_phone, v_parent
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = v_uid and p.role = 'student';
  if not found then return 0; end if;

  for r in
    select id, case when email = v_email then 'email' when phone = v_phone then 'phone' else 'parent_phone' end as how
    from public.purchases
    where status = 'pending'
      and ((v_email is not null and email = v_email) or (v_phone is not null and phone = v_phone) or (v_parent is not null and phone = v_parent))
    order by (email = v_email) desc nulls last, created_at
    for update skip locked
  loop
    -- One purchase per student per course is enough; leave any others for siblings.
    exit when exists (select 1 from public.course_access a join public.purchases p on p.id = r.id
                      where a.student_id = v_uid and a.course_id = p.course_id);
    perform public._grant_purchase(r.id, v_uid, r.how);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Studio: add an enrollment by hand (UPI, cash, school) or revoke one.
create function public.admin_record_purchase(
  p_email text, p_phone text, p_student_name text default null, p_parent_name text default null,
  p_amount_paise int default null, p_reference text default null
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public._record_purchase(coalesce(nullif(trim(p_reference), ''), 'manual-' || substr(md5(gen_random_uuid()::text), 1, 10)),
    p_email, p_phone, p_student_name, p_parent_name, p_amount_paise, 'ai-for-students', 'manual', (select auth.uid()));
end;
$$;

create function public.admin_revoke_purchase(p_reference text) returns text
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.revoke_purchase(p_reference);
end;
$$;

create function public.admin_assign_purchase(p_purchase uuid, p_student uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then raise exception 'Pick a student account'; end if;
  if not exists (select 1 from public.purchases where id = p_purchase and status = 'pending') then raise exception 'Only pending enrollments can be assigned'; end if;
  perform public._grant_purchase(p_purchase, p_student, 'admin');
end;
$$;

-- Moving access between duplicate accounts now also moves their enrollments.
create or replace function public.admin_move_access(p_from uuid, p_to uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_moved int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_from = p_to then raise exception 'Pick two different accounts'; end if;
  if not exists (select 1 from public.profiles where id = p_to and role = 'student') then
    raise exception 'The account you are moving access to must be a student';
  end if;
  update public.course_access a set student_id = p_to
  where a.student_id = p_from
    and not exists (select 1 from public.course_access b where b.student_id = p_to and b.course_id = a.course_id);
  get diagnostics v_moved = row_count;
  delete from public.course_access where student_id = p_from;
  update public.purchases set claimed_by = p_to where claimed_by = p_from;
  update public.access_keys set redeemed_by = p_to where redeemed_by = p_from;
  return v_moved;
end;
$$;

-- ── 3. Quizzes (one per module) ──────────────────────────────────────────────

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.chapters (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  pass_percent int not null default 60 check (pass_percent between 1 and 100),
  xp int not null default 100 check (xp between 0 and 1000),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null default 0,
  prompt text not null check (char_length(prompt) between 1 and 500),
  options text[] not null check (cardinality(options) between 2 and 6),
  correct_index int not null,
  explanation text check (char_length(explanation) <= 500),
  constraint correct_in_range check (correct_index >= 0 and correct_index < cardinality(options))
);
create index on public.quiz_questions (quiz_id, position);

create table public.quiz_attempts (
  id bigint generated always as identity primary key,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answers int[] not null,
  score int not null,
  total int not null,
  passed boolean not null,
  created_at timestamptz not null default now()
);
create index on public.quiz_attempts (student_id, quiz_id);

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

create policy "read open quizzes" on public.quizzes for select to authenticated
  using ((published and (select public.can_open_chapter(chapter_id))) or (select public.is_admin()));
create policy "admins manage quizzes" on public.quizzes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "read questions of open quizzes" on public.quiz_questions for select to authenticated
  using ((select public.is_admin()) or exists (
    select 1 from public.quizzes q where q.id = quiz_id and q.published and public.can_open_chapter(q.chapter_id)));
create policy "admins manage questions" on public.quiz_questions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Students never receive the answers: only these columns are readable. Studio reads answers via studio_quiz_questions().
revoke select on public.quiz_questions from authenticated, anon;
grant select (id, quiz_id, position, prompt, options) on public.quiz_questions to authenticated;

create policy "read visible attempts" on public.quiz_attempts for select to authenticated
  using ((select public.can_view_student(student_id)));
-- Attempts are written only by submit_quiz().

create function public.studio_quiz_questions(p_quiz uuid)
returns table (id uuid, "position" int, prompt text, options text[], correct_index int, explanation text)
language sql stable security definer set search_path = '' as $$
  select q.id, q.position, q.prompt, q.options, q.correct_index, q.explanation
  from public.quiz_questions q
  where q.quiz_id = p_quiz and public.is_admin()
  order by q.position, q.id;
$$;

-- Marks a quiz on the server and returns the result with the right answers and explanations.
create function public.submit_quiz(p_quiz uuid, p_answers int[]) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_quiz public.quizzes;
  v_total int;
  v_score int := 0;
  v_results json;
  v_passed boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_quiz from public.quizzes where id = p_quiz;
  if v_quiz.id is null or not v_quiz.published or not public.can_open_chapter(v_quiz.chapter_id) then
    raise exception 'This quiz isn''t open for you yet';
  end if;
  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz;
  if v_total = 0 then raise exception 'This quiz has no questions yet'; end if;
  if coalesce(cardinality(p_answers), 0) <> v_total then raise exception 'Answer every question before submitting'; end if;

  with q as (
    select row_number() over (order by position, id) as i, id, correct_index, explanation
    from public.quiz_questions where quiz_id = p_quiz
  )
  select count(*) filter (where p_answers[i] = correct_index),
         json_agg(json_build_object('question_id', id, 'picked', p_answers[i], 'correct_index', correct_index,
                                    'correct', p_answers[i] = correct_index, 'explanation', explanation) order by i)
  into v_score, v_results from q;

  v_passed := v_score * 100 >= v_quiz.pass_percent * v_total;
  if exists (select 1 from public.profiles where id = v_uid and role = 'student') then
    insert into public.quiz_attempts (quiz_id, student_id, answers, score, total, passed)
    values (p_quiz, v_uid, p_answers, v_score, v_total, v_passed);
  end if;
  return json_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'pass_percent', v_quiz.pass_percent,
                           'xp', case when v_passed then v_quiz.xp else 0 end, 'results', v_results);
end;
$$;

-- ── 4. Assignments ───────────────────────────────────────────────────────────

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  instructions text check (char_length(instructions) <= 4000),
  allow_text boolean not null default true,
  allow_link boolean not null default true,
  allow_files boolean not null default false,
  max_marks int not null default 10 check (max_marks between 1 and 100),
  due_at timestamptz,
  position int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  constraint some_answer_type check (allow_text or allow_link or allow_files)
);
create index on public.assignments (chapter_id);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  text_answer text check (char_length(text_answer) <= 5000),
  link_url text check (link_url ~* '^https?://[^\s]+$' and char_length(link_url) <= 500),
  files text[] not null default '{}' check (cardinality(files) <= 5),
  status text not null default 'submitted' check (status in ('submitted', 'graded', 'returned')),
  marks int,
  feedback text check (char_length(feedback) <= 2000),
  graded_at timestamptz,
  graded_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index on public.assignment_submissions (student_id);
create index on public.assignment_submissions (status) where status = 'submitted';

alter table public.assignments enable row level security;
alter table public.assignment_submissions enable row level security;

create policy "read open assignments" on public.assignments for select to authenticated
  using ((published and (select public.can_open_chapter(chapter_id))) or (select public.is_admin()));
create policy "admins manage assignments" on public.assignments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "read visible submissions" on public.assignment_submissions for select to authenticated
  using ((select public.can_view_student(student_id)));
-- Written only by submit_assignment() and grade_submission().

-- Student hands in (or updates) their work. Files must already be uploaded to their own folder.
create function public.submit_assignment(p_assignment uuid, p_text text default null, p_link text default null, p_files text[] default '{}')
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  a public.assignments;
  v_text text := nullif(trim(p_text), '');
  v_link text := nullif(trim(p_link), '');
  v_files text[] := coalesce(p_files, '{}');
  v_id uuid;
  f text;
begin
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then raise exception 'Only students can submit'; end if;
  select * into a from public.assignments where id = p_assignment;
  if a.id is null or not a.published or not public.can_open_chapter(a.chapter_id) then raise exception 'This assignment isn''t open for you yet'; end if;
  if v_text is not null and not a.allow_text then raise exception 'This assignment doesn''t take a written answer'; end if;
  if v_link is not null and not a.allow_link then raise exception 'This assignment doesn''t take a link'; end if;
  if cardinality(v_files) > 0 and not a.allow_files then raise exception 'This assignment doesn''t take files'; end if;
  if v_text is null and v_link is null and cardinality(v_files) = 0 then raise exception 'Add your answer before submitting'; end if;
  if v_link is not null and v_link !~* '^https?://[^\s]+$' then raise exception 'That link should start with https://'; end if;
  foreach f in array v_files loop
    if f !~ ('^' || v_uid::text || '/' || p_assignment::text || '/[^/]+$') then raise exception 'File upload is out of place; try again'; end if;
  end loop;
  if exists (select 1 from public.assignment_submissions where assignment_id = p_assignment and student_id = v_uid and status = 'graded') then
    raise exception 'This has already been marked';
  end if;

  insert into public.assignment_submissions (assignment_id, student_id, text_answer, link_url, files)
  values (p_assignment, v_uid, v_text, v_link, v_files)
  on conflict (assignment_id, student_id) do update
    set text_answer = excluded.text_answer, link_url = excluded.link_url, files = excluded.files,
        status = 'submitted', updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

-- Studio (or the student's teacher) marks a submission, or returns it for another try.
create function public.grade_submission(p_submission uuid, p_marks int, p_feedback text default null, p_return boolean default false)
returns void
language plpgsql security definer set search_path = '' as $$
declare s public.assignment_submissions; v_max int;
begin
  select * into s from public.assignment_submissions where id = p_submission for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if not (public.is_admin() or public.teaches(s.student_id)) then raise exception 'Only Studio or the student''s teacher can mark this'; end if;
  select max_marks into v_max from public.assignments where id = s.assignment_id;
  if not p_return and (p_marks is null or p_marks < 0 or p_marks > v_max) then raise exception 'Marks must be between 0 and %', v_max; end if;
  update public.assignment_submissions
  set status = case when p_return then 'returned' else 'graded' end,
      marks = case when p_return then null else p_marks end,
      feedback = nullif(trim(p_feedback), ''), graded_at = now(), graded_by = (select auth.uid())
  where id = p_submission;
end;
$$;

-- Private bucket for assignment photos/PDFs: students/{uid}/{assignment}/{file}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

create policy "students upload own submission files" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "students replace own submission files" on storage.objects for update to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "students delete own submission files" on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "read visible submission files" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.can_view_student(((storage.foldername(name))[1])::uuid))
  ));

-- ── 5. Studio numbers ────────────────────────────────────────────────────────

create or replace function public.admin_stats() returns json
language sql stable security definer set search_path = '' as $$
  select case when public.is_admin() then json_build_object(
    'students', (select count(*) from public.profiles where role = 'student'),
    'parents', (select count(*) from public.profiles where role = 'parent'),
    'teachers', (select count(*) from public.profiles where role = 'teacher'),
    'schools', (select count(*) from public.schools),
    'unlocked', (select count(*) from public.course_access),
    'keys_total', (select count(*) from public.access_keys),
    'keys_used', (select count(*) from public.access_keys where redeemed_by is not null),
    'lessons_completed', (select count(*) from public.lesson_progress where completed_at is not null),
    'watch_minutes_7d', (select coalesce(sum(seconds), 0) / 60 from public.activity_sessions where started_at > now() - interval '7 days'),
    'enrollments_pending', (select count(*) from public.purchases where status = 'pending'),
    'enrollments_claimed', (select count(*) from public.purchases where status = 'claimed'),
    'to_review', (select count(*) from public.assignment_submissions where status = 'submitted'),
    'quiz_attempts_7d', (select count(*) from public.quiz_attempts where created_at > now() - interval '7 days')
  ) end;
$$;

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke execute on function public._grant_purchase, public._record_purchase, public.record_purchase, public.revoke_purchase
  from public, anon, authenticated;
grant execute on function public.record_purchase, public.revoke_purchase to service_role;

revoke execute on function public.on_studio_list from public, anon, authenticated;
revoke execute on function public.claim_studio_admin, public.claim_purchases, public.admin_record_purchase, public.admin_revoke_purchase,
  public.admin_assign_purchase, public.studio_quiz_questions, public.submit_quiz, public.submit_assignment,
  public.grade_submission, public.can_open_chapter from public, anon;
grant execute on function public.claim_studio_admin, public.claim_purchases, public.admin_record_purchase, public.admin_revoke_purchase,
  public.admin_assign_purchase, public.studio_quiz_questions, public.submit_quiz, public.submit_assignment,
  public.grade_submission, public.can_open_chapter to authenticated;
