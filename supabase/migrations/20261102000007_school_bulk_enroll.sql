-- School bulk enrollment: an admin uploads a class list; each child gets one access key.
-- When the child redeems that key they are linked to the roster row and put in the class.

create table public.school_rosters (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  grade smallint not null check (grade between 8 and 10),
  student_name text not null check (char_length(trim(student_name)) between 1 and 80),
  parent_phone text not null,                       -- normalised +91XXXXXXXXXX
  access_key_id uuid not null unique references public.access_keys (id) on delete cascade,
  redeemed_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index school_rosters_school_idx on public.school_rosters (school_id);
create index school_rosters_class_idx on public.school_rosters (class_id);
create index school_rosters_redeemed_by_idx on public.school_rosters (redeemed_by);
create index school_rosters_created_by_idx on public.school_rosters (created_by);

alter table public.school_rosters enable row level security;
create policy "admins manage rosters" on public.school_rosters for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- p_rows: [{"name": "...", "grade": 8, "parent_phone": "...", "section": "A"}]  (section optional)
-- Returns {"ok": false, "errors": [{"row": 1, "error": "..."}]} and saves nothing if any row is bad,
-- else {"ok": true, "keys": [{"name": "...", "code": "BT-XXXX-XXXX", "grade": 8, "class": "..."}]}.
create or replace function public.admin_bulk_enroll(p_school uuid, p_course text, p_label text, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb; v_i int := 0; v_errors jsonb := '[]'; v_keys jsonb := '[]';
  v_name text; v_grade int; v_phone text; v_section text; v_class_name text; v_class uuid; v_key public.access_keys;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.schools where id = p_school) then raise exception 'School not found'; end if;
  if not exists (select 1 from public.courses where id = p_course) then raise exception 'Course not found'; end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'The class list is empty'; end if;
  if jsonb_array_length(p_rows) > 200 then raise exception 'Upload at most 200 students at a time'; end if;

  -- Pass 1: validate every row; save nothing if any row is bad.
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_i := v_i + 1;
    v_name := trim(coalesce(v_row ->> 'name', ''));
    if char_length(v_name) not between 1 and 80 then
      v_errors := v_errors || jsonb_build_object('row', v_i, 'error', 'Name is missing or too long');
    end if;
    if coalesce(v_row ->> 'grade', '') !~ '^\s*(8|9|10)\s*$' then
      v_errors := v_errors || jsonb_build_object('row', v_i, 'error', 'Grade must be 8, 9 or 10');
    end if;
    if public.normalize_phone(v_row ->> 'parent_phone') is null then
      v_errors := v_errors || jsonb_build_object('row', v_i, 'error', 'Parent WhatsApp number is not a valid Indian mobile');
    end if;
    if char_length(trim(coalesce(v_row ->> 'section', ''))) > 20 then
      v_errors := v_errors || jsonb_build_object('row', v_i, 'error', 'Section is too long');
    end if;
  end loop;
  if jsonb_array_length(v_errors) > 0 then return jsonb_build_object('ok', false, 'errors', v_errors); end if;

  -- Pass 2: one class per grade + section (reused if it exists), one key per child.
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_name := trim(v_row ->> 'name');
    v_grade := trim(v_row ->> 'grade')::int;
    v_phone := public.normalize_phone(v_row ->> 'parent_phone');
    v_section := nullif(upper(trim(coalesce(v_row ->> 'section', ''))), '');
    v_class_name := 'Grade ' || v_grade || coalesce(' ' || v_section, '');
    select id into v_class from public.classes where school_id = p_school and grade = v_grade and name = v_class_name limit 1;
    if v_class is null then
      insert into public.classes (school_id, name, grade) values (p_school, v_class_name, v_grade) returning id into v_class;
    end if;
    insert into public.access_keys (code, course_id, school_id, label, created_by)
    values ('BT-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)) || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 4)),
            p_course, p_school, left(coalesce(nullif(trim(p_label), ''), v_class_name), 80), (select auth.uid()))
    returning * into v_key;
    insert into public.school_rosters (school_id, class_id, grade, student_name, parent_phone, access_key_id)
    values (p_school, v_class, v_grade, v_name, v_phone, v_key.id);
    v_keys := v_keys || jsonb_build_object('name', v_name, 'code', v_key.code, 'grade', v_grade, 'class', v_class_name);
    v_class := null;
  end loop;
  return jsonb_build_object('ok', true, 'keys', v_keys);
end;
$$;

-- Redeeming a roster key also links the roster row and puts the child in that class.
create or replace function public.redeem_access_key(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_key public.access_keys;
  v_roster public.school_rosters;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'student') then
    raise exception 'Only students can redeem a key';
  end if;
  select * into v_key from public.access_keys where upper(code) = upper(trim(p_code)) for update;
  if v_key.id is null then raise exception 'That key doesn''t exist. Check for typos.'; end if;
  if v_key.redeemed_by is not null and v_key.redeemed_by <> v_uid then raise exception 'That key has already been used'; end if;
  update public.access_keys set redeemed_by = v_uid, redeemed_at = coalesce(redeemed_at, now()) where id = v_key.id;
  insert into public.course_access (student_id, course_id, source, reference)
  values (v_uid, v_key.course_id, 'key', v_key.code)
  on conflict (student_id, course_id) do nothing;
  select * into v_roster from public.school_rosters where access_key_id = v_key.id;
  if v_roster.id is not null then
    update public.school_rosters set redeemed_by = v_uid where id = v_roster.id;
    insert into public.enrollments (class_id, student_id) values (v_roster.class_id, v_uid) on conflict do nothing;
  end if;
  return v_key.course_id;
end;
$$;

revoke execute on function public.admin_bulk_enroll(uuid, text, text, jsonb), public.redeem_access_key(text) from public, anon;
grant execute on function public.admin_bulk_enroll(uuid, text, text, jsonb), public.redeem_access_key(text) to authenticated;
