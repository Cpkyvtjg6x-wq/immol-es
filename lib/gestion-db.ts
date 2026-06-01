// ─── IMMORA — Gestion locative : couche d'accès données (CRUD + Storage) ──────
// CRUD client-side via supabase-js. La sécurité repose sur les policies RLS
// (owner-only) posées en migration 006/007 : on ne fait jamais confiance au
// client seul, mais ces requêtes ne renvoient/écrivent que les lignes du user.

import { createBrowserSupabaseClient } from '@/lib/supabase'
import type {
  BienGestion, Locataire, Bail, Loyer, Travail, Charge, DocumentGED,
} from '@/lib/gestion'

type Mut = { error: string | null }
type Created<T> = { data: T | null; error: string | null }
type Insert<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
/** Payload de création : champs obligatoires K requis, le reste optionnel. */
type New<T, K extends keyof Insert<T>> = Partial<Insert<T>> & Pick<Insert<T>, K>

function sb() { return createBrowserSupabaseClient() }

async function selectOwned<T>(table: string, userId: string, bienId?: string | null): Promise<T[]> {
  try {
    let q = sb().from(table).select('*').eq('user_id', userId)
    if (bienId) q = q.eq('bien_id', bienId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) { console.error(`[gestion] select ${table}`, error.message); return [] }
    return (data ?? []) as T[]
  } catch (e) {
    console.error(`[gestion] select ${table}`, e); return []
  }
}

async function insertRow<T>(table: string, row: object): Promise<Created<T>> {
  try {
    const { data, error } = await sb().from(table).insert(row).select().single()
    return { data: (data as T) ?? null, error: error?.message ?? null }
  } catch (e) {
    console.error(`[gestion] insert ${table}`, e); return { data: null, error: 'Erreur enregistrement' }
  }
}

async function updateRow(table: string, id: string, patch: object): Promise<Mut> {
  try {
    const { error } = await sb().from(table).update(patch).eq('id', id)
    return { error: error?.message ?? null }
  } catch (e) {
    console.error(`[gestion] update ${table}`, e); return { error: 'Erreur mise à jour' }
  }
}

async function deleteRow(table: string, id: string): Promise<Mut> {
  try {
    const { error } = await sb().from(table).delete().eq('id', id)
    return { error: error?.message ?? null }
  } catch (e) {
    console.error(`[gestion] delete ${table}`, e); return { error: 'Erreur suppression' }
  }
}

// ─── Biens gérés ──────────────────────────────────────────────────────────────
export const listBiens  = (userId: string) => selectOwned<BienGestion>('biens_gestion', userId)

export async function getBien(id: string): Promise<BienGestion | null> {
  try {
    const { data, error } = await sb().from('biens_gestion').select('*').eq('id', id).single()
    if (error) { console.error('[gestion] getBien', error.message); return null }
    return (data as BienGestion) ?? null
  } catch (e) { console.error('[gestion] getBien', e); return null }
}
export const createBien = (row: New<BienGestion, 'user_id' | 'label'>) => insertRow<BienGestion>('biens_gestion', row)
export const updateBien = (id: string, patch: Partial<Insert<BienGestion>>) => updateRow('biens_gestion', id, patch)
export const deleteBien = (id: string) => deleteRow('biens_gestion', id)

// ─── Locataires ─────────────────────────────────────────────────────────────
export const listLocataires  = (userId: string, bienId?: string) => selectOwned<Locataire>('locataires', userId, bienId)
export const createLocataire = (row: New<Locataire, 'user_id' | 'nom'>) => insertRow<Locataire>('locataires', row)
export const updateLocataire = (id: string, patch: Partial<Insert<Locataire>>) => updateRow('locataires', id, patch)
export const deleteLocataire = (id: string) => deleteRow('locataires', id)

// ─── Baux ─────────────────────────────────────────────────────────────────────
export const listBaux   = (userId: string, bienId?: string) => selectOwned<Bail>('baux', userId, bienId)
export const createBail = (row: New<Bail, 'user_id' | 'bien_id' | 'date_debut'>) => insertRow<Bail>('baux', row)
export const updateBail = (id: string, patch: Partial<Insert<Bail>>) => updateRow('baux', id, patch)
export const deleteBail = (id: string) => deleteRow('baux', id)

