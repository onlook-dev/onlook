insert into storage.buckets
  (id, name, public)
values
  ('preview_images', 'preview_images', true);

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'preview_images'
);

-- Allow public access to read files
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'preview_images'
);
