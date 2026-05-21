'use client'

/**
 * AuthContext — centralise l'état d'authentification Supabase.
 *
 * Pourquoi ce fichier existe :
 * Avant, chaque composant qui appelait useAuth() créait sa propre instance
 * du hook, avec son propre listener onAuthStateChange. Quand plusieurs
 * composants dans le même arbre (AppShell + DashboardPage par ex.) appelaient
 * useAuth() simultanément, les setUser() concurrents déclenchaient
 * React error #310 "Cannot update a component while rendering a different
 * component".
 *
 * Solution : un seul AuthProvider (placé dans le root layout) qui écoute
 * les événements auth UNE SEULE FOIS, et partage l'état via le contexte.
 * useAuth() lit simplement ce contexte — pas de listener supplémentaire.
 */

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { SubscriptionTier } from '@/lib/types'

// Email du propriétaire — accès Pro permanent pour les tests
const OWNER_EMAIL = 'jeanamin.morfin@gmail.com'

// ─── Context type ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null
  loading: boolean
  tier: SubscriptionTier
  isPro: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  tier: 'free',
  isPro: false,
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tier, setTier] = useState<SubscriptionTier>('free')
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (currentUser: User) => {
    // Owner mode — toujours Pro
    if (currentUser.email === OWNER_EMAIL) {
      setTier('pro')
      return
    }
    try {
      const supabase = createBrowserSupabaseClient()
      const { data } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', currentUser.id)
        .single()
      if (data?.subscription_tier) {
        setTier(data.subscription_tier as SubscriptionTier)
      }
    } catch {
      // Silently fail — keep default 'free'
    }
  }, [])

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    // Récupère la session courante (une seule fois au montage)
    // startTransition : évite React error #310 en différant les setState
    // qui pourraient s'enchaîner avec onAuthStateChange pendant l'hydratation.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null
        startTransition(() => {
          setUser(u)
          if (u) fetchProfile(u)
          setLoading(false)
        })
      })
      .catch(() => {
        startTransition(() => setLoading(false))
      })

    // UN SEUL listener pour toute l'application
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      startTransition(() => {
        setUser(u)
        if (u) fetchProfile(u)
        else setTier('free')
      })
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const isPro = tier === 'pro' || tier === 'business'

  return (
    <AuthContext.Provider value={{ user, loading, tier, isPro }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook public ──────────────────────────────────────────────────────────────

/**
 * Lit l'état auth depuis le contexte. Ne crée PAS de nouveau listener.
 * Doit être utilisé à l'intérieur d'un AuthProvider.
 */
export function useAuthContext() {
  return useContext(AuthContext)
}
