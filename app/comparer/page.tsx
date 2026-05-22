'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'
import { formatCurrency, formatPct } from '@/lib/utils'
import { IconStar, IconLightBulb } from '@/components/ui/icons'

// ─── Types ─────────────────────────────────────────────────────────────────────

type MetricRow = {
  label: string
  key: (s: SavedSimulation) => string | number
  format: (v: string | number) => string
  higherIsBetter?: boolean
  section?: string
}

// ─── Metric definitions ────────────────────────────────────────────────────────

const METRICS: MetricRow[] = [
  // Rentabilité
  { section: 'Rentabilité', label: 'Rendement brut', key: s => s.rendementBrut, format: v => formatPct(v as number), higherIsBetter: true },
  { label: 'Rendement net', key: s => s.rendementNet, format: v => formatPct(v as number), higherIsBetter: true },
  { label: 'ROI sur apport', key: s => s.results?.roiApport ?? 0, format: v => formatPct(v as number), higherIsBetter: true },
  { label: 'TRI', key: s => s.results?.tri ?? 0, format: v => (v as number) > 0 ? formatPct(v as number) : 'N/A', higherIsBetter: true },
  // Cashflow
  { section: 'Cashflow', label: 'Cashflow mensuel', key: s => s.cashflowMensuel, format: v => `${(v as number) >= 0 ? '+' : ''}${Math.round(v as number)} €`, higherIsBetter: true },
  { label: 'Cashflow annuel', key: s => s.results?.cashflowAnnuel ?? 0, format: v => `${(v as number) >= 0 ? '+' : ''}${formatCurrency(v as number)}`, higherIsBetter: true },
  { label: 'Effort d\'épargne', key: s => s.results?.effortEpargne ?? 0, format: v => `${Math.round(v as number)} €/mois`, higherIsBetter: false },
  { label: 'Point mort loyer', key: s => s.results?.pointMort ?? 0, format: v => `${Math.round(v as number)} €/mois`, higherIsBetter: false },
  // Financement
  { section: 'Financement', label: 'Prix de revient', key: s => s.prixAchat, format: v => formatCurrency(v as number), higherIsBetter: false },
  { label: 'Mensualité crédit', key: s => s.results?.mensualiteCredit ?? 0, format: v => `${Math.round(v as number)} €/mois`, higherIsBetter: false },
  { label: 'Coût total crédit', key: s => s.results?.coutCredit ?? 0, format: v => formatCurrency(v as number), higherIsBetter: false },
  // Revente
  { section: 'Revente', label: 'Prix revente estimé', key: s => s.results?.prixRevente ?? 0, format: v => (v as number) > 0 ? formatCurrency(v as number) : '—', higherIsBetter: true },
  { label: 'Patrimoine net revente', key: s => s.results?.patrimoineNetRevente ?? 0, format: v => (v as number) > 0 ? formatCurrency(v as number) : '—', higherIsBetter: true },
  { label: 'Impôt plus-value', key: s => s.results?.impotPlusValue ?? 0, format: v => (v as number) > 0 ? formatCurrency(v as number) : '—', higherIsBetter: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreDot({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
}

function ScoreBadge({ score }: { score: number }) {
  const [color, bg, border] =
    score >= 70
      ? ['#10b981', 'rgba(16,185,129,0.1)', 'rgba(16,185,129,0.2)']
      : score >= 50
      ? ['#f59e0b', 'rgba(245,158,11,0.1)', 'rgba(245,158,11,0.2)']
      : ['#ef4444', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.2)']
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border tabular-nums"
      style={{ color, background: bg, borderColor: border }}
    >
      {score}/100
    </span>
  )
}

// ─── Empty / selector state ───────────────────────────────────────────────────

function SimSelector({
  simulations,
  selected,
  onSelect,
  onRemove,
  slotIndex,
}: {
  simulations: SavedSimulation[]
  selected: SavedSimulation | null
  onSelect: (s: SavedSimulation) => void
  onRemove: () => void
  slotIndex: number
}) {
  const [open, setOpen] = useState(false)

  if (selected) {
    return (
      <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <button
          onClick={onRemove}
          className="absolute top-3 right-3 w-6 h-6 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-start gap-2.5 pr-8">
          <ScoreDot score={selected.score ?? 0} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{selected.name}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{selected.ville}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Rend. brut</p>
            <p className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">{formatPct(selected.rendementBrut)}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Cashflow</p>
            <p className={`text-sm font-bold tabular-nums mt-0.5 ${selected.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {selected.cashflowMensuel >= 0 ? '+' : ''}{Math.round(selected.cashflowMensuel)} €
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.25] transition-all p-6 flex flex-col items-center gap-3 text-center"
      >
        <div className="w-10 h-10 rounded-xl border border-white/[0.08] bg-white/[0.04] flex items-center justify-center text-zinc-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-400">Bien {slotIndex + 1}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Sélectionner une simulation</p>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 z-20 rounded-xl border border-white/[0.1] bg-[#18181b] shadow-2xl overflow-hidden">
          {simulations.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-zinc-500">Aucune simulation sauvegardée</p>
              <Link href="/analyse" className="text-xs text-emerald-400 hover:underline mt-2 block">
                Analyser un bien →
              </Link>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
              {simulations.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onSelect(s); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-left"
                >
                  <ScoreDot score={s.score ?? 0} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-zinc-600">{s.ville} · {formatPct(s.rendementBrut)} brut</p>
                  </div>
                  {s.score !== null && <ScoreBadge score={s.score} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Comparison table ─────────────────────────────────────────────────────────

function ComparisonTable({ selected }: { selected: (SavedSimulation | null)[] }) {
  const active = selected.filter(Boolean) as SavedSimulation[]
  if (active.length < 2) return null

  let currentSection = ''

  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      {/* Column headers */}
      <div
        className="grid border-b border-white/[0.07] bg-white/[0.02]"
        style={{ gridTemplateColumns: `220px repeat(${active.length}, 1fr)` }}
      >
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Indicateur</p>
        </div>
        {active.map((s, i) => (
          <div key={s.id} className="px-5 py-3.5 border-l border-white/[0.05]">
            <div className="flex items-center gap-2">
              <ScoreDot score={s.score ?? 0} />
              <p className="text-[12px] font-bold text-white truncate">{s.name}</p>
            </div>
            <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{s.ville}</p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {METRICS.map((metric) => {
          const values = active.map(s => metric.key(s))
          const nums = values.map(v => typeof v === 'number' ? v : parseFloat(v as string) || 0)
          const best = metric.higherIsBetter ? Math.max(...nums) : Math.min(...nums)
          const worst = metric.higherIsBetter ? Math.min(...nums) : Math.max(...nums)

          const showSection = metric.section && metric.section !== currentSection
          if (metric.section) currentSection = metric.section

          return (
            <div key={metric.label}>
              {showSection && (
                <div className="px-5 py-2.5 bg-white/[0.015] border-b border-white/[0.04]">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{metric.section}</p>
                </div>
              )}
              <div
                className="grid hover:bg-white/[0.01] transition-colors"
                style={{ gridTemplateColumns: `220px repeat(${active.length}, 1fr)` }}
              >
                <div className="px-5 py-3.5 flex items-center">
                  <p className="text-[12px] text-zinc-400">{metric.label}</p>
                </div>
                {active.map((s, i) => {
                  const val = metric.key(s)
                  const num = typeof val === 'number' ? val : parseFloat(val as string) || 0
                  const isBest = nums.filter(v => v !== num || nums.filter(x => x === num).length > 1).length > 0 && num === best
                  const isWorst = active.length > 1 && num === worst && best !== worst

                  return (
                    <div key={s.id} className="px-5 py-3.5 border-l border-white/[0.05] flex items-center">
                      <span className={`text-[13px] font-bold tabular-nums ${
                        isBest && !isWorst
                          ? 'text-emerald-400'
                          : isWorst && !isBest
                          ? 'text-red-400'
                          : 'text-white'
                      }`}>
                        {metric.format(val)}
                      </span>
                      {isBest && !isWorst && active.length > 1 && (
                        <span className="ml-2 text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          ↑ Meilleur
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Score footer */}
      <div
        className="grid border-t border-white/[0.08] bg-white/[0.02]"
        style={{ gridTemplateColumns: `220px repeat(${active.length}, 1fr)` }}
      >
        <div className="px-5 py-4 flex items-center">
          <p className="text-[12px] font-bold text-white">Score global</p>
        </div>
        {active.map((s) => {
          const scores = active.map(x => x.score ?? 0)
          const bestScore = Math.max(...scores)
          return (
            <div key={s.id} className="px-5 py-4 border-l border-white/[0.05] flex items-center gap-2">
              <ScoreBadge score={s.score ?? 0} />
              {s.score === bestScore && active.length > 1 && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <IconStar className="w-3 h-3 inline mr-0.5" /> Recommandé
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparerPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { simulations, loading: simsLoading } = useSimulations(user?.id ?? null)

  const [selected, setSelected] = useState<(SavedSimulation | null)[]>([null, null, null])

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border border-white/[0.08] rounded-full" />
          <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const setSlot = (i: number, s: SavedSimulation) => {
    setSelected(prev => {
      const next = [...prev]
      next[i] = s
      return next
    })
  }

  const clearSlot = (i: number) => {
    setSelected(prev => {
      const next = [...prev]
      next[i] = null
      return next
    })
  }

  const activeCount = selected.filter(Boolean).length

  return (
    <AppShell>
      <div className="min-h-screen bg-[#09090b] text-white">

        {/* Top bar */}
        <div className="border-b border-white/[0.05] px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-0.5">
              Outils Pro
            </p>
            <h1 className="text-xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
              Comparateur de biens
            </h1>
          </div>
          <Link
            href="/analyse"
            className="flex items-center gap-2 text-sm font-semibold bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle analyse
          </Link>
        </div>

        <div className="px-8 py-8 space-y-8 max-w-7xl">

          {/* Intro */}
          <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.04] px-5 py-4">
            <p className="text-sm text-blue-300">
              <span className="inline-flex items-center gap-1.5 align-middle"><IconLightBulb className="w-4 h-4 text-blue-300 shrink-0" /></span>{' '}Sélectionnez jusqu&apos;à 3 simulations sauvegardées pour les comparer côte à côte. Les meilleures valeurs sont mises en vert, les moins bonnes en rouge.
            </p>
          </div>

          {/* Selector grid */}
          {simsLoading ? (
            <div className="flex items-center gap-3 py-8">
              <div className="relative w-5 h-5">
                <div className="w-5 h-5 border border-white/[0.08] rounded-full" />
                <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
              </div>
              <span className="text-sm text-zinc-500">Chargement des simulations…</span>
            </div>
          ) : simulations.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-base font-semibold text-white mb-2">Aucune simulation sauvegardée</p>
              <p className="text-sm text-zinc-500 mb-6">Analysez et sauvegardez au moins 2 biens pour les comparer.</p>
              <Link
                href="/analyse"
                className="inline-flex items-center gap-2 text-sm font-semibold bg-emerald-500 text-zinc-950 px-5 py-2.5 rounded-xl hover:bg-emerald-400 transition-all"
              >
                Analyser un bien
              </Link>
            </div>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  Choisir les biens à comparer
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {[0, 1, 2].map(i => (
                    <SimSelector
                      key={i}
                      simulations={simulations.filter(s => !selected.some((sel, j) => j !== i && sel?.id === s.id))}
                      selected={selected[i]}
                      onSelect={s => setSlot(i, s)}
                      onRemove={() => clearSlot(i)}
                      slotIndex={i}
                    />
                  ))}
                </div>
              </div>

              {/* Comparison table */}
              {activeCount >= 2 ? (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                    Comparatif détaillé
                  </p>
                  <ComparisonTable selected={selected} />
                </div>
              ) : (
                <div className="text-center py-12 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01]">
                  <p className="text-sm text-zinc-500">
                    Sélectionnez au moins 2 simulations pour afficher le comparatif
                  </p>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </AppShell>
  )
}
