-- Audit 2026-11-09: WhatsApp login code limits (60 s cooldown, 5 per phone per hour).
-- Per-IP limits come from Supabase Auth rate limits (the Send SMS hook never sees the user's IP).
create table public.otp_sends (
  id bigint generated always as identity primary key,
  phone text not null,
  sent_at timestamptz not null default now()
);
create index on public.otp_sends (phone, sent_at);
alter table public.otp_sends enable row level security;
-- No policies: only the service role touches it.

-- 'ok' (and counted) when this phone may get another code now; else 'cooldown' | 'hourly_limit' | 'invalid'.
create function public.otp_send_allowed(p_phone text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text := public.normalize_phone(p_phone);
begin
  if v_phone is null then return 'invalid'; end if;
  delete from public.otp_sends where sent_at < now() - interval '1 day';
  if exists (select 1 from public.otp_sends where phone = v_phone and sent_at > now() - interval '60 seconds') then return 'cooldown'; end if;
  if (select count(*) from public.otp_sends where phone = v_phone and sent_at > now() - interval '1 hour') >= 5 then return 'hourly_limit'; end if;
  insert into public.otp_sends (phone) values (v_phone);
  return 'ok';
end;
$$;
revoke execute on function public.otp_send_allowed from public, anon, authenticated;
grant execute on function public.otp_send_allowed to service_role;
