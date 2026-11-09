-- 2026-11-09 review, agreed with Chirag:
-- 1. Assignment uploads: the 10 MB / file-type limits already live on the bucket. Add a count cap the
--    browser can't skip: max 15 files per student per assignment, 60 per student in total.
--    (The hand-in page now deletes files a student removes, so only files in use count.)
-- 2. Close the public workshop sign-up (/w/<slug>): replaced by School outreach on 2026-11-08, never used.
--    Tables stay (Studio analytics reads them); the page and its functions are closed.

create or replace function public.submission_upload_allowed(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from storage.objects o
          where o.bucket_id = 'submissions'
            and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]
            and (storage.foldername(o.name))[2] is not distinct from (storage.foldername(p_name))[2]) < 15
     and (select count(*) from storage.objects o
          where o.bucket_id = 'submissions'
            and (storage.foldername(o.name))[1] = (storage.foldername(p_name))[1]) < 60;
$$;
revoke execute on function public.submission_upload_allowed(text) from public, anon;
grant execute on function public.submission_upload_allowed(text) to authenticated;

drop policy if exists "students upload own submission files" on storage.objects;
create policy "students upload own submission files" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and public.can_upload_submission(name)
              and public.submission_upload_allowed(name));

update public.workshops set published = false where published;
revoke execute on function public.get_workshop(text) from public, anon, authenticated;
revoke execute on function public.register_workshop(text, text, int, text, text, boolean) from public, anon, authenticated;
