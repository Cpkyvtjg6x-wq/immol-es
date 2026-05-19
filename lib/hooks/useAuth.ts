'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    try {
      const supabase = createBrowserSupabaseClient()

      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      subscription = data.subscription
    } catch {
      // Supabase not configured (missing env vars) — treat as unauthenticated
      setLoading(false)
    }

    return () => subscription?.unsubscribe()
  }, [])

  return { user, loading }
}
