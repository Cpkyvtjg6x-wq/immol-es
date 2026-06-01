-- ============================================================
-- IMMORA — Migration 006 : Gestion locative
-- Biens gérés, locataires, baux, loyers (échéancier+quittances),
-- travaux, charges/dépenses, documents (GED).
-- RLS owner-only sur toutes les tables. FK vers profiles + simulations.
-- ============================================================

-- ─── 1. Biens gérés ───────────────────────────────────────────
create table if not exists public.biens_gestion (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  simulation_id    uuid references public.simulations(id) on delete set null,
  label            text not null,
  adresse          text,
  ville            text,
  code_postal      text,
  type_bien        text not null default 'appartement',
  surface          numeric,
  prix_acquisition numeric,
  date_acquisition date,
  dpe              text,
  statut           text not null default 'vacant' check (statut in ('loue','vacant','travaux')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists biens_gestion_user_idx on public.biens_gestion(user_id);
create index if not exists biens_gestion_sim_idx  on public.biens_gestion(simulation_id);

-- ─── 2. Locataires ────────────────────────────────────────────
create table if not exists public.locataires (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  bien_id        uuid references public.biens_gestion(id) on delete set null,
  civilite       text,
  nom            text not null,
  prenom         text,
  email          text,
  telephone      text,
  date_naissance date,
  garant_nom     text,
  garant_type    text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists locataires_user_idx on public.locataires(user_id);
create index if not exists locataires_bien_idx on public.locataires(bien_id);

-- ─── 3. Baux ──────────────────────────────────────────────────
create table if not exists public.baux (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  bien_id           uuid not null references public.biens_gestion(id) on delete cascade,
  locataire_id      uuid references public.locataires(id) on delete set null,
  type_bail         text not null default 'nu' check (type_bail in ('nu','meuble','etudiant','mobilite','colocation','commercial','saisonnier')),
  date_debut        date not null,
  duree_mois        integer not null default 36,
  date_fin          date,
  loyer_hc          numeric not null default 0,
  charges_provision numeric not null default 0,
  depot_garantie    numeric not null default 0,
  jour_paiement     integer not null default 1 check (jour_paiement between 1 and 31),
  irl_indice_base   numeric,
  irl_trimestre     text,
  date_revision     date,
  encadrement_ref   numeric,
  actif             boolean not null default true,
  document_url      text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists baux_user_idx on public.baux(user_id);
create index if not exists baux_bien_idx on public.baux(bien_id);

-- ─── 4. Loyers (échéancier + paiements) ───────────────────────
create table if not exists public.loyers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  bien_id         uuid not null references public.biens_gestion(id) on delete cascade,
  bail_id         uuid not null references public.baux(id) on delete cascade,
  periode         date not null,
  montant_loyer   numeric not null default 0,
  montant_charges numeric not null default 0,
  montant_du      numeric not null default 0,
  montant_paye    numeric not null default 0,
  date_echeance   date,
  date_paiement   date,
  statut          text not null default 'a_venir' check (statut in ('a_venir','paye','partiel','retard')),
  mode_paiement   text,
  quittance_url   text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (bail_id, periode)
);
create index if not exists loyers_user_idx    on public.loyers(user_id);
create index if not exists loyers_bien_idx    on public.loyers(bien_id);
create index if not exists loyers_periode_idx on public.loyers(periode desc);
create index if not exists loyers_statut_idx  on public.loyers(statut);

-- ─── 5. Travaux ───────────────────────────────────────────────
create table if not exists public.travaux (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  bien_id       uuid not null references public.biens_gestion(id) on delete cascade,
  titre         text not null,
  categorie     text,
  statut        text not null default 'a_faire' check (statut in ('a_faire','devis','en_cours','termine')),
  cout_estime   numeric default 0,
  cout_reel     numeric default 0,
  date_prevue   date,
  date_realisee date,
  artisan       text,
  deductible    boolean not null default true,
  facture_url   text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists travaux_user_idx on public.travaux(user_id);
create index if not exists travaux_bien_idx on public.travaux(bien_id);

-- ─── 6. Charges / dépenses ────────────────────────────────────
create table if not exists public.charges (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  bien_id      uuid not null references public.biens_gestion(id) on delete cascade,
  type         text not null default 'autre',
  libelle      text,
  montant      numeric not null default 0,
  date         date not null default current_date,
  recurrence   text not null default 'ponctuel' check (recurrence in ('ponctuel','mensuel','trimestriel','annuel')),
  deductible   boolean not null default true,
  recuperable  boolean not null default false,
  document_url text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists charges_user_idx on public.charges(user_id);
create index if not exists charges_bien_idx on public.charges(bien_id);
create index if not exists charges_date_idx on public.charges(date desc);

-- ─── 7. Documents (GED) ───────────────────────────────────────
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  bien_id       uuid references public.biens_gestion(id) on delete cascade,
  bail_id       uuid references public.baux(id) on delete set null,
  categorie     text not null default 'autre',
  nom           text not null,
  url           text not null,
  taille_octets integer,
  mime          text,
  created_at    timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents(user_id);
create index if not exists documents_bien_idx on public.documents(bien_id);

-- ─── Triggers updated_at (handle_updated_at() existe déjà) ─────
do $$
declare t text;
begin
  foreach t in array array['biens_gestion','locataires','baux','loyers','travaux','charges']
  loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.handle_updated_at()', t, t);
  end loop;
end $$;

-- ─── RLS owner-only (select/insert/update/delete) ─────────────
do $$
declare t text;
begin
  foreach t in array array['biens_gestion','locataires','baux','loyers','travaux','charges','documents']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('create policy "%s_select_own" on public.%I for select using (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('create policy "%s_update_own" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete using (auth.uid() = user_id)', t, t);
  end loop;
end $$;
