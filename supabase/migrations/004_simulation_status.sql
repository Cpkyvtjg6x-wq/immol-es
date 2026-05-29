-- ================================================================
-- Migration 004 — Statut de possession d'un bien
-- À exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ================================================================

-- Distingue les biens étudiés (prospects) des biens réellement détenus.
--   status     : 'simule' (défaut) | 'possede'
--   acquired_at: date d'acquisition optionnelle pour les biens détenus
alter table public.simulations
  add column if not exists status text not null default 'simule'
    check (status in ('simule', 'possede')),
  add column if not exists acquired_at date;

comment on column public.simulations.status is
  'simule = bien étudié (prospect) ; possede = bien détenu (patrimoine réel).';
comment on column public.simulations.acquired_at is
  'Date d''acquisition (optionnelle) si le bien est détenu.';

create index if not exists simulations_status_idx on public.simulations (status);

-- RLS existante (SELECT/UPDATE sur ses propres lignes) couvre déjà ces colonnes.
