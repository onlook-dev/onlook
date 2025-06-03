delete from storage.objects where bucket_id = 'preview_images';
delete from storage.buckets where id = 'preview_images';

insert into storage.buckets
  (id, name, public)
values
  ('preview_images', 'preview_images', true);

-- Allow any users to upsert into preview_images bucket
drop policy if exists "preview_images_upsert_policy" on storage.objects;

create policy "preview_images_upsert_policy"
on storage.objects for all to public using (
    bucket_id = 'preview_images'
);
