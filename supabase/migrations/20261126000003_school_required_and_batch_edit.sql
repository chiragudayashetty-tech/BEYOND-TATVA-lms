-- 2026-11-26 (Chirag): school is required when a student signs up, and Studio can set a school's batch start.
--   • complete_onboarding: a student must pick a school (list), give a school code, or type the name under Other.
--     Patched in place (exact text swap, fails loudly if the text moved).
--   • admin_set_school_batch(): set or clear schools.batch_start (one school = one batch, 20261126000002).

create function pg_temp.patch(p_fn regprocedure, p_old text, p_new text) returns void language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_new in d) > 0 then return; end if;
  if position(p_old in d) = 0 then raise exception 'patch: text not found in %: %', p_fn, p_old; end if;
  execute replace(d, p_old, p_new);
end;
$$;

select pg_temp.patch('public.complete_onboarding(text, text, text, smallint, text, text, text, text, text, boolean, uuid)',
  '    if p_grade is null or p_grade not between 8 and 10 then',
  E'    if v_school is null and coalesce(trim(p_school_name), '''') = '''' then raise exception ''Choose your school (or pick Other and type its name)''; end if;\n    if p_grade is null or p_grade not between 8 and 10 then');

create or replace function public.admin_set_school_batch(p_school uuid, p_start timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = 'insufficient_privilege'; end if;
  update public.schools set batch_start = p_start where id = p_school;
  if not found then raise exception 'School not found'; end if;
end;
$$;
revoke execute on function public.admin_set_school_batch(uuid, timestamptz) from public, anon;
grant execute on function public.admin_set_school_batch(uuid, timestamptz) to authenticated;

-- Studio lists: batch start next to each school.
drop function if exists public.admin_school_batches();
create function public.admin_school_batches()
returns table (id uuid, name text, batch_start timestamptz, students bigint)
language sql stable security definer set search_path = '' as $$
  select s.id, s.name, s.batch_start,
         (select count(*) from public.profiles p where p.school_id = s.id and p.role = 'student' and not p.is_test)
  from public.schools s where public.is_admin() order by s.batch_start desc nulls last, s.name;
$$;
revoke execute on function public.admin_school_batches() from public, anon;
grant execute on function public.admin_school_batches() to authenticated;
