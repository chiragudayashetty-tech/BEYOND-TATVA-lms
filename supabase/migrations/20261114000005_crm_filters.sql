-- CRM filters (Chirag, 2026-11-14): Studio → Pipeline filters by school, class, section, siblings, status,
-- source, due; group by school. docs/SHEETS-SYSTEM.md.
--   • leads.section: class section from the School Leads Tracker (A, B, …).
--   • lead_outcome(): ONE rule for open / won / lost / dnc, used by the Pipeline (and mirrored in src/lib/crm.js).
--   • admin_pipeline: siblings are no longer collapsed into one row (it used to keep one lead per parent phone),
--     and every row carries status, outcome, section, next step/date and its siblings.
alter table public.leads add column section text check (char_length(section) <= 10);

-- won: paid, or status says Enrolled · dnc: do not contact · lost: Closed / Not interested · else open.
create function public.lead_outcome(p_status text, p_paid boolean, p_dnc boolean) returns text
language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_paid, false) or coalesce(p_status, '') ~* 'enrolled' then 'won'
    when coalesce(p_dnc, false) then 'dnc'
    when coalesce(p_status, '') ~* '(closed|not interested)' then 'lost'
    else 'open' end;
$$;
grant execute on function public.lead_outcome(text, boolean, boolean) to authenticated, service_role;

drop function public.admin_pipeline(text, int);
create function public.admin_pipeline(p_course text default 'ai-for-students', p_stall_hours int default 24)
returns table (
  student_id uuid, lead_id uuid, name text, parent_name text, phone text, grade smallint, section text, school text,
  source text, stage smallint, stalled boolean,
  lead_at timestamptz, signed_up_at timestamptz, last_watch_at timestamptz, seconds_watched int,
  module0_done_at timestamptz, bought_at timestamptz,
  status text, outcome text, next_step text, next_date date, do_not_contact boolean, siblings text
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
  course_leads as (select * from public.leads where course_id = p_course),
  students as (
    select p.id, p.full_name, p.guardian_name, public.normalize_phone(p.guardian_phone) as gphone, p.grade,
           coalesce(s.name, p.school_name) as school,
           coalesce(p.signup_source, p.signup_utm ->> 'utm_source') as src, p.created_at,
           w.secs, w.last_at, w.done_at, a.granted_at as bought,
           -- The student's lead: linked by account first, else the oldest lead on the parent's phone.
           (select cl.id from course_leads cl
             where cl.student_id = p.id or (cl.student_id is null and cl.phone = public.normalize_phone(p.guardian_phone))
             order by (cl.student_id = p.id) desc nulls last, cl.created_at limit 1) as lead_id
    from public.profiles p
    left join public.schools s on s.id = p.school_id
    left join watch w on w.student_id = p.id
    left join public.course_access a on a.student_id = p.id and a.course_id = p_course
    where p.role = 'student'
  ),
  sib as (
    select cl.id, string_agg(o.student_name, ', ' order by o.student_name) as names
    from course_leads cl join course_leads o on o.phone = cl.phone and o.id <> cl.id
    group by cl.id
  )
  select st.id, l.id, st.full_name, coalesce(st.guardian_name, l.parent_name), coalesce(st.gphone, l.phone),
         coalesce(st.grade, l.grade), l.section, coalesce(l.school_name, st.school),
         coalesce(l.source, st.src),
         (case when st.bought is not null then 5 when st.done_at is not null then 4
               when coalesce(st.secs, 0) > 0 then 3 else 2 end)::smallint,
         st.bought is null and st.done_at is null and coalesce(st.secs, 0) > 0
           and st.last_at < now() - make_interval(hours => p_stall_hours),
         l.created_at, st.created_at, st.last_at, coalesce(st.secs, 0), st.done_at, st.bought,
         l.status, public.lead_outcome(l.status, st.bought is not null, coalesce(l.do_not_contact, false)),
         l.next_step, l.next_date, coalesce(l.do_not_contact, false), sib.names
  from students st left join course_leads l on l.id = st.lead_id left join sib on sib.id = l.id
  union all
  -- Leads not (yet) matched to an account: every one, siblings included.
  select null, l.id, coalesce(l.student_name, l.parent_name, l.phone), l.parent_name, l.phone, l.grade, l.section, l.school_name,
         l.source, 1::smallint, false, l.created_at, null, null, 0, null, null,
         l.status,
         public.lead_outcome(l.status,
           exists (select 1 from public.purchases x where x.phone = l.phone and x.status in ('claimed', 'pending') and x.course_id = p_course),
           l.do_not_contact),
         l.next_step, l.next_date, l.do_not_contact, sib.names
  from course_leads l left join sib on sib.id = l.id
  where not exists (select 1 from students st where st.lead_id = l.id);
end;
$$;
revoke execute on function public.admin_pipeline(text, int) from public, anon;
grant execute on function public.admin_pipeline(text, int) to authenticated;
