'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  listBiens, listBaux, listLoyers, createBien,
} from '@/lib/gestion-db'
import {
  synthese, construireAlertes, type BienGestion, type Bail, type Loyer,
  type SyntheseGestion, type Alerte,
} from '@/lib/gestion'

/**
 * Charge l'ensemble des données de gestion locative du user (biens, baux,
 * loyers) et en dérive la synthèse + les alertes pour le dashboard.
 * CRUD client-side sécurisé par RLS (cf. gestion-db).
 */
export function useGestion(userId: string | null) {
  const [biens, setBiens] = useState<BienGestion[]>([])
  const [baux, setBaux] = useState<Bail[]>([])
  const [loyers, setLoyers] = useState<Loyer[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!userId) { setBiens([]); setBaux([]); setLoyers([]); setLoading(false); return }
    setLoading(true)
    try {
      const [b, bx, l] = await Promise.all([
        listBiens(userId),
        listBaux(userId),
        listLoyers(userId),
      ])
      setBiens(b); setBaux(bx); setLoyers(l)
    } catch (e) {
      console.error('[useGestion] fetch', e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const ajouterBien = useCallback(async (payload: Parameters<typeof createBien>[0]) => {
    const r = await createBien(payload)
    if (!r.error) await fetchAll()
    return r
  }, [fetchAll])

  const stats: SyntheseGestion = useMemo(() => synthese(biens, loyers), [biens, loyers])
  const alertes: Alerte[] = useMemo(() => construireAlertes(biens, baux, loyers), [biens, baux, loyers])

  return { biens, baux, loyers, loading, stats, alertes, refetch: fetchAll, ajouterBien }
}
