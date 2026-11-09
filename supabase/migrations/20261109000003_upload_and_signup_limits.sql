-- Hardening after the 2026-11-09 review.
-- 1. Assignment uploads: the 10 MB / file-type limits already live on the bucket; add a count cap the browser
--    can't skip: max 10 files per student per assignment folder, 200 per student in total.
-- 2. Public workshop sign-up: spam guard (max 40 sign-ups per workshop per 10 minutes).

create or replace function public.submission_upload_allowed(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects o
          where o.bucket_id = 'submissions'
            and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]
            and (storage.foldername(o.name))[2] is not distinct from (storage.foldername(p_name))[2]) < 10
     and (select count(*) from storage.objects o
          where o.bucket_id = 'submissions'
            and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]) < 200;
$$;
revoke execute on function public.submission_upload_allowed(text) from public, anon;
grant execute on function public.submission_upload_allowed(text) to authenticated;

drop policy if exists "students upload own submission files" on storage.objects;
create policy "students upload own submission files" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.can_upload_submission(name)
              and public.submission_upload_allowed(name));

create or replace function public.register_workshop(p_slug text, p_student_name text, p_grade int,
  p_parent_name text, p_parent_phone text, p_consent boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_w public.workshops;
  v_phone text := public.normalize_phone(p_parent_phone);
  v_reg uuid; v_lead uuid;
begin
  if p_consent is not true then raise exception 'Please tick the parent consent box'; end if;
  if char_length(trim(coalesce(p_student_name, ''))) not between 1 and 80 then raise exception 'Please enter the student''s name'; end if;
  if char_length(trim(coalesce(p_parent_name, ''))) not between 1 and 80 then raise exception 'Please enter the parent''s name'; end if;
  if p_grade is null or p_grade not between 8 and 10 then raise exception 'This workshop is for grades 8 to 10'; end if;
  if v_phone is null then raise exception 'Please enter a valid Indian WhatsApp number'; end if;

  select * into v_w from public.workshops where slug = lower(trim(p_slug)) and published for update;
  if v_w.id is null then raise exception 'Workshop not found'; end if;
  if v_w.starts_at <= now() then raise exception 'Registration for this workshop has closed'; end if;
  if exists (select 1 from public.workshop_registrations where workshop_id = v_w.id and parent_phone = v_phone) then
    return 'already';
  end if;
  -- Spam guard: a real workshop never gets more than 40 sign-ups in 10 minutes.
  if (select count(*) from public.workshop_registrations
      where workshop_id = v_w.id and consent_at > now() - interval '10 minutes') >= 40 then
    raise exception 'Lots of sign-ups right now. Please try again in a few minutes';
  end if;
  if (select count(*) from public.workshop_registrations where workshop_id = v_w.id) >= v_w.seats then
    raise exception 'Sorry, this workshop is full';
  end if;

  insert into public.leads (course_id, reference, phone, parent_name, student_name, grade, school_name, source, details)
  values ('ai-for-students', 'workshop:' || v_w.id || ':' || v_phone, v_phone, left(trim(p_parent_name), 80), left(trim(p_student_name), 80),
          p_grade, null, 'workshop', jsonb_build_object('workshop', v_w.slug))
  on conflict (reference) do nothing
  returning id into v_lead;
  insert into public.workshop_registrations (workshop_id, student_name, grade, parent_name, parent_phone, consent_at, lead_id)
  values (v_w.id, trim(p_student_name), p_grade, trim(p_parent_name), v_phone, now(), v_lead);
  return 'registered';
end;
$$;
