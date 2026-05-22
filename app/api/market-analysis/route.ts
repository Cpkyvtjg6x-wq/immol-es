import { NextRequest, NextResponse } from 'next/server'
import { getMarcheRef } from '@/lib/marche-reference'
import type { LocalMarketData } from '@/lib/types'

// ─── DVF Transaction type ──────────────────────────────────────────────────────

interface DvfRow {
  date_mutation: string
  valeur_fonciere: number
  surface_reelle_bati: number
  type_local: string           // "Appartement" | "Maison" | "Local industriel..."
  nature_mutation: string      // "Vente" | ...
  code_postal: string
  nom_commune: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.floor((p / 100) * (sorted.length - 1))
  return sorted[idx]
}

// Normalise city name for marche-reference lookup
function normVille(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['\s-]+/g, '')
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat    = parseFloat(sp.get('lat') ?? '')
  const lng    = parseFloat(sp.get('lng') ?? '')
  const ville  = sp.get('ville') ?? ''
  const cp     = sp.get('cp') ?? ''
  const surface = parseFloat(sp.get('surface') ?? '0') || 50
  const typeBien = sp.get('typeBien') ?? 'Appartement'
  const prixAchat = parseFloat(sp.get('prixAchat') ?? '0')

  const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0

  // ── 1. Données de référence interne (toujours disponibles) ──────────────────
  const refData = getMarcheRef(ville, cp || undefined)

  let dvfPrixM2: number[] = []
  let dvfSource: 'dvf' | 'reference' | 'mixed' = 'reference'
  let nbTransactions = 0

  // ── 2. DVF API — transactions réelles dans un rayon de 500m ──────────────────
  if (hasCoords) {
    const radii = [300, 500, 1000, 2000]  // essayer des rayons croissants
    for (const radius of radii) {
      try {
        const dvfUrl = `https://api.dvf.etalab.gouv.fr/dvf/rows/?lat=${lat}&lon=${lng}&dist=${radius}&nb_resultats=200`
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 6000)
        const res = await fetch(dvfUrl, {
          signal: ctrl.signal,
          headers: { 'Accept': 'application/json' },
        })
        clearTimeout(timer)

        if (res.ok) {
          const data = await res.json()
          const rows: DvfRow[] = data.results ?? data.rows ?? []

          // Filtrer : ventes immobilières résidentielles avec surface connue
          const isAppart = typeBien === 'Appartement' || typeBien === 'Studio'
          const isMaison = typeBien === 'Maison'
          const filtered = rows.filter(r =>
            r.nature_mutation === 'Vente' &&
            r.surface_reelle_bati > 10 &&
            r.valeur_fonciere > 10000 &&
            (isAppart
              ? r.type_local === 'Appartement'
              : isMaison
              ? r.type_local === 'Maison'
              : ['Appartement', 'Maison'].includes(r.type_local))
          )

          const prixM2Arr = filtered
            .map(r => r.valeur_fonciere / r.surface_reelle_bati)
            .filter(v => v > 500 && v < 30000) // sanity check

          if (prixM2Arr.length >= 5) {
            dvfPrixM2 = prixM2Arr
            nbTransactions = prixM2Arr.length
            dvfSource = radius <= 500 ? 'dvf' : 'mixed'
            break
          }
        }
      } catch {
        // timeout ou erreur réseau — on continue avec le rayon suivant ou le fallback
      }
    }
  }

  // ── 3. Calcul des métriques ───────────────────────────────────────────────────
  const useDvf = dvfPrixM2.length >= 5
  const prixM2Median  = useDvf ? Math.round(median(dvfPrixM2)) : refData.prixM2
  const prixM2Min     = useDvf ? Math.round(percentile(dvfPrixM2, 25)) : Math.round(refData.prixM2 * 0.82)
  const prixM2Max     = useDvf ? Math.round(percentile(dvfPrixM2, 75)) : Math.round(refData.prixM2 * 1.22)
  const prixM2Ville   = refData.prixM2   // référence ville entière

  // Loyer estimé
  const locType = sp.get('locType') ?? 'meuble'
  const loyerEstimeM2 = locType === 'nu' ? refData.loyerNu : refData.loyerMeuble
  const loyerEstimeTotal = Math.round(loyerEstimeM2 * surface)
  const loyerFourchetteBas = Math.round(loyerEstimeM2 * surface * 0.88)
  const loyerFourchettHaut = Math.round(loyerEstimeM2 * surface * 1.14)

  // Tension locative
  const tensionMap: Record<string, { score: number; tension: LocalMarketData['tensionLocative'] }> = {
    'forte':   { score: 82, tension: 'forte' },
    'moyenne': { score: 52, tension: 'normale' },
    'faible':  { score: 28, tension: 'faible' },
  }
  const tensionInfo = tensionMap[refData.tension] ?? { score: 52, tension: 'normale' as const }

  // Liquidité (basée sur nb transactions)
  const liquidite: LocalMarketData['liquidite'] =
    nbTransactions >= 30 ? 'forte' :
    nbTransactions >= 10 ? 'normale' : 'faible'

  // Positionnement du prix d'achat
  let positionPrix: LocalMarketData['positionPrix'] = 'inconnu'
  let ecartPrixMarche = 0
  if (prixAchat > 0 && surface > 0 && prixM2Median > 0) {
    const prixM2Achat = prixAchat / surface
    ecartPrixMarche = Math.round(((prixM2Achat - prixM2Median) / prixM2Median) * 100)
    positionPrix =
      ecartPrixMarche <= -10 ? 'sous-marche' :
      ecartPrixMarche <= 10  ? 'dans-marche' :
      'sur-marche'
  }

  // Rendement brut marché médian
  const rendBrutMarche = prixM2Median > 0
    ? Math.round((loyerEstimeM2 * 12 / prixM2Median) * 100 * 10) / 10
    : 0

  // Prix max pour 5% net (approx : charges ≈ 25% des loyers + notaire 8%)
  // loyer_annuel / 0.05 * 0.85 = prix max
  const prixMaxRecommande = loyerEstimeTotal > 0
    ? Math.round((loyerEstimeTotal * 12) / 0.05 * 0.82 / 1000) * 1000
    : 0

  const result: LocalMarketData = {
    source: dvfSource,
    adresse: sp.get('adresse') ?? undefined,
    quartier: sp.get('quartier') ?? undefined,
    ville: refData.label ?? ville,
    lat: hasCoords ? lat : undefined,
    lng: hasCoords ? lng : undefined,
    radiusM: useDvf ? 500 : 0,
    nbTransactions,
    prixM2Median,
    prixM2Min,
    prixM2Max,
    prixM2Ville,
    loyerEstimeM2,
    loyerEstimeTotal,
    loyerFourchetteBas,
    loyerFourchettHaut,
    positionPrix,
    ecartPrixMarche,
    tensionLocative: tensionInfo.tension,
    tensionScore: tensionInfo.score,
    liquidite,
    rendBrutMarche,
    prixMaxRecommande,
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
