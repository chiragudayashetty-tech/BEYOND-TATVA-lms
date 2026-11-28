-- Review fixes (2026-11-28). Not applied yet: needs Chirag's "apply".
-- 1. Password sign-up marks the email and phone as confirmed without a code (Chirag 2026-11-14). Those accounts
--    (app_metadata.password_unverified = true) must not unlock a waiting purchase by themselves: a stranger could
--    sign up with a parent's number before the parent does. They get a Studio suggestion instead (one click
--    in Reconciliation), and unlock by themselves after their first WhatsApp code / Google / email-code sign-in
--    (that clears the flag, src/lib/password-accounts.js).
-- 2. automation_claim: messages picked up again after an interrupted send are re-checked against
--    Do not contact (before, only queued ones were).
-- 3. submit_quiz: two tries at once (two tabs) could both pass the "2 tries" check. One lock per student + quiz.

create or replace function public._login_unverified(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select (u.raw_app_meta_data ->> 'password_unverified')::boolean from auth.users u where u.id = p_user), false)
$$;
revoke execute on function public._login_unverified(uuid) from public, anon, authenticated;

create or replace function public._verified_match(p_email text, p_phone text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid; n int;
begin
  if p_email is not null then
    select count(*), min(p.id::text)::uuid into n, v from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and lower(u.email) = p_email and u.email_confirmed_at is not null
      and not coalesce((u.raw_app_meta_data ->> 'password_unverified')::boolean, false);
    if n = 1 then return v; end if;
  end if;
  if p_phone is not null then
    select count(*), min(p.id::text)::uuid into n, v from public.profiles p join auth.users u on u.id = p.id
    where p.role = 'student' and public.normalize_phone(u.phone) = p_phone and u.phone_confirmed_at is not null
      and not coalesce((u.raw_app_meta_data ->> 'password_unverified')::boolean, false);
    if n = 1 then return v; end if;
  end if;
  return null;
end;
$$;
revoke execute on function public._verified_match from public, anon, authenticated;

create or replace function public.claim_purchases() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_phone text;
  v_parent text;
  v_unverified boolean;
  r record;
  n int := 0;
begin
  if v_uid is null then return 0; end if;
  select case when u.email_confirmed_at is not null then lower(u.email) end,
         case when u.phone_confirmed_at is not null then public.normalize_phone(u.phone) end,
         p.guardian_phone,
         coalesce((u.raw_app_meta_data ->> 'password_unverified')::boolean, false)
    into v_email, v_phone, v_parent, v_unverified
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = v_uid and p.role = 'student';
  if not found then return 0; end if;

  -- Typed at password sign-up, never proven: suggest to Studio, never unlock.
  if v_unverified then
    update public.purchases set suggested_student = v_uid, suggested_at = now()
    where status = 'pending' and suggested_student is null
      and ((v_email is not null and email = v_email) or (v_phone is not null and phone = v_phone)
           or (v_parent is not null and phone = v_parent));
    return 0;
  end if;

  -- Verified email or login phone: unlock.
  for r in
    select id, case when email = v_email then 'email' else 'phone' end as how
    from public.purchases
    where status = 'pending'
      and ((v_email is not null and email = v_email) or (v_phone is not null and phone = v_phone))
    order by (email = v_email) desc nulls last, created_at
    for update skip locked
  loop
    exit when exists (select 1 from public.course_access a join public.purchases p on p.id = r.id
                      where a.student_id = v_uid and a.course_id = p.course_id);
    perform public._grant_purchase(r.id, v_uid, r.how);
    n := n + 1;
  end loop;

  -- Parent phone only: leave a suggestion for Studio (first student to match keeps it).
  if v_parent is not null then
    update public.purchases set suggested_student = v_uid, suggested_at = now()
    where status = 'pending' and phone = v_parent and suggested_student is null;
  end if;
  return n;
end;
$$;
revoke execute on function public.claim_purchases() from public, anon;
grant execute on function public.claim_purchases() to authenticated;

create or replace function public.automation_claim(p_limit int default 50)
returns table (id uuid, rule_key text, campaign text, phone text, name text, params jsonb, media_url text, tags text[], attributes jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  update public.message_queue q set status = 'skipped', error = 'Older than 3 days, not sent'
  where q.status in ('queued', 'sending') and q.created_at < now() - interval '3 days';
  -- Queued, or picked up again after an interrupted send: the latest Do not contact wins.
  update public.message_queue q set status = 'skipped', error = 'Do not contact'
  where (q.status = 'queued' or (q.status = 'sending' and q.claimed_at < now() - interval '10 minutes'))
    and public.automation_dnc(q.phone);
  return query
  with picked as (
    select q.id from public.message_queue q
    left join public.automation_rules r on r.key = q.rule_key
    where (q.rule_key is null or r.enabled)
      and (q.status = 'queued' or (q.status = 'sending' and q.claimed_at < now() - interval '10 minutes'))
    order by q.created_at
    limit least(greatest(coalesce(p_limit, 50), 1), 200)
    for update of q skip locked
  )
  update public.message_queue q set status = 'sending', claimed_at = now(), attempts = q.attempts + 1
  from picked
  where q.id = picked.id
  returning q.id, q.rule_key,
    coalesce((select t.campaign from public.wa_templates t where t.key = q.template_key),
             (select t.campaign from public.automation_rules r join public.wa_templates t on t.key = r.template_key where r.key = q.rule_key),
             (select r.campaign from public.automation_rules r where r.key = q.rule_key)),
    q.phone, q.name, q.params, q.media_url, q.tags, q.attributes;
end;
$$;
revoke execute on function public.automation_claim(int) from public, anon, authenticated;
grant execute on function public.automation_claim(int) to service_role;

create or replace function public.submit_quiz(p_quiz uuid, p_answers int[]) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_quiz public.quizzes;
  v_total int;
  v_score int := 0;
  v_results json;
  v_passed boolean;
  v_student boolean;
  v_attempts int := 0;
  v_reveal boolean;
  v_xp int := 0;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_quiz from public.quizzes where id = p_quiz;
  if v_quiz.id is null or not v_quiz.published or not public.can_open_chapter(v_quiz.chapter_id) then
    raise exception 'This quiz isn''t open for you yet';
  end if;
  select count(*) into v_total from public.quiz_questions where quiz_id = p_quiz;
  if v_total = 0 then raise exception 'This quiz has no questions yet'; end if;
  if coalesce(cardinality(p_answers), 0) <> v_total then raise exception 'Answer every question before submitting'; end if;

  v_student := exists (select 1 from public.profiles where id = v_uid and role = 'student');
  if v_student then
    -- One submit at a time per student + quiz (two tabs, double tap), so the 2-tries count can't be beaten.
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_quiz::text, 0));
    select count(*) into v_attempts from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid;
    if v_attempts >= 2 then raise exception 'You have used both tries for this quiz'; end if;
    if exists (select 1 from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid and created_at > now() - interval '30 seconds') then
      raise exception 'Take a short break: you can try again in 30 seconds';
    end if;
  end if;

  select count(*) filter (where p_answers[i] = correct_index) into v_score
  from (select row_number() over (order by position, id) as i, correct_index from public.quiz_questions where quiz_id = p_quiz) q;
  v_passed := v_score * 100 >= v_quiz.pass_percent * v_total;
  -- Staff (teachers/admins) always see answers; students after passing or once both tries are used.
  v_reveal := not v_student or v_passed or v_attempts + 1 >= 2
              or exists (select 1 from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid and passed);

  with q as (
    select row_number() over (order by position, id) as i, id, correct_index, explanation
    from public.quiz_questions where quiz_id = p_quiz
  )
  select json_agg(json_build_object('question_id', id, 'picked', p_answers[i], 'correct', p_answers[i] = correct_index,
                                    'correct_index', case when v_reveal then correct_index end,
                                    'explanation', case when v_reveal then explanation end) order by i)
  into v_results from q;

  if v_student then
    insert into public.quiz_attempts (quiz_id, student_id, answers, score, total, passed)
    values (p_quiz, v_uid, p_answers, v_score, v_total, v_passed);
    -- XP this quiz gives now: 10 per right answer, on the average of the tries so far.
    select round(10 * avg(score)) into v_xp from public.quiz_attempts where quiz_id = p_quiz and student_id = v_uid;
  end if;
  return json_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'pass_percent', v_quiz.pass_percent,
                           'xp', v_xp, 'results', v_results, 'revealed', v_reveal, 'attempt', v_attempts + 1,
                           'attempts_left', case when v_student then greatest(2 - (v_attempts + 1), 0) end);
end;
$$;
revoke execute on function public.submit_quiz(uuid, int[]) from public, anon;
grant execute on function public.submit_quiz(uuid, int[]) to authenticated;
