-- Studio can mark any student account as a test account (e.g. Google Play testers).
-- Chirag (2026-11-15): every sign-up until the end of 19 Nov 2026 IST is a test account (Google Play testing).
-- Sign-ups that haven't finished onboarding yet are flagged in auth app metadata; the profile picks it up when created.
create or replace function public.admin_set_test(p_student uuid, p_test boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = 'insufficient_privilege'; end if;
  update public.profiles set is_test = p_test, leaderboard_hidden = p_test or leaderboard_hidden
  where id = p_student and role = 'student';
  if not found then raise exception 'Not a student account'; end if;
end;
$$;
revoke execute on function public.admin_set_test from public, anon;
grant execute on function public.admin_set_test to authenticated;

create or replace function public.profile_test_flag() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users where id = new.id and raw_app_meta_data ->> 'is_test' = 'true')
     or (now() < '2026-11-20 00:00+05:30' and new.role = 'student') then
    new.is_test := true; new.leaderboard_hidden := true;
  end if;
  return new;
end;
$$;
revoke execute on function public.profile_test_flag from public, anon, authenticated;
drop trigger if exists profile_test_flag on public.profiles;
create trigger profile_test_flag before insert on public.profiles for each row execute function public.profile_test_flag();
