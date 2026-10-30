-- Admins read schools with their join codes (codes are hidden from everyone else by column grants).
create or replace function public.admin_schools()
returns table (id uuid, name text, city text, code text, teacher_code text, created_at timestamptz, students bigint)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name, s.city, s.code, s.teacher_code, s.created_at,
         (select count(*) from public.profiles p where p.school_id = s.id and p.role = 'student')
  from public.schools s
  where public.is_admin()
  order by s.created_at desc;
$$;
revoke execute on function public.admin_schools from public, anon;
grant execute on function public.admin_schools to authenticated;