-- Studio: find and merge duplicate student logins.
--  admin_duplicate_candidates(): groups of student accounts that look like one child —
--    same parent phone (siblings share phones too, so first names are compared), same student phone,
--    or same full name. Each account comes with its login, details and activity so the admin can pick
--    the main one. Groups already merged are listed too, with their main account.
--  admin_mark_duplicate_account(dup, main): now also copies the duplicate's details into the main
--    account where the main one is blank (school, typed school, student phone, grade), moves its leads,
--    and gives the main account any course access only the duplicate had. Both logins keep working;
--    analytics count the child once (main account).
--  admin_unmark_duplicate(dup): undo (copied details and moved leads stay).
create or replace function public.admin_duplicate_candidates() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return coalesce((
    with st as (
      select p.*, u.email, u.last_sign_in_at,
             lower(split_part(trim(p.full_name), ' ', 1)) first, lower(regexp_replace(trim(p.full_name), '\s+', ' ', 'g')) fullname
      from public.profiles p join auth.users u on u.id = p.id where p.role = 'student'),
    pairs as (
      select a.id a, b.id b,
             case when a.duplicate_of = b.id or b.duplicate_of = a.id then 'merged'
                  when a.guardian_phone = b.guardian_phone and a.first = b.first then 'same parent phone and first name'
                  when a.student_phone is not null and a.student_phone = b.student_phone then 'same student phone'
                  when a.fullname = b.fullname then 'same name'
                  when a.guardian_phone = b.guardian_phone then 'same parent phone (could be siblings)' end reason
      from st a join st b on a.id < b.id),
    hit as (select * from pairs where reason is not null),
    acct as (
      select s.id, jsonb_build_object('id', s.id, 'name', s.full_name, 'email', s.email, 'parent', s.guardian_name,
        'parent_phone', s.guardian_phone, 'student_phone', s.student_phone, 'grade', s.grade,
        'school', coalesce(sc.name, s.school_name), 'signed_up_at', s.created_at, 'last_sign_in_at', s.last_sign_in_at,
        'duplicate_of', s.duplicate_of,
        'paid', exists (select 1 from public.course_access ca where ca.student_id = s.id),
        'leads', (select count(*) from public.leads l where l.student_id = s.id),
        'lessons', (select count(*) from public.lesson_progress lp where lp.student_id = s.id),
        'quiz_attempts', (select count(*) from public.quiz_attempts q where q.student_id = s.id),
        'minutes', coalesce((select round(sum(seconds) / 60.0) from public.learning_days d where d.student_id = s.id), 0)) j
      from st s left join public.schools sc on sc.id = s.school_id)
    select jsonb_agg(jsonb_build_object('reason', h.reason, 'accounts', jsonb_build_array(x.j, y.j))
                     order by h.reason = 'merged', h.reason)
    from hit h join acct x on x.id = h.a join acct y on y.id = h.b), '[]'::jsonb);
end;
$$;
revoke execute on function public.admin_duplicate_candidates() from public, anon;
grant execute on function public.admin_duplicate_candidates() to authenticated;

create or replace function public.admin_mark_duplicate_account(p_duplicate uuid, p_main uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d public.profiles;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_duplicate = p_main then raise exception 'Choose two different accounts'; end if;
  if (select count(*) from public.profiles where id in (p_duplicate, p_main) and role = 'student') <> 2 then
    raise exception 'Both accounts must be students';
  end if;
  if exists (select 1 from public.profiles where id = p_main and duplicate_of is not null) then
    raise exception 'The main account is itself marked as a duplicate';
  end if;
  select * into d from public.profiles where id = p_duplicate;
  update public.profiles set duplicate_of = p_main where id = p_duplicate;
  update public.profiles set duplicate_of = p_main where duplicate_of = p_duplicate;   -- re-point older merges
  update public.profiles m set
    school_id = coalesce(m.school_id, d.school_id),
    school_name = coalesce(nullif(trim(m.school_name), ''), d.school_name),
    student_phone = coalesce(m.student_phone, d.student_phone),
    grade = coalesce(m.grade, d.grade)
  where m.id = p_main;
  update public.leads set student_id = p_main where student_id = p_duplicate;
  insert into public.course_access (student_id, course_id, source, reference, granted_at)
  select p_main, a.course_id, a.source, a.reference, a.granted_at from public.course_access a
  where a.student_id = p_duplicate
  on conflict (student_id, course_id) do nothing;
end;
$$;
revoke execute on function public.admin_mark_duplicate_account(uuid, uuid) from public, anon;
grant execute on function public.admin_mark_duplicate_account(uuid, uuid) to authenticated;

create or replace function public.admin_unmark_duplicate(p_duplicate uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.profiles set duplicate_of = null where id = p_duplicate and duplicate_of is not null;
  if not found then raise exception 'That account is not marked as a duplicate'; end if;
end;
$$;
revoke execute on function public.admin_unmark_duplicate(uuid) from public, anon;
grant execute on function public.admin_unmark_duplicate(uuid) to authenticated;
