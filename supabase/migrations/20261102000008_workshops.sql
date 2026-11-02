-- Workshops: published workshops have a public sign-up page (/w/<slug>); parents register without an account.
-- Registrations are visible to admins only and also create a Pipeline lead (source 'workshop').

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,59}$'),
  title text not null check (char_length(trim(title)) between 1 and 120),
  starts_at timestamptz not null,
  venue text check (char_length(venue) <= 160),
  school_id uuid references public.schools (id) on delete set null,
  seats int not null check (seats between 1 and 1000),
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index workshops_school_idx on public.workshops (school_id);
create index workshops_created_by_idx on public.workshops (created_by);

create table public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  student_name text not null check (char_length(trim(student_name)) between 1 and 80),
  grade smallint not null check (grade between 8 and 10),
  parent_name text not null check (char_length(trim(parent_name)) between 1 and 80),
  parent_phone text not null check (parent_phone ~ '^\+91[6-9][0-9]{9}$'),
  consent_at timestamptz not null,
  attended_at timestamptz,
  lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint one_registration_per_phone unique (workshop_id, parent_phone)
);
create index workshop_registrations_lead_idx on public.workshop_registrations (lead_id);

alter table public.workshops enable row level security;
alter table public.workshop_registrations enable row level security;
create policy "admins manage workshops" on public.workshops for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "anyone reads published workshops" on public.workshops for select to anon, authenticated
  using (published);
create policy "admins manage registrations" on public.workshop_registrations for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- No anon/student policy on registrations: the public only writes through register_workshop.

-- Public page data: the workshop plus seats left (registrations themselves stay hidden).
create or replace function public.get_workshop(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('title', w.title, 'starts_at', w.starts_at, 'venue', w.venue, 'slug', w.slug,
    'seats_left', greatest(w.seats - (select count(*) from public.workshop_registrations r where r.workshop_id = w.id), 0),
    'open', w.starts_at > now())
  from public.workshops w where w.slug = lower(trim(p_slug)) and w.published;
$$;

-- Returns 'registered' or 'already' (same parent phone for this workshop). Raises a friendly message otherwise.
create or replace function public.register_workshop(p_slug text, p_student_name text, p_grade int,
  p_parent_name text, p_parent_phone text, p_consent boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_w public.workshops;
  v_phone text := public.normalize_phone(p_parent_phone);
  v_reg uuid; v_lead uuid;
begin
  if p_consent is not true then raise exception 'Please tick the parent consent box'; end if;
  if char_length(trim(coalesce(p_student_name, ''))) not between 1 and 80 then raise exception 'Please enter the student''s name'; end if;
  if char_length(trim(coalesce(p_parent_name, ''))) not between 1 and 80 then raise exception 'Please enter the parent''s name'; end if;
  if p_grade is null or p_grade not between 8 and 10 then raise exception 'This workshop is for grades 8 to 10'; end if;
  if v_phone is null then raise exception 'Please enter a valid Indian WhatsApp number'; end if;

  select * into v_w from public.workshops where slug = lower(trim(p_slug)) and published for update;
  if v_w.id is null then raise exception 'Workshop not found'; end if;
  if v_w.starts_at <= now() then raise exception 'Registration for this workshop has closed'; end if;
  if exists (select 1 from public.workshop_registrations where workshop_id = v_w.id and parent_phone = v_phone) then
    return 'already';
  end if;
  if (select count(*) from public.workshop_registrations where workshop_id = v_w.id) >= v_w.seats then
    raise exception 'Sorry, this workshop is full';
  end if;

  insert into public.leads (course_id, reference, phone, parent_name, student_name, grade, school_name, source, details)
  values ('ai-for-students', 'workshop:' || v_w.id || ':' || v_phone, v_phone, left(trim(p_parent_name), 80), left(trim(p_student_name), 80),
          p_grade, null, 'workshop', jsonb_build_object('workshop', v_w.slug))
  on conflict (reference) do nothing
  returning id into v_lead;
  insert into public.workshop_registrations (workshop_id, student_name, grade, parent_name, parent_phone, consent_at, lead_id)
  values (v_w.id, trim(p_student_name), p_grade, trim(p_parent_name), v_phone, now(), v_lead);
  return 'registered';
end;
$$;

revoke execute on function public.get_workshop(text), public.register_workshop(text, text, int, text, text, boolean) from public;
grant execute on function public.get_workshop(text), public.register_workshop(text, text, int, text, text, boolean) to anon, authenticated;
