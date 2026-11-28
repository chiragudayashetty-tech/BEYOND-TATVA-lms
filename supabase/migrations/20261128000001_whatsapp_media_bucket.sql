-- WhatsApp message media: photos, videos and PDFs uploaded from Studio → Automations.
-- AiSensy downloads the file from a public https link, so this bucket is public-read (links use random folder names).
-- Only admins can add, change or delete files. Limits follow WhatsApp: 16 MB, JPG/PNG, MP4, PDF.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('whatsapp-media', 'whatsapp-media', true, 16777216,
        array['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'])
on conflict (id) do nothing;

create policy "admins write whatsapp media" on storage.objects for insert to authenticated
  with check (bucket_id = 'whatsapp-media' and (select public.is_admin()));
create policy "admins update whatsapp media" on storage.objects for update to authenticated
  using (bucket_id = 'whatsapp-media' and (select public.is_admin()));
create policy "admins delete whatsapp media" on storage.objects for delete to authenticated
  using (bucket_id = 'whatsapp-media' and (select public.is_admin()));
create policy "admins list whatsapp media" on storage.objects for select to authenticated
  using (bucket_id = 'whatsapp-media' and (select public.is_admin()));
