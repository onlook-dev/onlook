insert into storage.buckets
  (id, name, public)
values
  ('preview_images', 'preview_images', true);

drop policy if exists "Allow authenticated upsert" on storage.objects;
create policy "Allow authenticated upsert"
on storage.objects for insert, update, select, delete to authenticated with check (
    bucket_id = 'preview_images'
);