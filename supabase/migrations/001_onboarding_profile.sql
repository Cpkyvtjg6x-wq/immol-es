-- ================================================================
-- Migration 001 — Onboarding & profil investisseur
-- À exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ================================================================

-- Ajouter les colonnes onboarding à la table profiles
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists investor_profile text check (investor_profile in ('debutant', 'experimente', 'professionnel'));

-- Mettre onboarding_completed = true pour les utilisateurs existants
-- (ils n'ont pas besoin de faire l'onboarding)
update public.profiles
set onboarding_completed = true
where created_at < now() - interval '1 minute';
