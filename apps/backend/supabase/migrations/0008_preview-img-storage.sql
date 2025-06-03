delete from storage.objects where bucket_id = 'preview_images';
delete from storage.buckets where id = 'preview_images';

insert into storage.buckets
  (id, name, public)
values
  ('preview_images', 'preview_images', true);

-- Allow anon and authenticated users to select from preview_images bucket
drop policy if exists "preview_images_select_policy" on storage.objects;

create policy "preview_images_select_policy"
on storage.objects for select to anon,authenticated using (
    bucket_id = 'preview_images'
);

-- Allow anon and authenticated users to update preview_images bucket
drop policy if exists "preview_images_update_policy" on storage.objects;

create policy "preview_images_update_policy"
on storage.objects for update to  anon,authenticated using (
    bucket_id = 'preview_images'
);
