-- ============================================================
-- ImmoAnalyse — Supabase Schema
-- Exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Extension pour UUIDs
create extension if not exists "uuid-ossp";

-- ─── Table: profiles ──────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                  uuid        references auth.users(id) on delete cascade primary key,
  email               text        not null,
  full_name           text,
  avatar_url          text,
  subscription_tier    text        not null default 'free' check (subscription_tier in ('free', 'pro', 'business')),
  stripe_customer_id   text        unique,
  onboarding_completed boolean     not null default false,
  investor_profile     text        check (investor_profile in ('debutant', 'experimente', 'professionnel')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── Table: simulations ───────────────────────────────────────────────────────
create table if not exists public.simulations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.profiles(id) on delete cascade not null,
  name        text        not null,
  params      jsonb       not null,
  results     jsonb,
  score       numeric(4,1),
  is_favorite boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index pour les queries fréquentes
create index if not exists simulations_user_id_idx on public.simulations(user_id);
create index if not exists simulations_created_at_idx on public.simulations(created_at desc);
create index if not exists simulations_score_idx on public.simulations(score desc);

-- ─── Table: ai_analyses ───────────────────────────────────────────────────────
create table if not exists public.ai_analyses (
  id              uuid        primary key default gen_random_uuid(),
  simulation_id   uuid        references public.simulations(id) on delete cascade,
  user_id         uuid        references public.profiles(id) on delete cascade not null,
  insights        jsonb       not null default '[]',
  summary         text,
  tokens_used     integer,
  created_at      timestamptz not null default now()
);

-- ─── Trigger: updated_at automatique ─────────────────────────────────────────
-- search_path fixe (sécurité : lint 0011) — corps n'utilise que now() (pg_catalog).
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = '';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger simulations_updated_at
  before update on public.simulations
  for each row execute function public.handle_updated_at();

-- ─── Trigger: créer profil automatiquement à l'inscription ───────────────────
-- SECURITY DEFINER (requis pour insérer dans profiles au signup) + search_path
-- fixe (lint 0011). objets qualifiés (public.profiles), coalesce/->> = pg_catalog.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- Ne pas exposer cette fonction en RPC (lints 0028/0029) : le trigger fonctionne
-- sans EXECUTE accordé (Postgres ne vérifie pas EXECUTE au déclenchement).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.simulations enable row level security;
alter table public.ai_analyses enable row level security;

-- Policies: profiles
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Policies: simulations
create policy "Users can view their own simulations"
  on public.simulations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own simulations"
  on public.simulations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own simulations"
  on public.simulations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own simulations"
  on public.simulations for delete
  using (auth.uid() = user_id);

-- Policies: ai_analyses
create policy "Users can view their own AI analyses"
  on public.ai_analyses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI analyses"
  on public.ai_analyses for insert
  with check (auth.uid() = user_id);

-- ─── Vues utilitaires ────────────────────────────────────────────────────────

-- Vue: simulation avec infos profil
-- security_invoker : la vue applique le RLS du user qui interroge (lint 0010).
create or replace view public.simulations_with_profile
with (security_invoker = true) as
select
  s.*,
  p.email,
  p.full_name,
  p.subscription_tier
from public.simulations s
join public.profiles p on p.id = s.user_id;

-- ─── Données de test (optionnel, commenter en prod) ──────────────────────────
-- insert into public.profiles (id, email, full_name, subscription_tier)
-- values ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User', 'pro');
