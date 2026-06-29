import { createAdminClient } from './supabase-server'
import type { SubscriptionTier } from './types'

/**
 * Compteurs d'usage côté serveur (Supabase), pour :
 *  • plafonner le coût IA : quota mensuel d'analyses IA par utilisateur ;
 *  • limiter l'abus du endpoint public /api/quick-analysis : rate-limit par IP.
 *
 * S'appuie sur la table `usage_counters` + la fonction `incr_usage`
 * (migration 008_usage_counters.sql). À appliquer en base avant déploiement.
 */

// Quota IA mensuel par utilisateur (analyses IA = insights + analyses photo).
// `free` n'a pas accès à l'IA (déjà bloqué en amont) → 0.
export const AI_MONTHLY_QUOTA: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 200,
  business: 2000,
}

// Rate-limit du endpoint public /api/quick-analysis (par IP, fenêtre glissante 1 min).
export const QUICK_ANALYSIS_RATE = { limit: 30, windowSeconds: 60 }

export interface UsageResult { allowed: boolean; current: number }

/**
 * Incrémente atomiquement un compteur et indique si l'appel reste sous la limite.
 * Fail-open en cas d'erreur infra (DB indispo) : on log mais on n'interrompt PAS
 * le service — une panne Supabase ne doit pas bloquer les utilisateurs payants.
 */
export async function incrUsage(bucket: string, limit: number, ttlSeconds: number): Promise<UsageResult> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('incr_usage', {
      p_bucket: bucket,
      p_limit: limit,
      p_ttl_seconds: ttlSeconds,
    })
    if (error) {
      console.error('[usage] incr_usage RPC error:', error.message)
      return { allowed: true, current: 0 }
    }
    const row = Array.isArray(data) ? data[0] : data
    return { allowed: row?.allowed ?? true, current: row?.current_count ?? 0 }
  } catch (err) {
    console.error('[usage] incr_usage exception:', err)
    return { allowed: true, current: 0 }
  }
}

/** Bucket mensuel pour le quota IA d'un utilisateur (YYYY-MM dans la clé = reset mensuel). */
export function aiQuotaBucket(userId: string): string {
  const period = new Date().toISOString().slice(0, 7)
  return `ai:${userId}:${period}`
}

/** Vérifie + incrémente le quota IA mensuel. allowed=false si quota dépassé. */
export async function checkAiQuota(userId: string, tier: SubscriptionTier): Promise<UsageResult> {
  const limit = AI_MONTHLY_QUOTA[tier] ?? 0
  // TTL ~40 j (nettoyage) ; le mois encodé dans la clé garantit le vrai reset mensuel.
  return incrUsage(aiQuotaBucket(userId), limit, 40 * 24 * 3600)
}

/** Rate-limit par IP (fenêtre fixe). allowed=false si trop de requêtes dans la fenêtre. */
export async function checkIpRate(
  ip: string,
  prefix: string,
  limit: number,
  windowSeconds: number,
): Promise<UsageResult> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds)
  return incrUsage(`rl:${prefix}:${ip}:${window}`, limit, windowSeconds + 10)
}
