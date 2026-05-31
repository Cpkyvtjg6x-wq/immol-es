/**
 * Helper d'authentification pour les routes API appelées par l'extension Chrome.
 *
 * Le content script de l'extension ne peut pas envoyer les cookies de
 * immora.app (CORS bloque les cookies cross-origin). À la place, le service
 * worker de l'extension lit le cookie de session, en extrait l'access_token
 * (JWT) et l'envoie en header `Authorization: Bearer <token>`.
 *
 * Côté serveur, on décode le token via la clé anonyme Supabase, on récupère
 * l'user, puis son `subscription_tier` dans la table `profiles`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/lib/types'

let _adminClient: SupabaseClient | null = null
function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }
  return _adminClient
}

/**
 * Defaults du calculateur configurés par l'utilisateur dans /settings.
 * Optionnels — si non définis, on utilise les valeurs marché standard.
 */
export interface UserCalcDefaults {
  tmi?: number              // 0, 11, 30, 41, 45 (en %)
  apportPct?: number        // 0.20 = 20%
  locType?: 'meuble' | 'nu'
  dureeCredit?: number      // 20 (en années)
  tauxCredit?: number       // 3.5 (en %)
}

export interface ExtensionAuth {
  userId: string | null
  email: string | null
  tier: SubscriptionTier
  // Convenience : équivalents de useEntitlements côté serveur
  canUseAI: boolean
  canFullMarketData: boolean
  canExportPdf: boolean
  canBankReport: boolean
  canTrackPatrimoine: boolean
  // Defaults du user (vide si anonyme)
  calcDefaults: UserCalcDefaults
}

const ANON_AUTH: ExtensionAuth = {
  userId: null,
  email: null,
  tier: 'free',
  canUseAI: false,
  canFullMarketData: false,
  canExportPdf: false,
  canBankReport: false,
  canTrackPatrimoine: false,
  calcDefaults: {},
}

/**
 * Décode le header Authorization de la requête entrante et retourne
 * les capacités de l'utilisateur. Retourne l'auth anonyme (=free) si
 * aucun token ou si invalide.
 */
export async function authenticateExtensionRequest(
  authorizationHeader: string | null,
): Promise<ExtensionAuth> {
  if (!authorizationHeader) return ANON_AUTH

  const m = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  if (!m) return ANON_AUTH

  const token = m[1].trim()
  if (!token) return ANON_AUTH

  try {
    const admin = getAdminClient()
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return ANON_AUTH

    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, settings')
      .eq('id', user.id)
      .single()

    const tier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
    const limits = SUBSCRIPTION_LIMITS[tier] ?? SUBSCRIPTION_LIMITS.free

    // Extraction des defaults configurés par l'utilisateur (cf. /settings)
    const settings = (profile?.settings ?? {}) as Record<string, unknown>
    const cd = (settings.calculatorDefaults ?? {}) as Record<string, unknown>
    const calcDefaults: UserCalcDefaults = {
      tmi:          typeof cd.tmi === 'number' ? cd.tmi : undefined,
      apportPct:    typeof cd.apportPct === 'number' ? cd.apportPct : undefined,
      locType:      cd.locType === 'meuble' || cd.locType === 'nu' ? cd.locType : undefined,
      dureeCredit:  typeof cd.dureeCredit === 'number' ? cd.dureeCredit : undefined,
      tauxCredit:   typeof cd.tauxCredit === 'number' ? cd.tauxCredit : undefined,
    }

    return {
      userId: user.id,
      email: user.email ?? null,
      tier,
      canUseAI: limits.aiInsights,
      canFullMarketData: limits.marketDataFull,
      canExportPdf: limits.exportPdf,
      canBankReport: limits.bankReport,
      canTrackPatrimoine: limits.patrimoine,
      calcDefaults,
    }
  } catch (err) {
    console.error('[extension-auth] error:', err)
    return ANON_AUTH
  }
}
