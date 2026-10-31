-- ============================================================
-- Close two public write holes before launch
--
-- 1. Anyone with the public key could insert ratings into any business's
--    dashboard. Ratings are now saved by the server only (after Google
--    sign-in and the one-rating-per-sticker check), so the open rule goes.
-- 2. Any signed-in business could upload into another business's logo
--    folder. Each business may now only write inside its own folder
--    (logos/<their user id>/...). Logos stay publicly viewable.
--
-- Safe to run more than once.
-- ============================================================

-- 1. No direct inserts into ratings from the browser
drop policy if exists "scans_insert_anon" on public.scans;

-- 2. Logo storage: replace whatever rules exist for the "logos" bucket
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%logos%' or coalesce(with_check, '') ilike '%logos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_owner_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "logos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
