-- Password sign-up (phone or email + password, no code). /api/auth/signup creates the account with the
-- service role, so Supabase's own sign-up rate limit doesn't apply: this is the limit instead.
-- 5 new accounts per IP per hour, 20 per IP per day. School Wi-Fi with a class signing up at once can hit
-- this; Studio → School keys + Google sign-in still work then.
create table public.signup_attempts (
  id bigint generated always as identity primary key,
  ip text not null check (char_length(ip) <= 64),
  at timestamptz not null default now()
);
create index on public.signup_attempts (ip, at);
alter table public.signup_attempts enable row level security;
-- No policies: only the service role touches it.

-- 'ok' (and counted) | 'hourly_limit' | 'daily_limit'.
create function public.password_signup_allowed(p_ip text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_ip text := left(coalesce(nullif(trim(p_ip), ''), 'unknown'), 64);
begin
  delete from public.signup_attempts where at < now() - interval '2 days';
  if (select count(*) from public.signup_attempts where ip = v_ip and at > now() - interval '1 hour') >= 5 then return 'hourly_limit'; end if;
  if (select count(*) from public.signup_attempts where ip = v_ip and at > now() - interval '1 day') >= 20 then return 'daily_limit'; end if;
  insert into public.signup_attempts (ip) values (v_ip);
  return 'ok';
end;
$$;
revoke execute on function public.password_signup_allowed(text) from public, anon, authenticated;
grant execute on function public.password_signup_allowed(text) to service_role;

-- Forgot password by mobile number: /api/auth/forgot finds the account's email and sends the reset link
-- there (automatic, no SMS). Server only; the email is never shown to the person asking.
create function public.email_for_phone(p_phone text) returns text
language sql stable security definer set search_path = '' as $$
  select u.email from auth.users u
  where public.normalize_phone(p_phone) is not null and public.normalize_phone(u.phone) = public.normalize_phone(p_phone)
    and u.email is not null
  order by u.created_at limit 1;
$$;
revoke execute on function public.email_for_phone(text) from public, anon, authenticated;
grant execute on function public.email_for_phone(text) to service_role;
