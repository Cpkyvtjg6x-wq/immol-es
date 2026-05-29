'use client'

import { useCallback, useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  DEFAULT_USER_SETTINGS,
  normalizeSettings,
  readLocalSettings,
  writeLocalSettings,
  type UserSettings,
} from '@/lib/settings'

/**
 * Charge et persiste les paramètres utilisateur.
 *
 * - Initialise depuis le miroir localStorage (lecture synchrone, zéro flash).
 * - Récupère ensuite la version Supabase (source de vérité) et rafraîchit le miroir.
 * - save() écrit dans Supabase puis met à jour l'état + le miroir.
 */
export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<UserSettings>(() => readLocalSettings())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ─── Chargement depuis Supabase ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data } = await supabase
          .from('profiles')
          .select('settings')
          .eq('id', user.id)
          .single()
        if (cancelled) return
        const next = normalizeSettings(data?.settings)
        setSettings(next)
        writeLocalSettings(next)
      } catch {
        /* garde le miroir local */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  // ─── Sauvegarde ────────────────────────────────────────────────────────────
  const save = useCallback(
    async (next: UserSettings): Promise<{ error: string | null }> => {
      const normalized = normalizeSettings(next)
      // Optimiste : miroir local + état immédiats
      setSettings(normalized)
      writeLocalSettings(normalized)
      if (!user) return { error: null }

      setSaving(true)
      try {
        const supabase = createBrowserSupabaseClient()
        const { error } = await supabase
          .from('profiles')
          .update({ settings: normalized })
          .eq('id', user.id)
        return { error: error ? error.message : null }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Erreur réseau' }
      } finally {
        setSaving(false)
      }
    },
    [user],
  )

  return { settings, loading, saving, save, DEFAULT_USER_SETTINGS }
}