// ─── Loyers (échéancier + paiements) ───────────────────────────────────────────
export const listLoyers = (userId: string, bienId?: string) => selectOwned<Loyer>('loyers', userId, bienId)

export async function listLoyersByBail(bailId: string): Promise<Loyer[]> {
  try {
    const { data, error } = await sb().from('loyers').select('*').eq('bail_id', bailId).order('periode', { ascending: false })
    if (error) { console.error('[gestion] loyers bail', error.message); return [] }
    return (data ?? []) as Loyer[]
  } catch (e) { console.error('[gestion] loyers bail', e); return [] }
}

/** Insertion en masse de l'échéancier (anti-doublon via unique(bail_id, periode)). */
export async function insertLoyers(
  rows: New<Loyer, 'user_id' | 'bien_id' | 'bail_id' | 'periode'>[],
): Promise<{ count: number; error: string | null }> {
  if (rows.length === 0) return { count: 0, error: null }
  try {
    const { data, error } = await sb().from('loyers')
      .upsert(rows, { onConflict: 'bail_id,periode', ignoreDuplicates: true })
      .select('id')
    return { count: data?.length ?? 0, error: error?.message ?? null }
  } catch (e) {
    console.error('[gestion] insertLoyers', e); return { count: 0, error: 'Erreur génération échéancier' }
  }
}

export const updateLoyer = (id: string, patch: Partial<Insert<Loyer>>) => updateRow('loyers', id, patch)
export const deleteLoyer = (id: string) => deleteRow('loyers', id)

// ─── Travaux ────────────────────────────────────────────────────────────────
export const listTravaux   = (userId: string, bienId?: string) => selectOwned<Travail>('travaux', userId, bienId)
export const createTravail = (row: New<Travail, 'user_id' | 'bien_id' | 'titre'>) => insertRow<Travail>('travaux', row)
export const updateTravail = (id: string, patch: Partial<Insert<Travail>>) => updateRow('travaux', id, patch)
export const deleteTravail = (id: string) => deleteRow('travaux', id)

// ─── Charges / dépenses ───────────────────────────────────────────────────────
export const listCharges  = (userId: string, bienId?: string) => selectOwned<Charge>('charges', userId, bienId)
export const createCharge = (row: New<Charge, 'user_id' | 'bien_id'>) => insertRow<Charge>('charges', row)
export const updateCharge = (id: string, patch: Partial<Insert<Charge>>) => updateRow('charges', id, patch)
export const deleteCharge = (id: string) => deleteRow('charges', id)

// ─── Documents (GED) + Storage ──────────────────────────────────────────────
const BUCKET = 'gestion-docs'

export const listDocuments  = (userId: string, bienId?: string) => selectOwned<DocumentGED>('documents', userId, bienId)
export const createDocument = (row: New<DocumentGED, 'user_id' | 'nom' | 'url'>) => insertRow<DocumentGED>('documents', row)

export async function deleteDocument(id: string, storagePath?: string | null): Promise<Mut> {
  if (storagePath) {
    try { await sb().storage.from(BUCKET).remove([storagePath]) } catch (e) { console.warn('[gestion] storage remove', e) }
  }
  return deleteRow('documents', id)
}

/** Upload d'un fichier dans le bucket privé. Chemin = {userId}/{bienId}/{ts}-{nom}. */
export async function uploadGestionDoc(
  userId: string, bienId: string | null, file: File,
): Promise<{ path: string | null; error: string | null }> {
  try {
    const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const path = `${userId}/${bienId ?? 'general'}/${Date.now()}-${safe}`
    const { error } = await sb().storage.from(BUCKET).upload(path, file, { upsert: false })
    if (error) return { path: null, error: error.message }
    return { path, error: null }
  } catch (e) {
    console.error('[gestion] upload', e); return { path: null, error: 'Erreur upload' }
  }
}

/** URL signée temporaire pour visualiser/télécharger un document privé. */
export async function getSignedDocUrl(path: string, expiresSec = 3600): Promise<string | null> {
  try {
    const { data, error } = await sb().storage.from(BUCKET).createSignedUrl(path, expiresSec)
    if (error) { console.error('[gestion] signed url', error.message); return null }
    return data?.signedUrl ?? null
  } catch (e) { console.error('[gestion] signed url', e); return null }
}
