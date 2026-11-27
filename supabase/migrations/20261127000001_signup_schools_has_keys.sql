-- Sign-up chat: ask for a school key only when Studio has made keys for that school (School keys) that
-- nobody has used yet. Returns a yes/no per school, never the keys themselves.
drop function public.signup_schools();
create function public.signup_schools() returns table (id uuid, name text, has_keys boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name,
         exists (select 1 from public.access_keys k where k.school_id = s.id and k.redeemed_by is null)
  from public.schools s where s.show_at_signup order by s.name;
$$;
revoke execute on function public.signup_schools() from public, anon;
grant execute on function public.signup_schools() to authenticated;
