-- Uploading with upsert and removing a photo both read the existing object first, which the public bucket does not cover.
create policy "own avatar select" on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
