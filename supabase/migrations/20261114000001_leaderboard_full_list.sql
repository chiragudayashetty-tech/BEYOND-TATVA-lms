-- Full leaderboard page: xp_leaderboard takes an optional list size (default 10, max 200).
-- Same privacy as before: first name + initial, hidden students left out, only the caller's own rank for hidden ones.
drop function if exists public.xp_leaderboard();
create or replace function public.xp_leaderboard(p_limit int default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_result jsonb; v_limit int := least(greatest(coalesce(p_limit, 10), 1), 200);
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  with xp as (
    select p.id, p.leaderboard_hidden as hidden,
           initcap(split_part(trim(p.full_name), ' ', 1))
             || coalesce(' ' || upper(left(nullif(split_part(trim(p.full_name), ' ', 2), ''), 1)) || '.', '') as name,
           (public.student_xp(p.id) ->> 'total')::int as xp
    from public.profiles p where p.role = 'student'
  ), ranked as (
    select *, rank() over (order by xp desc) as rnk from xp where xp > 0 and (not hidden or id = v_uid)
  )
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('rank', rnk, 'name', name, 'xp', xp, 'me', id = v_uid) order by rnk, name)
                     from (select * from ranked where not hidden order by rnk, name limit v_limit) t), '[]'),
    'me', (select jsonb_build_object('rank', rnk, 'xp', xp, 'hidden', hidden) from ranked where id = v_uid),
    'players', (select count(*) from ranked where not hidden)
  ) into v_result;
  return v_result;
end;
$$;
revoke execute on function public.xp_leaderboard(int) from public, anon;
grant execute on function public.xp_leaderboard(int) to authenticated;
