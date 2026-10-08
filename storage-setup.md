-- ============================================================
-- MAPOWNIK — schemat bazy danych (Supabase / PostgreSQL)
-- ============================================================
-- Jak uruchomić: w panelu Supabase wejdź w "SQL Editor" -> "New query",
-- wklej całą zawartość tego pliku i kliknij "Run". Można uruchomić
-- wielokrotnie bezpiecznie (polecenia IF NOT EXISTS / DROP POLICY IF EXISTS).

-- ---------- Tabela: klientki ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  sort_key text not null default '',
  last_visit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_sort_key_idx on public.clients(user_id, sort_key);

-- ---------- Tabela: wizyty (historia mapek) ----------
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visit_date date not null default current_date,
  style text not null default '',
  eye_shape text not null default '',
  thickness text not null default '',
  curl text not null default '',
  length text not null default '',
  color text not null default '',
  notes text not null default '',
  map_image_path text,
  created_at timestamptz not null default now()
);

create index if not exists visits_client_id_idx on public.visits(client_id);
create index if not exists visits_user_id_idx on public.visits(user_id);

-- ---------- Row Level Security: każda użytkowniczka widzi TYLKO swoje dane ----------
alter table public.clients enable row level security;
alter table public.visits  enable row level security;

drop policy if exists "clients: select own" on public.clients;
create policy "clients: select own" on public.clients
  for select using (auth.uid() = user_id);

drop policy if exists "clients: insert own" on public.clients;
create policy "clients: insert own" on public.clients
  for insert with check (auth.uid() = user_id);

drop policy if exists "clients: update own" on public.clients;
create policy "clients: update own" on public.clients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "clients: delete own" on public.clients;
create policy "clients: delete own" on public.clients
  for delete using (auth.uid() = user_id);

drop policy if exists "visits: select own" on public.visits;
create policy "visits: select own" on public.visits
  for select using (auth.uid() = user_id);

drop policy if exists "visits: insert own" on public.visits;
create policy "visits: insert own" on public.visits
  for insert with check (auth.uid() = user_id);

drop policy if exists "visits: delete own" on public.visits;
create policy "visits: delete own" on public.visits
  for delete using (auth.uid() = user_id);

-- ---------- auto-update "updated_at" przy każdej zmianie klientki ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();
