-- Studio → WhatsApp: rename any automatic rule (name + a short note) and delete a message you no longer use.

create function public.admin_rename_automation(p_key text, p_title text, p_description text default '') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can change automations' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_title, ''))) not between 1 and 80 then raise exception 'Give it a name (up to 80 letters)'; end if;
  if char_length(coalesce(p_description, '')) > 400 then raise exception 'The note is too long (up to 400 letters)'; end if;
  update public.automation_rules set title = trim(p_title), description = trim(coalesce(p_description, '')), updated_at = now() where key = p_key;
  if not found then raise exception 'Unknown automation'; end if;
end;
$$;

-- A message that an automatic rule is switched On with cannot be deleted (switch the rule Off first). Rules that are Off
-- just lose the link; messages already sent keep their history.
create function public.admin_delete_message(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can delete messages' using errcode = '42501'; end if;
  if exists (select 1 from public.automation_rules where template_key = p_key and enabled) then raise exception 'message_in_use'; end if;
  delete from public.wa_templates where key = p_key;
  if not found then raise exception 'Unknown message'; end if;
end;
$$;

-- The four older rules were shown with a fixed label in the page; make that their real name so renaming shows.
update public.automation_rules set title = case key
  when 'lead_welcome' then 'When a new lead is added (sheet, website, Loki chat)'
  when 'payment_link' then 'When a lead''s Next step says "payment link"'
  when 'payment_received' then 'When a payment comes in'
  when 'student_welcome' then 'When a new student finishes sign-up (to the parent)' end
where key in ('lead_welcome', 'payment_link', 'payment_received', 'student_welcome');

revoke all on function public.admin_rename_automation(text, text, text), public.admin_delete_message(text) from public, anon;
grant execute on function public.admin_rename_automation(text, text, text), public.admin_delete_message(text) to authenticated;
