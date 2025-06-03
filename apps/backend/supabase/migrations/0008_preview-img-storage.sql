insert into storage.buckets
  (id, name, public)
values
  ('preview_images', 'preview_images', true);

drop policy if exists "preview_images_upsert_policy" on storage.objects;

create policy "preview_images_upsert_policy"
on storage.objects for all to authenticated using (
    bucket_id = 'preview_images'
);
