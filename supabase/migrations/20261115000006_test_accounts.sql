-- Test accounts: Chirag marks a few accounts as tests; Studio can switch them between paid and free.
alter table public.profiles add column if not exists is_test boolean not null default false;

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
revoke execute on function public.admin_set_test_paid from public, anon;
grant execute on function public.admin_set_test_paid to authenticated;
