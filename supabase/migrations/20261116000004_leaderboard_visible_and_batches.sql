-- Leaderboard (Chirag 2026-11-16): students are shown by default (opt-out in Profile), and there are two boards:
-- "My batch" (students in the same weekly batch of the same course) and "Everyone".
-- Privacy unchanged: first name + last initial only, hidden students left out, a hidden student sees only their own rank.

-- 1. Shown by default. Everyone currently hidden is switched on; they can switch off again in Profile.
alter table public.profiles alter column leaderboard_hidden set default false;
update public.profiles set leaderboard_hidden = false where role = 'student' and leaderboard_hidden;

create or replace function public.set_leaderboard_hidden(p_hidden boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Not signed in'; end if;
  update public.profiles set leaderboard_hidden = coalesce(p_hidden, false) where id = (select auth.uid()) and role = 'student';
end;
$$;
revoke execute on function public.set_leaderboard_hidden(boolean) from public, anon;
grant execute on function public.set_leaderboard_hidden(boolean) to authenticated;

-- 2. Leaderboard with a scope: 'all' (default) or 'batch'.
-- A student's batch = their earliest access to a course that has batches (course + batch number).
drop function if exists public.xp_leaderboard(int);
create or replace function public.xp_leaderboard(p_limit int default 10, p_scope text default 'all') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid()); v_result jsonb;
  v_limit int := least(greatest(coalesce(p_limit, 10), 1), 200);
  v_batch_scope boolean := coalesce(p_scope, 'all') = 'batch';
  v_course text; v_batch int;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  with b as (
    select distinct on (ca.student_id) ca.student_id, ca.course_id, public.batch_number_for(ca.course_id, ca.granted_at) as batch
    from public.course_access ca join public.courses c on c.id = ca.course_id and c.batch1_start is not null
    order by ca.student_id, ca.granted_at
  ) select course_id, batch into v_course, v_batch from b where student_id = v_uid;

  with b as (
    select distinct on (ca.student_id) ca.student_id, ca.course_id, public.batch_number_for(ca.course_id, ca.granted_at) as batch
    from public.course_access ca join public.courses c on c.id = ca.course_id and c.batch1_start is not null
    order by ca.student_id, ca.granted_at
  ), xp as (
    select p.id, p.leaderboard_hidden as hidden,
           initcap(split_part(trim(p.full_name), ' ', 1))
             || coalesce(' ' || upper(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1)) || '.', '') as name,
           (public.student_xp(p.id) ->> 'total')::int as xp
    from public.profiles p left join b on b.student_id = p.id
    where p.role = 'student'
      and (not v_batch_scope or (v_batch is not null and b.course_id = v_course and b.batch = v_batch))
  ), ranked as (
    select *, rank() over (order by xp desc) as rnk from xp where xp > 0 and (not hidden or id = v_uid)
  )
  select jsonb_build_object(
    'scope', case when v_batch_scope then 'batch' else 'all' end,
    'batch', v_batch,
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rnk, 'name', name, 'xp', xp, 'me', id = v_uid) order by rnk, name)
                     from (select * from ranked where not hidden order by rnk, name limit v_limit) t), '[]'),
    'me', (select jsonb_build_object('rank', rnk, 'xp', xp, 'hidden', hidden) from ranked where id = v_uid),
    'players', (select count(*) from ranked where not hidden)
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.xp_leaderboard(int, text) from public, anon;
grant execute on function public.xp_leaderboard(int, text) to authenticated;
