delete from storage.objects where bucket_id = 'api_files';
delete from storage.buckets where id = 'api_files';

insert into storage.buckets
  (id, name, public)
values
  ('api_files', 'api_files', true);

-- Allow any users to select from api_files
DROP POLICY IF EXISTS "api_files_select_policy" ON storage.objects;

CREATE POLICY "api_files_select_policy"
ON storage.objects FOR SELECT TO public USING (
    bucket_id = 'api_files'
);

-- Allow any users to insert into api_files
DROP POLICY IF EXISTS "api_files_insert_policy" ON storage.objects;

CREATE POLICY "api_files_insert_policy"
ON storage.objects FOR INSERT TO public WITH CHECK (
    bucket_id = 'api_files'
);
