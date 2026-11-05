-- Monthly AI newsletter: a PDF (or image) uploaded in Studio, released on the 1st Sunday of each month.
-- Enrolled students (course access), teachers and admins can read them. Files live in the private
-- bucket 'newsletters' at {yyyy-mm}/{file}; reads need a signed URL.

create table public.newsletters (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (id) default 'ai-for-students',
  title text not null check (char_length(trim(title)) between 1 and 120),
  issue_date date not null default current_date,
  file_path text not null unique check (file_path ~ '^[0-9]{4}-[0-9]{2}/[A-Za-z0-9._-]{1,120}$'),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes between 1 and 26214400),   -- 25 MB
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index newsletters_course_idx on public.newsletters (course_id, issue_date desc);
create index newsletters_created_by_idx on public.newsletters (created_by);

alter table public.newsletters enable row level security;
create policy "admins manage newsletters" on public.newsletters for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "enrolled read newsletters" on public.newsletters for select to authenticated
  using (public.has_course_access(course_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletters', 'newsletters', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins write newsletter files" on storage.objects for insert to authenticated
  with check (bucket_id = 'newsletters' and (select public.is_admin()));
create policy "admins update newsletter files" on storage.objects for update to authenticated
  using (bucket_id = 'newsletters' and (select public.is_admin()));
create policy "admins delete newsletter files" on storage.objects for delete to authenticated
  using (bucket_id = 'newsletters' and (select public.is_admin()));
create policy "enrolled read newsletter files" on storage.objects for select to authenticated
  using (bucket_id = 'newsletters' and (
    (select public.is_admin())
    or exists (select 1 from public.newsletters n where n.file_path = name and public.has_course_access(n.course_id))
  ));
