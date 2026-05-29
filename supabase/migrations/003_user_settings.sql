-- ================================================================
-- Migration 003 — Paramètres utilisateur (préférences + défauts calculateur)
-- À exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ================================================================

-- Colonne JSONB qui stocke les préférences applicatives et les valeurs
-- par défaut personnelles du calculateur.
-- Structure : { "preferences": {...}, "calculatorDefaults": {...} }
alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.profiles.settings is
  'User app preferences + personal calculator defaults (namespaced: preferences, calculatorDefaults).';

-- Les policies RLS existantes (SELECT/UPDATE sur sa propre ligne) couvrent
-- déjà la lecture et l'écriture de cette colonne — rien à ajouter.
