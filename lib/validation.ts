import { z } from 'zod'

/**
 * Validation des entrées des routes API (zod) — durcissement sécurité.
 * Avant : payloads lus en `any`, JSONB non borné (abus stockage), pas de garde de taille.
 */

/** Taille (octets) d'une valeur sérialisée en JSON — pour borner les payloads. */
export function jsonByteSize(v: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(v ?? null), 'utf8')
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; message: string }

/** safeParse + message d'erreur lisible (1re issue). */
export function validate<T>(schema: z.ZodType<T>, data: unknown): ValidationResult<T> {
  const r = schema.safeParse(data)
  if (r.success) return { ok: true, data: r.data }
  const i = r.error.issues[0]
  const path = i?.path.join('.') || 'body'
  return { ok: false, message: i ? `${path}: ${i.message}` : 'Données invalides' }
}

const shortText = z.string().max(300)
const num = z.number().finite()

// ── /api/quick-analysis (endpoint public — bornage strict des textes) ──────────
export const quickAnalysisSchema = z
  .object({
    prixAchat: num.positive(),
    surface: num.nonnegative().optional(),
    ville: shortText.optional(),
    dpe: shortText.optional(),
    locType: shortText.optional(),
    tmi: num.optional(),
    codePostal: shortText.optional(),
    quartier: shortText.optional(),
    adresse: z.string().max(500).optional(),
    titre: z.string().max(500).optional(),
    description: z.string().max(5000).optional(),
  })
  .passthrough()

// ── /api/photo-analysis ────────────────────────────────────────────────────────
export const photoAnalysisSchema = z.object({
  imageUrls: z.array(z.string().url().max(2000)).min(1).max(5),
  surface: num.nonnegative().optional(),
  typeBien: shortText.optional(),
  ville: shortText.optional(),
  prixAchat: num.nonnegative().optional(),
})

// ── /api/ai-analyse ─────────────────────────────────────────────────────────────
export const aiAnalyseSchema = z.object({
  params: z.object({ prixAchat: num.positive() }).passthrough(),
  fiscalParams: z.record(z.unknown()).optional(),
})

// ── /api/simulations/save ──────────────────────────────────────────────────────
export const simulationSaveSchema = z
  .object({
    name: z.string().min(1).max(200),
    params: z.record(z.unknown()),
    results: z.record(z.unknown()).nullish(),
    score: num.nullish(),
    sourceUrl: z.string().max(2000).nullish(),
    sourcePortal: shortText.nullish(),
  })
  .passthrough()
