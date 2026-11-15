-- Leads: deleting is undoable for 30 days, and two leads can be merged (Chirag, 2026-11-15).
-- Deleted leads move to leads_trash (the row and its CRM notes as JSON), so nothing that reads
-- public.leads (pipeline, Today, sheet sync, analytics) needs to know about deleted rows.
-- Trash older than 30 days is removed whenever an admin opens or adds to the trash.

create table public.leads_trash (
  id uuid primary key,                       -- the lead's own id
  lead jsonb not null,                       -- the full leads row
  notes jsonb not null default '[]',         -- its crm_notes rows
  reason text not null,                      -- 'deleted', 'cleared', 'duplicate copy' or 'merged into <name>'
  deleted_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz not null default now()
);
create index leads_trash_deleted_at_idx on public.leads_trash (deleted_at);
create index leads_trash_deleted_by_idx on public.leads_trash (deleted_by);
alter table public.leads_trash enable row level security;
-- No policies: only the admin functions below (security definer) read or write it.

-- Internal: move leads (and their notes) to the trash. Not callable by users.
create function public.trash_leads_(p_ids uuid[], p_reason text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.leads_trash where deleted_at < now() - interval '30 days';
  insert into public.leads_trash (id, lead, notes, reason, deleted_by)
  select l.id, to_jsonb(l),
         coalesce((select jsonb_agg(to_jsonb(c)) from public.crm_notes c where c.lead_id = l.id), '[]'),
         p_reason, auth.uid()
  from public.leads l where l.id = any(p_ids)
  on conflict (id) do update set lead = excluded.lead, notes = excluded.notes, reason = excluded.reason,
    deleted_by = excluded.deleted_by, deleted_at = now();
  delete from public.leads where id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.trash_leads_(uuid[], text) from public, anon, authenticated;

-- Same signatures as before (20261104000005), now moving to the trash instead of deleting.
create or replace function public.admin_delete_leads(p_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.trash_leads_(array(
    select l.id from public.leads l
    where public.phone_key(l.phone) in (select public.phone_key(x.phone) from public.leads x where x.id = any(p_ids))), 'deleted');
end;
$$;

create or replace function public.admin_clear_leads(p_confirm text, p_course text default 'ai-for-students', p_source text default null)
returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_confirm is distinct from 'DELETE ALL LEADS' then raise exception 'Type DELETE ALL LEADS to confirm'; end if;
  return public.trash_leads_(array(
    select id from public.leads where course_id = p_course and (p_source is null or source = p_source)), 'cleared');
end;
$$;

create or replace function public.admin_dedupe_leads(p_course text default 'ai-for-students')
returns int language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return public.trash_leads_(array(
    select id from (select id, row_number() over (partition by public.phone_key(phone) order by created_at, id) rn
                    from public.leads where course_id = p_course) d where d.rn > 1), 'duplicate copy');
end;
$$;

-- Merge p_merge into p_keep: empty fields on the kept lead take the other lead's values, sheet/website
-- extras are combined (kept lead wins), notes move over, then the merged lead goes to the trash.
create function public.admin_merge_leads(p_keep uuid, p_merge uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare k public.leads; m public.leads;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_keep = p_merge then raise exception 'Pick two different leads'; end if;
  select * into k from public.leads where id = p_keep for update;
  select * into m from public.leads where id = p_merge for update;
  if k.id is null or m.id is null then raise exception 'Lead not found'; end if;
  if k.course_id <> m.course_id then raise exception 'Leads are for different courses'; end if;
  update public.leads set
    parent_name = coalesce(nullif(trim(k.parent_name), ''), m.parent_name),
    student_name = coalesce(nullif(trim(k.student_name), ''), m.student_name),
    grade = coalesce(k.grade, m.grade),
    section = coalesce(nullif(trim(k.section), ''), m.section),
    school_name = coalesce(nullif(trim(k.school_name), ''), m.school_name),
    status = coalesce(nullif(trim(k.status), ''), m.status),
    next_step = coalesce(nullif(trim(k.next_step), ''), m.next_step),
    next_date = coalesce(k.next_date, m.next_date),
    student_id = coalesce(k.student_id, m.student_id),
    do_not_contact = k.do_not_contact or m.do_not_contact,
    details = m.details || k.details,
    sheet = m.sheet || k.sheet,
    updated_source = 'studio'
  where id = p_keep;
  update public.crm_notes set lead_id = p_keep where lead_id = p_merge;
  perform public.trash_leads_(array[p_merge],
    'merged into ' || coalesce(nullif(trim(k.student_name), ''), nullif(trim(k.parent_name), ''), k.phone));
  return p_keep;
end;
$$;

-- What is in the trash (last 30 days), newest first.
create function public.admin_lead_trash()
returns table (id uuid, name text, phone text, school text, source text, reason text, notes int, deleted_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  delete from public.leads_trash t where t.deleted_at < now() - interval '30 days';
  return query
  select t.id, coalesce(t.lead ->> 'student_name', t.lead ->> 'parent_name'), t.lead ->> 'phone', t.lead ->> 'school_name',
         t.lead ->> 'source', t.reason, jsonb_array_length(t.notes), t.deleted_at
  from public.leads_trash t order by t.deleted_at desc;
end;
$$;

-- Put a lead (and its notes) back exactly as it was.
create function public.admin_restore_lead(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare t public.leads_trash;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select * into t from public.leads_trash where id = p_id and deleted_at >= now() - interval '30 days' for update;
  if t.id is null then raise exception 'Not in the trash (or older than 30 days)'; end if;
  if exists (select 1 from public.leads where reference = t.lead ->> 'reference' or id = p_id) then
    raise exception 'A lead with the same reference already exists';
  end if;
  insert into public.leads select * from jsonb_populate_record(null::public.leads, t.lead);
  insert into public.crm_notes select * from jsonb_populate_recordset(null::public.crm_notes, t.notes)
    on conflict do nothing;
  delete from public.leads_trash where id = p_id;
  return p_id;
end;
$$;

revoke execute on function public.admin_delete_leads(uuid[]), public.admin_clear_leads(text, text, text), public.admin_dedupe_leads(text),
  public.admin_merge_leads(uuid, uuid), public.admin_lead_trash(), public.admin_restore_lead(uuid) from public, anon;
grant execute on function public.admin_delete_leads(uuid[]), public.admin_clear_leads(text, text, text), public.admin_dedupe_leads(text),
  public.admin_merge_leads(uuid, uuid), public.admin_lead_trash(), public.admin_restore_lead(uuid) to authenticated;
