'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { InvestmentParams, InvestmentResult, ScoreResult } from '@/lib/types'

export interface SavedSimulation {
  id: string
  name: string
  params: Partial<InvestmentParams>
  results: InvestmentResult | null
  score: number | null
  is_favorite: boolean
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

    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

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
            created_at: s.created_at as string,
            ville: (params.ville as string) || '—',
            prixAchat: (params.prixAchat as number) || 0,
            rendementBrut: results?.rendementBrut || 0,
            rendementNet: results?.rendementNet || 0,
            cashflowMensuel: results?.cashflowMensuel || 0,
          }
        })
      )
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchSimulations()
  }, [fetchSimulations])

  const saveSimulation = useCallback(async ({
    name,
    params,
    results,
    score,
  }: {
    name: string
    params: Partial<InvestmentParams>
    results: InvestmentResult
    score: ScoreResult
  }) => {
    if (!userId) return { error: 'Non connecté' }

    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.from('simulations').insert({
      user_id: userId,
      name,
      params,
      results,
      score: score.global,
    })

    if (!error) await fetchSimulations()
    return { error: error?.message || null }
  }, [userId, fetchSimulations])

  const deleteSimulation = useCallback(async (id: string) => {
    const supabase = createBrowserSupabaseClient()
    await supabase.from('simulations').delete().eq('id', id)
    await fetchSimulations()
  }, [fetchSimulations])

  const toggleFavorite = useCallback(async (id: string, current: boolean) => {
    const supabase = createBrowserSupabaseClient()
    await supabase.from('simulations').update({ is_favorite: !current }).eq('id', id)
    await fetchSimulations()
  }, [fetchSimulations])

  return { simulations, loading, saveSimulation, deleteSimulation, toggleFavorite, refetch: fetchSimulations }
}
