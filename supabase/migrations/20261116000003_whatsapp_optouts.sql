-- WhatsApp opt-outs without AiSensy webhooks: when AiSensy refuses a send because the contact opted out
-- (keyword STOP etc. set up in AiSensy → Opt-in Management), the sender calls automation_opted_out:
-- the message is marked "Opted out" and every lead with that phone becomes Do not contact.
-- Studio → WhatsApp shows opt-in / opt-out counts from the same data (wa_optin_stats).

create function public.automation_opted_out(p_id uuid, p_reason text default 'Opted out on WhatsApp') returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text;
begin
  update public.message_queue set status = 'skipped', error = left(coalesce(p_reason, 'Opted out on WhatsApp'), 300)
  where id = p_id and status = 'sending' returning phone into v_phone;
  if v_phone is null then return 'unknown'; end if;
  update public.leads set do_not_contact = true where phone = v_phone and not do_not_contact;
  return 'opted_out';
end;
$$;

-- Opted in = leads we may message; opted out = Do not contact (ticked in the sheet / Studio, or caught from AiSensy).
create function public.wa_optin_stats()
returns table (opted_in bigint, opted_out bigint, opted_out_whatsapp bigint, no_phone bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query select
    count(*) filter (where not l.do_not_contact),
    count(*) filter (where l.do_not_contact),
    (select count(distinct q.phone) from public.message_queue q where q.status = 'skipped' and q.error like 'Opted out%'),
    0::bigint
  from public.leads l where l.book <> 'v2';
end;
$$;

revoke all on function public.automation_opted_out, public.wa_optin_stats from public, anon;
revoke all on function public.automation_opted_out from authenticated;
grant execute on function public.automation_opted_out to service_role;
grant execute on function public.wa_optin_stats to authenticated;

-- Opted-out messages can't be retried from Studio.
create or replace function public.admin_retry_message(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Only an admin can retry messages' using errcode = '42501'; end if;
  update public.message_queue set status = 'queued', attempts = 0, error = null, created_at = now()
  where id = p_id and status in ('failed', 'skipped')
    and error is distinct from 'Do not contact' and coalesce(error, '') not like 'Opted out%';
end;
$$;
