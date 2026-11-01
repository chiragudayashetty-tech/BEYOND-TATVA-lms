-- Funnel pipeline (docs/FUNNEL-PLAN.md, phase 1).
-- 1. Website leads (Loki chat, forms) arrive server-to-server through POST /api/leads.
-- 2. Students remember where they came from (?src= and UTM tags on the LMS sign-in link).
-- 3. Studio sees one row per person with a funnel stage:
--      1 lead (website only, never signed in)   2 signed in, Module 0 not started
--      3 started Module 0, not finished         4 finished Module 0, not bought
--      5 bought (any course access)
--    A lead and a student are the same person when the lead's phone = the student's parent phone.

-- ── 1. Leads ─────────────────────────────────────────────────────────────────

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  course_id text not null default 'ai-for-students' references public.courses (id),
  reference text not null unique check (char_length(reference) between 1 and 100),  -- website's id: retries count once
  phone text not null check (phone ~ '^\+91[6-9][0-9]{9}$'),
  parent_name text check (char_length(parent_name) <= 80),
  student_name text check (char_length(student_name) <= 80),
  grade smallint check (grade between 1 and 12),
  school_name text check (char_length(school_name) <= 120),
  source text not null check (source ~ '^[a-z0-9_-]{1,40}$'),     -- loki, module0, schools, qr...
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 4000),
  created_at timestamptz not null default now()
);
create index on public.leads (phone);
create index on public.leads (created_at);

alter table public.leads enable row level security;
create policy "admins read leads" on public.leads for select to authenticated using ((select public.is_admin()));
-- No write policies: only the server (service role) writes leads, through record_lead.

create function public.record_lead(
  p_reference text, p_phone text, p_source text,
  p_parent_name text default null, p_student_name text default null, p_grade smallint default null,
  p_school_name text default null, p_details jsonb default '{}', p_course text default 'ai-for-students'
) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := public.normalize_phone(p_phone);
  v_id uuid;
begin
  if coalesce(trim(p_reference), '') = '' then raise exception 'reference is required'; end if;
  if v_phone is null then raise exception 'A valid Indian mobile number is required'; end if;
  if coalesce(lower(trim(p_source)), '') !~ '^[a-z0-9_-]{1,40}$' then raise exception 'source is not valid'; end if;
  if not exists (select 1 from public.courses where id = p_course) then raise exception 'Unknown course %', p_course; end if;
  insert into public.leads (course_id, reference, phone, parent_name, student_name, grade, school_name, source, details)
  values (p_course, trim(p_reference), v_phone, nullif(left(trim(p_parent_name), 80), ''), nullif(left(trim(p_student_name), 80), ''),
          case when p_grade between 1 and 12 then p_grade end, nullif(left(trim(p_school_name), 120), ''),
          lower(trim(p_source)), case when jsonb_typeof(p_details) = 'object' then p_details else '{}' end)
  on conflict (reference) do nothing
  returning id into v_id;
  return case when v_id is null then 'duplicate' else 'saved' end;
end;
$$;
revoke execute on function public.record_lead from public, anon, authenticated;
grant execute on function public.record_lead to service_role;

-- ── 2. Where a student came from ─────────────────────────────────────────────

alter table public.profiles
  add column signup_source text check (signup_source ~ '^[a-z0-9_-]{1,40}$'),
  add column signup_utm jsonb check (signup_utm is null or (jsonb_typeof(signup_utm) = 'object' and pg_column_size(signup_utm) <= 1000));

-- Set once, by the student themself, right after onboarding. Later calls change nothing.
create function public.record_signup_source(p_source text, p_utm jsonb default null) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_src text := lower(trim(coalesce(p_source, '')));
  v_utm jsonb;
begin
  if (select auth.uid()) is null then return false; end if;
  if v_src !~ '^[a-z0-9_-]{1,40}$' then v_src := null; end if;
  -- Keep only the three UTM tags, as short strings.
  select nullif(jsonb_object_agg(key, left(value, 80)), '{}') into v_utm
  from jsonb_each_text(case when jsonb_typeof(p_utm) = 'object' then p_utm else '{}' end)
  where key in ('utm_source', 'utm_medium', 'utm_campaign') and value <> '';
  if v_src is null and v_utm is null then return false; end if;
  update public.profiles set signup_source = v_src, signup_utm = v_utm
  where id = (select auth.uid()) and signup_source is null and signup_utm is null;
  return found;
end;
$$;
revoke execute on function public.record_signup_source from public, anon;
grant execute on function public.record_signup_source to authenticated;

-- ── 3. Pipeline (Studio only) ────────────────────────────────────────────────

create function public.admin_pipeline(p_course text default 'ai-for-students', p_stall_hours int default 24)
returns table (
  student_id uuid, lead_id uuid, name text, parent_name text, phone text, grade smallint, school text,
  source text, stage smallint, stalled boolean,
  lead_at timestamptz, signed_up_at timestamptz, last_watch_at timestamptz, seconds_watched int,
  module0_done_at timestamptz, bought_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  with free as (
    select l.id from public.lessons l join public.chapters ch on ch.id = l.chapter_id
    where l.course_id = p_course and ch.is_free
  ),
  watch as (
    select lp.student_id, sum(lp.seconds_watched)::int as secs, max(lp.updated_at) as last_at,
           case when (select count(*) from free) > 0 and count(lp.completed_at) >= (select count(*) from free) then max(lp.completed_at) end as done_at
    from public.lesson_progress lp where lp.lesson_id in (select id from free)
    group by lp.student_id
  ),
  first_lead as (
    select distinct on (phone) * from public.leads where course_id = p_course order by phone, created_at
  ),
  students as (
    select p.id, p.full_name, p.guardian_name, p.guardian_phone, p.grade, coalesce(s.name, p.school_name) as school,
           coalesce(p.signup_source, p.signup_utm ->> 'utm_source') as src, p.created_at,
           w.secs, w.last_at, w.done_at, a.granted_at as bought
    from public.profiles p
    left join public.schools s on s.id = p.school_id
    left join watch w on w.student_id = p.id
    left join public.course_access a on a.student_id = p.id and a.course_id = p_course
    where p.role = 'student'
  )
  select st.id, fl.id, st.full_name, st.guardian_name, st.guardian_phone, st.grade, st.school,
         coalesce(fl.source, st.src),
         (case when st.bought is not null then 5 when st.done_at is not null then 4
               when coalesce(st.secs, 0) > 0 then 3 else 2 end)::smallint,
         st.bought is null and st.done_at is null and coalesce(st.secs, 0) > 0
           and st.last_at < now() - make_interval(hours => p_stall_hours),
         fl.created_at, st.created_at, st.last_at, coalesce(st.secs, 0), st.done_at, st.bought
  from students st left join first_lead fl on fl.phone = st.guardian_phone
  union all
  select null, fl.id, coalesce(fl.student_name, fl.parent_name, fl.phone), fl.parent_name, fl.phone, fl.grade, fl.school_name,
         fl.source, 1::smallint, false, fl.created_at, null, null, 0, null, null
  from first_lead fl
  where not exists (select 1 from public.profiles p where p.role = 'student' and p.guardian_phone = fl.phone);
end;
$$;
revoke execute on function public.admin_pipeline from public, anon;
grant execute on function public.admin_pipeline to authenticated;
