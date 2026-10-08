# Konfiguracja Storage (przechowywanie obrazków mapek)

1. W panelu Supabase: **Storage** → **New bucket**
2. Nazwa bucketu: `lash-maps`
3. **Public bucket: WYŁĄCZONE** (zostaw odznaczone — pliki mają być prywatne)
4. Kliknij **Create bucket**

## Polityki dostępu (RLS dla Storage)

Po utworzeniu bucketu wejdź w **Storage → lash-maps → Policies** i dodaj nową politykę
(albo wklej poniższy SQL w **SQL Editor** — szybsza metoda):

```sql
-- Każda użytkowniczka może wgrywać/czytać/usuwać WYŁĄCZNIE pliki w swoim
-- własnym folderze: lash-maps/<jej-user-id>/...
drop policy if exists "lash-maps: owner read" on storage.objects;
create policy "lash-maps: owner read" on storage.objects
  for select using (
    bucket_id = 'lash-maps' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lash-maps: owner insert" on storage.objects;
create policy "lash-maps: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'lash-maps' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "lash-maps: owner delete" on storage.objects;
create policy "lash-maps: owner delete" on storage.objects
  for delete using (
    bucket_id = 'lash-maps' and (storage.foldername(name))[1] = auth.uid()::text
  );
```

To wystarczy wkleić do tego samego SQL Editora co `schema.sql` (osobnym zapytaniem, albo razem — kolejność nie ma znaczenia).
