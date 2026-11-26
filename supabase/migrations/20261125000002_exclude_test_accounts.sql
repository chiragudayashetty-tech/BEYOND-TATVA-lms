-- Test accounts out of every Studio number (2026-11-25, Chirag: "only Poorvi has bought").
--
-- 1. Puts the test-account pieces in the repo. They were made on live outside a migration
--    (profiles.is_test, profile_test_flag trigger, admin_set_test, admin_set_test_paid), so a fresh
--    database didn't have them. Copied from live as they are; safe to re-run there.
-- 2. Studio numbers skip test accounts: Analytics scores and schools (student_score_rows), Pipeline
--    (admin_pipeline: a test account's lead still shows, as a plain lead), Insights (admin_insights)
--    and the Studio home counts (admin_stats). Free access given to a test account no longer counts
--    as "bought". Each function is patched in place (exact text swap, fails loudly if the text moved),
--    so nothing else in those long functions changes.

-- ── 1. Test-account pieces ─────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_test boolean not null default false;

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
revoke all on function public.profile_test_flag() from public, anon, authenticated;
drop trigger if exists profile_test_flag on public.profiles;
create trigger profile_test_flag before insert on public.profiles for each row execute function public.profile_test_flag();

create or replace function public.admin_set_test(p_student uuid, p_test boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = 'insufficient_privilege'; end if;
  update public.profiles set is_test = p_test, leaderboard_hidden = p_test or leaderboard_hidden
  where id = p_student and role = 'student';
  if not found then raise exception 'Not a student account'; end if;
end;
$$;

create or replace function public.admin_set_test_paid(p_student uuid, p_paid boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = 'insufficient_privilege'; end if;
  if not exists (select 1 from public.profiles where id = p_student and is_test) then
    raise exception 'Only test accounts can be switched';
  end if;
  if p_paid then
    insert into public.course_access (student_id, course_id, source, reference)
    select p_student, c.id, 'admin', 'test account' from public.courses c
    on conflict do nothing;
  else
    delete from public.course_access where student_id = p_student;
  end if;
end;
$$;
revoke all on function public.admin_set_test(uuid, boolean) from public, anon;
revoke all on function public.admin_set_test_paid(uuid, boolean) from public, anon;
grant execute on function public.admin_set_test(uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_set_test_paid(uuid, boolean) to authenticated, service_role;

-- ── 2. Studio numbers skip test accounts ──────────────────────────────────────
create function pg_temp.patch(p_fn regprocedure, p_old text, p_new text) returns void language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_new in d) > 0 then return; end if;              -- already patched
  if position(p_old in d) = 0 then raise exception 'patch: text not found in %: %', p_fn, p_old; end if;
  execute replace(d, p_old, p_new);
end;
$$;

select pg_temp.patch('public.student_score_rows(uuid, int)',
  'where pr.role = ''student'' and pr.duplicate_of is null',
  'where pr.role = ''student'' and not pr.is_test and pr.duplicate_of is null');

select pg_temp.patch('public.admin_pipeline(text, int)',
  E'    where p.role = ''student''\n  ),',
  E'    where p.role = ''student'' and not p.is_test\n  ),');

select pg_temp.patch('public.admin_insights(int)',
  'from public.profiles where role = ''student''),',
  'from public.profiles where role = ''student'' and not is_test),');
select pg_temp.patch('public.admin_insights(int)',
  'paid as (select student_id, source from public.course_access)',
  'paid as (select student_id, source from public.course_access where student_id in (select id from students))');

select pg_temp.patch('public.admin_stats()',
  '''students'', (select count(*) from public.profiles where role = ''student''),',
  '''students'', (select count(*) from public.profiles where role = ''student'' and not is_test),');
select pg_temp.patch('public.admin_stats()',
  '''unlocked'', (select count(*) from public.course_access),',
  '''unlocked'', (select count(*) from public.course_access ca where not exists (select 1 from public.profiles t where t.id = ca.student_id and t.is_test)),');
