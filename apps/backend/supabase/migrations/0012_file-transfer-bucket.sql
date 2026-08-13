-- Direct deletes from storage tables are rejected by newer Supabase storage
-- versions (SQLSTATE 42501); upsert instead — identical result on a fresh DB.
insert into storage.buckets
  (id, name, public)
values
  ('file_transfer', 'file_transfer', false)
on conflict (id) do update set public = excluded.public;

-- Allow authenticated users to select only their own files from file_transfer
drop policy if exists "file_transfer_select_policy" on storage.objects;

create policy "file_transfer_select_policy"
on storage.objects for select to authenticated using (
    bucket_id = 'file_transfer' AND auth.uid() = owner
);

-- Allow authenticated users to insert into file_transfer with their user ID as owner
drop policy if exists "file_transfer_insert_policy" on storage.objects;

create policy "file_transfer_insert_policy"
on storage.objects for insert to authenticated with check (
    bucket_id = 'file_transfer' AND auth.uid() = owner
);

-- Allow authenticated users to delete only their own files
drop policy if exists "file_transfer_delete_policy" on storage.objects;

create policy "file_transfer_delete_policy"
on storage.objects for delete to authenticated using (
    bucket_id = 'file_transfer' AND auth.uid() = owner
);
