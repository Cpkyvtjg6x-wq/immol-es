import type { SubscriptionTier } from '@/lib/types'

/**
 * Compte(s) propriétaire — accès Pro permanent (tests + admin), indépendamment
 * de la base et de Stripe.
 *
 * SOURCE UNIQUE partagée client + serveur : l'app (auth-context) forçait déjà le
 * Pro pour l'owner côté client, mais l'extension et les routes IA vérifient le
 * tier CÔTÉ SERVEUR (lecture de profiles.subscription_tier) → sans ce module,
 * l'owner voyait l'app en Pro mais se faisait gater (402) sur l'extension/API.
 * Ce fichier ne contient que des valeurs pures (aucun import client/serveur) →
 * importable des deux côtés sans risque.
 */
export const OWNER_EMAILS = ['jeanamin.morfin@gmail.com'] as const

/** Vrai si l'email correspond à un compte propriétaire (comparaison insensible à la casse). */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const e = email.trim().toLowerCase()
  return OWNER_EMAILS.some((o) => o.toLowerCase() === e)
}

/**
 * Tier effectif : 'pro' forcé pour un compte owner, sinon le tier réel (base).
 * (On reste sur 'pro' — même niveau que l'override client — pas 'business'.)
 */
export function effectiveTier(
  email: string | null | undefined,
  dbTier: SubscriptionTier,
): SubscriptionTier {
  return isOwnerEmail(email) ? 'pro' : dbTier
}
