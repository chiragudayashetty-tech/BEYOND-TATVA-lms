-- School outreach: the LMS Studio is now the main record; the School Outreach sheet mirrors it.
--   • The sheet sends back the "version" (outreach_schools.updated_at) it last pulled for each row.
--     If the LMS row changed since (Studio edit, logged call/visit), the sheet edit is skipped
--     ("stale") and the next pull overwrites the sheet row with the LMS copy.
--   • A row with an ID but no version (never pulled) is also skipped. A name that matches an existing
--     school without an ID links to it ("exists") instead of overwriting it.
--   • A row whose school was deleted in Studio is not re-created ("deleted"); the next pull removes it.
--   • calls, visits and history are owned by the LMS (Studio "Log call / Log visit") and ignored here.
create or replace function public.sheet_upsert_schools(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; out jsonb := '[]'; v_id uuid; v_name text; v_ver timestamptz; v_cur timestamptz;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 2000 then raise exception 'rows must be a list of at most 2000'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      v_name := nullif(left(trim(coalesce(r ->> 'name', '')), 160), '');
      if v_name is null then raise exception 'School name is empty'; end if;
      v_id := case when (r ->> 'id') ~ '^[0-9a-f-]{36}$' then (r ->> 'id')::uuid end;
      v_ver := case when nullif(trim(coalesce(r ->> 'version', '')), '') is not null then (r ->> 'version')::timestamptz end;
      select updated_at into v_cur from public.outreach_schools where id = v_id;
      if v_id is not null and v_cur is null then                                -- deleted in Studio: the next pull removes the row
        out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', 'deleted');
        continue;
      end if;

      if v_id is null then
        select id, updated_at into v_id, v_cur from public.outreach_schools where lower(name) = lower(v_name) limit 1;
        if v_id is not null then
          out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', 'exists', 'version', v_cur);
          continue;
        end if;
        insert into public.outreach_schools (name) values (v_name) returning id into v_id;
      elsif v_ver is null or v_cur > v_ver then
        out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'result', 'stale', 'version', v_cur);
        continue;
      end if;

      update public.outreach_schools set
        name = v_name,
        area = nullif(left(r ->> 'area', 160), ''), contact = nullif(left(r ->> 'contact', 160), ''), phone = nullif(left(r ->> 'phone', 40), ''),
        status = nullif(left(r ->> 'status', 80), ''),
        next_step = nullif(left(r ->> 'next_step', 300), ''),
        next_date = public.sheet_date(r ->> 'next_date'), notes = nullif(left(r ->> 'notes', 2000), ''),
        sheet = coalesce(r -> 'sheet', sheet)
      where id = v_id
      returning updated_at into v_cur;
      out := out || jsonb_build_object('row', r -> 'row', 'id', v_id, 'version', v_cur,
        'result', case when v_ver is null then 'created' else 'updated' end);
    exception when others then
      out := out || jsonb_build_object('row', r -> 'row', 'result', 'error', 'error', sqlerrm);
    end;
  end loop;
  return out;
end;
$$;

revoke execute on function public.sheet_upsert_schools(jsonb) from public, anon, authenticated;
grant execute on function public.sheet_upsert_schools(jsonb) to service_role;
