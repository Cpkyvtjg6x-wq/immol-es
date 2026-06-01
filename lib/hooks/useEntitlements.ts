'use client'

import { useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { ENTITLEMENT_BYPASS, SUBSCRIPTION_LIMITS, SubscriptionTier } from '@/lib/types'

/**
 * Source unique des droits côté client.
 *
 * Toutes les vérifications de gating UI doivent passer par ici.
 * Côté serveur (routes API), refaire les checks indépendamment — ne jamais
 * faire confiance au client.
 *
 * Usage typique :
 *   const { canUseAI, canSaveMore, isLocked } = useEntitlements()
 *   if (!canSaveMore(simulations.length)) prompt('save')
 */
export function useEntitlements(currentSimCount = 0) {
  const { tier } = useAuth()

  return useMemo(() => {
    const safeTier = (tier as SubscriptionTier) ?? 'free'
    const limits = SUBSCRIPTION_LIMITS[safeTier] ?? SUBSCRIPTION_LIMITS.free
    const bypass = ENTITLEMENT_BYPASS

    const remaining = Number.isFinite(limits.simulations)
      ? Math.max(0, limits.simulations - currentSimCount)
      : Infinity

    return {
      tier: safeTier,
      isFree: safeTier === 'free' && !bypass,
      isPro: safeTier === 'pro' || safeTier === 'business' || bypass,
      isBusiness: safeTier === 'business' || bypass,
      limits,
      bypass,

      // ── Quotas / accès ────────────────────────────────────────────────
      canSaveMore: (count = currentSimCount) =>
        bypass || count < limits.simulations,
      remainingSimulations: bypass ? Infinity : remaining,
      simulationLimit: bypass ? Infinity : limits.simulations,

      canUseAI: bypass || limits.aiInsights,
      canExportPdf: bypass || limits.exportPdf,
      canExportExcel: bypass || limits.exportExcel,
      canBankReport: bypass || limits.bankReport,
      canCompare: bypass || limits.comparaison,
      comparaisonMax: bypass ? Infinity : limits.comparaisonMax,
      canTrackPatrimoine: bypass || limits.patrimoine,
      canFullMarketData: bypass || limits.marketDataFull,
      canWhiteLabel: bypass || limits.whiteLabel,
      canManageRentals: bypass || limits.gestionLocative,
    }
  }, [tier, currentSimCount])
}

export type Entitlements = ReturnType<typeof useEntitlements>
