-- Offline leads and workshops from leads (Codex PR #84 asked for the backend; Chirag, 2026-11-05).
-- All three are admin-only wrappers around record_lead / workshop_registrations.

-- One lead typed in by an admin (phone call, walk-in, school visit). Same phone + source twice counts once.
create function public.admin_add_lead(
  p_phone text, p_source text default 'manual',
  p_parent_name text default null, p_student_name text default null, p_grade smallint default null,
  p_school_name text default null, p_note text default null, p_course text default 'ai-for-students'
) returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.normalize_phone(p_phone);
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if v_phone is null then raise exception 'A valid Indian mobile number is required'; end if;
  return public.record_lead(
    'admin-' || lower(trim(coalesce(p_source, 'manual'))) || '-' || v_phone, v_phone, coalesce(p_source, 'manual'),
    p_parent_name, p_student_name, p_grade, p_school_name,
    case when nullif(trim(p_note), '') is null then '{}'::jsonb else jsonb_build_object('note', left(trim(p_note), 500)) end,
    p_course);
end;
$$;

-- Many leads at once (pasted CSV). Rows: [{phone, parent_name, student_name, grade, school_name, note}].
-- Returns {saved, duplicate, invalid: [{row, error}]}; one bad row never stops the rest.
create function public.admin_import_leads(p_rows jsonb, p_source text default 'import', p_course text default 'ai-for-students')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb; i int := 0; v_saved int := 0; v_dup int := 0; v_bad jsonb := '[]'; v_res text;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'rows must be a list'; end if;
  if jsonb_array_length(p_rows) > 2000 then raise exception 'At most 2000 rows per import'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    i := i + 1;
    begin
      v_res := public.admin_add_lead(
        r ->> 'phone', p_source, r ->> 'parent_name', r ->> 'student_name',
        case when (r ->> 'grade') ~ '^\d{1,2}$' then (r ->> 'grade')::smallint end,
        r ->> 'school_name', r ->> 'note', p_course);
      if v_res = 'saved' then v_saved := v_saved + 1; else v_dup := v_dup + 1; end if;
    exception when others then
      v_bad := v_bad || jsonb_build_object('row', i, 'error', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('saved', v_saved, 'duplicate', v_dup, 'invalid', v_bad);
end;
$$;

-- Register existing leads for a workshop. The admin confirms the parent agreed (by phone or WhatsApp);
-- leads missing a student name, parent name or a grade 8–10 are skipped with the reason.
create function public.admin_register_leads(p_workshop uuid, p_lead_ids uuid[], p_parent_consent_confirmed boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l public.leads; v_added int := 0; v_skipped jsonb := '[]'; v_seats int; v_taken int;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not coalesce(p_parent_consent_confirmed, false) then raise exception 'Confirm that each parent agreed to the workshop'; end if;
  select seats into v_seats from public.workshops where id = p_workshop;
  if v_seats is null then raise exception 'Workshop not found'; end if;
  for l in select * from public.leads where id = any(p_lead_ids) order by created_at loop
    select count(*) into v_taken from public.workshop_registrations where workshop_id = p_workshop;
    if v_taken >= v_seats then
      v_skipped := v_skipped || jsonb_build_object('lead_id', l.id, 'reason', 'workshop is full');
    elsif l.student_name is null or l.parent_name is null or l.grade is null or l.grade not between 8 and 10 then
      v_skipped := v_skipped || jsonb_build_object('lead_id', l.id, 'reason', 'needs student name, parent name and grade 8–10');
    elsif exists (select 1 from public.workshop_registrations where workshop_id = p_workshop and parent_phone = l.phone) then
      v_skipped := v_skipped || jsonb_build_object('lead_id', l.id, 'reason', 'already registered');
    else
      insert into public.workshop_registrations (workshop_id, student_name, grade, parent_name, parent_phone, consent_at, lead_id)
      values (p_workshop, l.student_name, l.grade, l.parent_name, l.phone, now(), l.id);
      v_added := v_added + 1;
    end if;
  end loop;
  return jsonb_build_object('added', v_added, 'skipped', v_skipped);
end;
$$;

revoke execute on function public.admin_add_lead, public.admin_import_leads, public.admin_register_leads from public, anon;
grant execute on function public.admin_add_lead, public.admin_import_leads, public.admin_register_leads to authenticated;
