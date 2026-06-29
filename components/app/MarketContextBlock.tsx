'use client'

import { LocalMarketData } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

// ─── Mini badge ────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: 'emerald' | 'amber' | 'red' | 'blue' | 'zinc' }) {
  const styles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red:     'bg-red-500/10 text-red-400 border-red-500/20',
    blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    zinc:    'bg-th-surface2 text-th-text-2 border-th-border',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[color]}`}>
      {label}
    </span>
  )
}

// ─── Métrique compacte ──────────────────────────────────────────────────────────

function Metric({ label, value, sub, color = 'text-th-text-1' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">{label}</p>
      <p className={`text-[18px] font-black tabular-nums leading-none ${color}`} style={{ letterSpacing: '-0.03em' }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-th-text-3">{sub}</p>}
    </div>
  )
}

// ─── Barre de jauge ────────────────────────────────────────────────────────────

function GaugeBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 bg-th-surface2 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  data: LocalMarketData
  surface: number
  prixAchat: number
  loading?: boolean
}

export function MarketContextBlock({ data, surface, prixAchat, loading }: Props) {

  if (loading) {
    return (
      <div className="rounded-2xl border border-th-border bg-th-surface px-6 py-8 flex items-center gap-3">
        <div className="w-4 h-4 border-[1.5px] border-th-border-med border-t-emerald-400 rounded-full animate-spin shrink-0" />
        <span className="text-[12px] text-th-text-3">Analyse du marché local en cours…</span>
      </div>
    )
  }

  const prixM2Achat = prixAchat > 0 && surface > 0 ? Math.round(prixAchat / surface) : 0

  const positionColor: Record<string, string> = {
    'sous-marche': 'text-emerald-400',
    'dans-marche': 'text-th-text-1',
    'sur-marche':  'text-amber-400',
    'inconnu':     'text-th-text-3',
  }
  const positionLabel: Record<string, string> = {
    'sous-marche': 'Sous le marché',
    'dans-marche': 'Dans le marché',
    'sur-marche':  'Au-dessus du marché',
    'inconnu':     '—',
  }
  const positionBadge: Record<string, 'emerald' | 'amber' | 'red' | 'blue' | 'zinc'> = {
    'sous-marche': 'emerald',
    'dans-marche': 'zinc',
    'sur-marche':  'amber',
    'inconnu':     'zinc',
  }

  const tensionLabel: Record<string, string> = {
    'tres-forte': 'Très forte',
    'forte':      'Forte',
    'normale':    'Normale',
    'faible':     'Faible',
  }
  const tensionColor: Record<string, 'emerald' | 'amber' | 'red' | 'blue' | 'zinc'> = {
    'tres-forte': 'emerald',
    'forte':      'emerald',
    'normale':    'amber',
    'faible':     'red',
  }

  const sourceLabel = data.source === 'dvf' ? `${data.nbTransactions} ventes DVF réelles` :
    data.source === 'mixed' ? `${data.nbTransactions} ventes + référentiel` :
    'Données de référence'

  const sourceDot = data.source === 'dvf' ? 'bg-emerald-500' :
    data.source === 'mixed' ? 'bg-amber-400' : 'bg-th-surface3'

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-th-border bg-th-surface2">
        <div className="flex items-center gap-2.5 min-w-0">
          <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider">
              Marché local
              {data.quartier && <span className="text-th-text-3"> · {data.quartier}</span>}
            </p>
            {data.adresse && (
              <p className="text-[10px] text-th-text-3 truncate mt-0.5">{data.adresse}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${sourceDot}`} />
          <span className="text-[10px] text-th-text-3">{sourceLabel}</span>
        </div>
      </div>

      {/* ── Métriques principales ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border-b border-th-border">
        <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-th-border">
          <Metric
            label="Prix médian/m²"
            value={`${data.prixM2Median.toLocaleString('fr-FR')} €`}
            sub={`Fourchette ${data.prixM2Min.toLocaleString('fr-FR')}–${data.prixM2Max.toLocaleString('fr-FR')} €`}
          />
        </div>
        <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-th-border">
          <Metric
            label="Loyer estimé"
            value={`${data.loyerEstimeTotal} €/mois`}
            sub={`${data.loyerFourchetteBas}–${data.loyerFourchettHaut} €`}
          />
        </div>
        <div className="px-5 py-4">
          <Metric
            label="Rendement brut marché"
            value={`${data.rendBrutMarche.toFixed(1)} %`}
            sub="loyer estimé / prix médian"
            color={data.rendBrutMarche >= 5 ? 'text-emerald-400' : data.rendBrutMarche >= 3.5 ? 'text-amber-400' : 'text-red-400'}
          />
        </div>
      </div>

      {/* ── Positionnement + tension ─────────────────────────────────────────── */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-th-border">

        {/* Positionnement prix d'achat */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">
            Positionnement du prix
          </p>
          {prixM2Achat > 0 ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[15px] font-black tabular-nums ${positionColor[data.positionPrix]}`} style={{ letterSpacing: '-0.03em' }}>
                  {prixM2Achat.toLocaleString('fr-FR')} €/m²
                </span>
                <Badge
                  label={positionLabel[data.positionPrix]}
                  color={positionBadge[data.positionPrix]}
                />
              </div>
              {data.positionPrix !== 'inconnu' && (
                <p className="text-[11px] text-th-text-2">
                  {data.ecartPrixMarche > 0
                    ? `+${data.ecartPrixMarche}% au-dessus du médian local (${data.prixM2Median.toLocaleString('fr-FR')} €/m²)`
                    : data.ecartPrixMarche < 0
                    ? `${data.ecartPrixMarche}% sous le médian local — bonne opportunité`
                    : `Dans le médian du marché local`}
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-th-text-3 italic">Renseignez le prix d'achat</p>
          )}
        </div>

        {/* Tension locative */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">
            Tension locative
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
              {tensionLabel[data.tensionLocative] ?? '—'}
            </span>
            <Badge
              label={`Score ${data.tensionScore}`}
              color={tensionColor[data.tensionLocative] ?? 'zinc'}
            />
          </div>
          <GaugeBar
            value={data.tensionScore}
            color={data.tensionScore >= 70 ? '#10b981' : data.tensionScore >= 45 ? '#f59e0b' : '#ef4444'}
          />
        </div>
      </div>

      {/* ── Prix max recommandé + comparatif ────────────────────────────────── */}
      <div className="px-5 py-4 flex items-start gap-4 flex-wrap">

        {/* Prix max pour 5% net */}
        {data.prixMaxRecommande > 0 && (
          <div className="flex-1 min-w-[180px] flex items-start gap-3 p-3 rounded-xl bg-blue-500/[0.05] border border-blue-500/15">
            <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <p className="text-[10px] font-semibold text-blue-400/70 uppercase tracking-wider mb-1">
                Prix max pour 5% net
              </p>
              <p className="text-[15px] font-black text-blue-300 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                {formatCurrency(data.prixMaxRecommande)}
              </p>
              <p className="text-[10px] text-blue-400/50 mt-0.5">
                Basé sur le loyer estimé à {data.loyerEstimeTotal} €/mois
              </p>
            </div>
          </div>
        )}

        {/* Comparatif ville */}
        {data.prixM2Ville > 0 && data.prixM2Median !== data.prixM2Ville && (
          <div className="flex-1 min-w-[180px] flex items-start gap-3 p-3 rounded-xl bg-th-surface2 border border-th-border">
            <svg className="w-4 h-4 text-th-text-2 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider mb-1">
                Médian ville entière
              </p>
              <p className="text-[15px] font-black text-th-text-1 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                {data.prixM2Ville.toLocaleString('fr-FR')} €/m²
              </p>
              {(() => {
                const diff = Math.round(((data.prixM2Median - data.prixM2Ville) / data.prixM2Ville) * 100)
                const color = Math.abs(diff) < 5 ? 'text-th-text-3' : diff > 0 ? 'text-amber-400' : 'text-emerald-400'
                return (
                  <p className={`text-[10px] mt-0.5 ${color}`}>
                    {diff > 0 ? `+${diff}%` : `${diff}%`} vs ville — quartier {diff > 0 ? 'premium' : 'abordable'}
                  </p>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
