delete from storage.objects where bucket_id = 'preview_images';
delete from storage.buckets where id = 'preview_images';

insert into storage.buckets
  (id, name, public)
values
  ('preview_images', 'preview_images', true);

-- Allow any users to select from preview_images files
drop policy if exists "preview_images_select_policy" on storage.objects;

create policy "preview_images_select_policy"
on storage.objects for select to public using (
    bucket_id = 'preview_images'
);

-- Allow any users to insert into preview_images files
drop policy if exists "preview_images_insert_policy" on storage.objects;

create policy "preview_images_insert_policy"
on storage.objects for insert to public with check (
    bucket_id = 'preview_images'
);
