'use client'

/**
 * useAuth — lit l'état auth depuis l'AuthContext global.
 *
 * Ce hook ne crée PLUS de listener onAuthStateChange.
 * L'unique listener est dans lib/auth-context.tsx (AuthProvider),
 * ce qui corrige React error #310 (setState concurrents lors du rendu).
 *
 * API conservée à l'identique pour ne pas casser les composants existants :
 *   const { user, loading, tier, isPro } = useAuth()
 */

export { useAuthContext as useAuth } from '@/lib/auth-context'
