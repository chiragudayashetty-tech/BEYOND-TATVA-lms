-- Module resources: PDFs, worksheets and images attached to a module (chapter) in Studio.
-- Students see and download them only when that module is open to them (same rule as its lessons).
-- Files live in the private bucket 'module-resources' at {chapter_id}/{file}; reads need a signed URL.

create table public.module_resources (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  file_path text not null unique check (file_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  mime text not null check (mime in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes between 1 and 26214400),   -- 25 MB
  position int not null default 0,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint module_resource_path_matches_chapter check (split_part(file_path, '/', 1) = chapter_id::text)
);
create index module_resources_chapter_idx on public.module_resources (chapter_id, position);
create index module_resources_created_by_idx on public.module_resources (created_by);

alter table public.module_resources enable row level security;
create policy "admins manage module resources" on public.module_resources for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "read resources of open modules" on public.module_resources for select to authenticated
  using (public.can_open_chapter(chapter_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('module-resources', 'module-resources', false, 26214400, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admins write module resource files" on storage.objects for insert to authenticated
  with check (bucket_id = 'module-resources' and (select public.is_admin()));
create policy "admins update module resource files" on storage.objects for update to authenticated
  using (bucket_id = 'module-resources' and (select public.is_admin()));
create policy "admins delete module resource files" on storage.objects for delete to authenticated
  using (bucket_id = 'module-resources' and (select public.is_admin()));
create policy "read files of open modules" on storage.objects for select to authenticated
  using (bucket_id = 'module-resources' and (
    (select public.is_admin())
    or ((storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$' and public.can_open_chapter(((storage.foldername(name))[1])::uuid))
  ));
