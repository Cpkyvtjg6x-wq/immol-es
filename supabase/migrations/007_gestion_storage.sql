-- ============================================================
-- IMMORA — Migration 007 : Storage gestion locative
-- Bucket privé 'gestion-docs'. Chemin = {user_id}/... → RLS par dossier.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('gestion-docs', 'gestion-docs', false)
on conflict (id) do nothing;

drop policy if exists "gestion_docs_select_own" on storage.objects;
create policy "gestion_docs_select_own" on storage.objects for select
  using (bucket_id = 'gestion-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gestion_docs_insert_own" on storage.objects;
create policy "gestion_docs_insert_own" on storage.objects for insert
  with check (bucket_id = 'gestion-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gestion_docs_update_own" on storage.objects;
create policy "gestion_docs_update_own" on storage.objects for update
  using (bucket_id = 'gestion-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "gestion_docs_delete_own" on storage.objects;
create policy "gestion_docs_delete_own" on storage.objects for delete
  using (bucket_id = 'gestion-docs' and (storage.foldername(name))[1] = auth.uid()::text);
