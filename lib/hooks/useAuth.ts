'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import type { SubscriptionTier } from '@/lib/types'

// Email du propriétaire — accès Pro permanent pour les tests
const OWNER_EMAIL = 'jeanamin.morfin@gmail.com'

export function useAuth() {
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
    let subscription: { unsubscribe: () => void } | null = null

    try {
      const supabase = createBrowserSupabaseClient()

      supabase.auth.getSession().then(({ data: { session } }) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) fetchProfile(u)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) fetchProfile(u)
        else setTier('free')
      })
      subscription = data.subscription
    } catch {
      setLoading(false)
    }

    return () => subscription?.unsubscribe()
  }, [fetchProfile])

  const isPro = tier === 'pro' || tier === 'business'

  return { user, loading, tier, isPro }
}
