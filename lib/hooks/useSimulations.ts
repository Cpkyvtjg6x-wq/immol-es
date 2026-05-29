'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { InvestmentParams, InvestmentResult, ScoreResult } from '@/lib/types'

export type SimulationStatus = 'simule' | 'possede'

export interface SavedSimulation {
  id: string
  name: string
  params: Partial<InvestmentParams>
  results: InvestmentResult | null
  score: number | null
  is_favorite: boolean
  tags: string[]
  status: SimulationStatus
  acquired_at: string | null
  created_at: string
  // derived display fields
  ville: string
  prixAchat: number
  rendementBrut: number
  rendementNet: number
  cashflowMensuel: number
}

export function useSimulations(userId: string | null) {
  const [simulations, setSimulations] = useState<SavedSimulation[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSimulations = useCallback(async () => {
    if (!userId) { setSimulations([]); return }
    setLoading(true)

    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from('simulations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setSimulations(
          data.map((s: Record<string, unknown>) => {
            const params = (s.params as Partial<InvestmentParams>) || {}
            const results = (s.results as InvestmentResult) || null
            return {
              id: s.id as string,
              name: s.name as string,
              params,
              results,
              score: (s.score as number) || null,
              is_favorite: (s.is_favorite as boolean) || false,
              tags: (s.tags as string[]) || [],
              status: ((s.status as SimulationStatus) === 'possede' ? 'possede' : 'simule'),
              acquired_at: (s.acquired_at as string) || null,
              created_at: s.created_at as string,
              ville: (params.ville as string) || '',
              prixAchat: (params.prixAchat as number) || 0,
              rendementBrut: results?.rendementBrut || 0,
              rendementNet: results?.rendementNet || 0,
              cashflowMensuel: results?.cashflowMensuel || 0,
            }
          })
        )
      }
    } catch (err) {
      console.error('[useSimulations] fetchSimulations error:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSimulations()
  }, [fetchSimulations])

  const saveSimulation = useCallback(async ({
    name,
    params,
    results,
    score,
    status,
    acquiredAt,
  }: {
    name: string
    params: Partial<InvestmentParams>
    results: InvestmentResult
    score: ScoreResult
    status?: SimulationStatus
    acquiredAt?: string | null
  }) => {
    if (!userId) return { error: 'Non connecte' }

    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.from('simulations').insert({
        user_id: userId,
        name,
        params,
        results,
        score: score.global,
        tags: [],
        status: status ?? 'simule',
        acquired_at: status === 'possede' ? (acquiredAt ?? null) : null,
      })

      if (!error) await fetchSimulations()
      return { error: error?.message || null }
    } catch (err) {
      console.error('[useSimulations] saveSimulation error:', err)
      return { error: 'Erreur lors de la sauvegarde' }
    }
  }, [userId, fetchSimulations])

  const deleteSimulation = useCallback(async (id: string) => {
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase.from('simulations').delete().eq('id', id)
      await fetchSimulations()
    } catch (err) {
      console.error('[useSimulations] deleteSimulation error:', err)
    }
  }, [fetchSimulations])

  const toggleFavorite = useCallback(async (id: string, current: boolean) => {
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase.from('simulations').update({ is_favorite: !current }).eq('id', id)
      await fetchSimulations()
    } catch (err) {
      console.error('[useSimulations] toggleFavorite error:', err)
    }
  }, [fetchSimulations])

  const setStatus = useCallback(async (id: string, status: SimulationStatus, acquiredAt?: string | null) => {
    try {
      const supabase = createBrowserSupabaseClient()
      const patch: { status: SimulationStatus; acquired_at?: string | null } = { status }
      if (status === 'possede') patch.acquired_at = acquiredAt ?? null
      else patch.acquired_at = null
      await supabase.from('simulations').update(patch).eq('id', id)
      setSimulations(prev =>
        prev.map(s => (s.id === id ? { ...s, status, acquired_at: patch.acquired_at ?? null } : s))
      )
    } catch (err) {
      console.error('[useSimulations] setStatus error:', err)
    }
  }, [])

  const updateTags = useCallback(async (id: string, tags: string[]) => {
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase.from('simulations').update({ tags }).eq('id', id)
      setSimulations(prev => prev.map(s => s.id === id ? { ...s, tags } : s))
    } catch (err) {
      console.error('[useSimulations] updateTags error:', err)
    }
  }, [])

  return { simulations, loading, saveSimulation, deleteSimulation, toggleFavorite, updateTags, setStatus, refetch: fetchSimulations }
}
