-- Already live (applied 2026-11-09 14:19 UTC, version 20261109141955) before its file reached the repo.
-- Copied here word for word so the repo matches production. Do not apply again.
create table if not exists public.otp_sends (
  id bigint generated always as identity primary key,
  phone text not null,
  sent_at timestamptz not null default now()
);
create index if not exists otp_sends_phone_sent_at_idx on public.otp_sends (phone, sent_at);
alter table public.otp_sends enable row level security;

create or replace function public.otp_send_allowed(p_phone text) returns text
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
