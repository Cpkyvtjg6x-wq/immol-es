'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'
import { loadCustomTags, resolveTag, type CustomTag } from '@/lib/tags'
import { TagChip } from '@/components/app/TagChip'
import { AppShell } from '@/components/app/AppShell'
import { MarkOwnedModal } from '@/components/app/MarkOwnedModal'
import { AddOwnedModal } from '@/components/app/AddOwnedModal'
import { useToast } from '@/components/ui/Toast'
import { IconLightBulb, IconCheckCircle } from '@/components/ui/icons'

// ─── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} M€`
  if (n >= 1_000) return `${Math.round(n / 1_000)} k€`
  return `${Math.round(n)} €`
}

function fmtPct(n: number, dec = 1): string {
  return `${n.toFixed(dec)}%`
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyPortfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-th-surface2 border border-th-border-med flex items-center justify-center mb-5 text-3xl">
        🏘
      </div>
      <h2 className="text-xl font-black text-th-text-1 mb-2" style={{ letterSpacing: '-0.03em' }}>
        Votre portfolio est vide
      </h2>
      <p className="text-sm text-th-text-2 max-w-xs leading-relaxed mb-6">
        Analysez et sauvegardez des biens dans le calculateur pour les retrouver ici et suivre votre patrimoine global.
      </p>
      <Link
        href="/analyse"
        className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
      >
        Analyser mon premier bien →
      </Link>
    </div>
  )
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: string
}) {
  return (
    <div className="rounded-2xl border border-th-border bg-th-surface p-5 flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">{label}</p>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none" style={{ letterSpacing: '-0.04em', color: color ?? 'var(--c-text-1)' }}>
          {icon && <span className="mr-1">{icon}</span>}{value}
        </p>
        {sub && <p className="text-[11px] text-th-text-3 mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest mb-0.5">{children}</p>
      {sub && <p className="text-[12px] text-th-text-3">{sub}</p>}
    </div>
  )
}

// ─── 1. Comparaison des biens ─────────────────────────────────────────────────

type SortKey = 'score' | 'rendementBrut' | 'cashflowMensuel' | 'prixAchat'

function BuildingMini({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M3 22h18M9 7h.01M15 7h.01M9 11h.01M15 11h.01" />
    </svg>
  )
}

function ComparaisonBiens({ simulations, onMarkOwned, customTags = [] }: { simulations: SavedSimulation[]; onMarkOwned?: (sim: SavedSimulation) => void; customTags?: CustomTag[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('score')
  const [desc, setDesc] = useState(true)

  const sorted = useMemo(() => {
    return [...simulations].sort((a, b) => {
      const av = sortKey === 'score' ? (a.score ?? 0) : (a[sortKey] as number)
      const bv = sortKey === 'score' ? (b.score ?? 0) : (b[sortKey] as number)
      return desc ? bv - av : av - bv
    })
  }, [simulations, sortKey, desc])

  const maxRend = Math.max(...simulations.map((s) => s.rendementBrut), 0.1)
  const maxPrix = Math.max(...simulations.map((s) => s.prixAchat), 1)

  function ColBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k
    return (
      <button
        onClick={() => { if (active) setDesc(!desc); else { setSortKey(k); setDesc(true) } }}
        className={`text-[10px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-1 ${
          active ? 'text-th-text-1' : 'text-th-text-3 hover:text-th-text-2'
        }`}
      >
        {label}
        {active && <span className="opacity-60">{desc ? '▼' : '▲'}</span>}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-3 border-b border-th-border grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4">
        <div className="w-6" />
        <ColBtn k="prixAchat" label="Bien" />
        <div className="w-28 hidden md:block"><ColBtn k="rendementBrut" label="Rendement" /></div>
        <div className="w-20 hidden sm:block"><ColBtn k="cashflowMensuel" label="Cashflow" /></div>
        <div className="w-20 hidden lg:block"><span className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">Mensualité</span></div>
        <ColBtn k="score" label="Score" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-th-border">
        {sorted.map((sim, i) => {
          const score = sim.score ?? 0
          const scoreColor = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
          const cfPos = sim.cashflowMensuel >= 0
          const rendPct = (sim.rendementBrut / maxRend) * 100
          const prixPct = (sim.prixAchat / maxPrix) * 100
          const mensualite = sim.results?.mensualiteTotale ?? 0

          return (
            <div
              key={sim.id}
              className="px-5 py-3.5 grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 hover:bg-th-surface2 transition-colors"
            >
              {/* Rang */}
              <div className="w-6 h-6 rounded-full bg-th-surface2 border border-th-border flex items-center justify-center text-[10px] font-bold text-th-text-3 shrink-0">
                {i + 1}
              </div>

              {/* Nom + ville + prix bar */}
              <div className="min-w-0 group/row">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-th-text-1 truncate leading-snug">{sim.name}</p>
                  {sim.tags?.map(tid => {
                    const t = resolveTag(tid, customTags)
                    return t ? <TagChip key={tid} tag={t} size="xs" /> : null
                  })}
                  {onMarkOwned && (
                    <button
                      onClick={() => onMarkOwned(sim)}
                      title={sim.status === 'possede' ? 'Bien détenu' : 'Marquer comme détenu'}
                      className={`shrink-0 transition-colors ${sim.status === 'possede' ? 'text-emerald-500' : 'text-th-text-3 hover:text-emerald-500 opacity-0 group-hover/row:opacity-100'}`}
                    >
                      <BuildingMini />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-th-text-3 truncate">{sim.ville}</p>
                  <span className="text-th-text-3 text-[10px]">·</span>
                  <p className="text-[11px] text-th-text-2 shrink-0">
                    {sim.status === 'possede' && sim.acquired_at ? `acquis le ${new Date(sim.acquired_at).toLocaleDateString('fr-FR')}` : fmt(sim.prixAchat)}
                  </p>
                </div>
                {/* Prix bar */}
                <div className="h-0.5 bg-th-surface2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-th-surface3 rounded-full"
                    style={{ width: `${prixPct}%` }}
                  />
                </div>
              </div>

              {/* Rendement */}
              <div className="w-28 hidden md:block">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-emerald-400 tabular-nums">{fmtPct(sim.rendementBrut)}</p>
                  <p className="text-[10px] text-th-text-3">{fmtPct(sim.rendementNet)} net</p>
                </div>
                <div className="h-1 bg-th-surface2 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rendPct}%` }} />
                </div>
              </div>

              {/* Cashflow */}
              <div className="w-20 hidden sm:block text-right">
                <p className="text-[10px] text-th-text-3 mb-0.5">CF / mois</p>
                <p className={`text-sm font-bold tabular-nums ${cfPos ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cfPos ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                </p>
              </div>

              {/* Mensualité */}
              <div className="w-20 hidden lg:block text-right">
                <p className="text-[10px] text-th-text-3 mb-0.5">Mensualité</p>
                <p className="text-sm font-semibold text-th-text-1 tabular-nums">
                  {mensualite > 0 ? `${Math.round(mensualite)} €` : '—'}
                </p>
              </div>

              {/* Score */}
              <div className="w-10 text-right shrink-0">
                <p className="text-[10px] text-th-text-3 mb-0.5">Score</p>
                <p className="text-sm font-black tabular-nums" style={{ color: scoreColor }}>{score}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer link */}
      <div className="px-5 py-3 border-t border-th-border">
        <Link href="/comparer" className="text-[11px] font-semibold text-th-text-3 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
          Comparaison détaillée →
        </Link>
      </div>
    </div>
  )
}

// ─── 2. Consolidation Fiscale ─────────────────────────────────────────────────

function ConsolidationFiscale({ simulations }: { simulations: SavedSimulation[] }) {
  const data = useMemo(() => {
    const totalLoyersBruts = simulations.reduce(
      (a, s) => a + (s.results?.loyerAnnuelBrut ?? s.results?.revAnnuel ?? 0),
      0
    )
    const totalLoyersNets = simulations.reduce(
      (a, s) => a + (s.results?.revAnnuel ?? 0),
      0
    )
    const totalCharges = simulations.reduce(
      (a, s) => a + (s.results?.chargesAnnuelles ?? 0),
      0
    )
    const totalMensualites = simulations.reduce(
      (a, s) => a + (s.results?.mensualiteTotale ?? 0) * 12,
      0
    )
    const totalCashflowAnnuel = simulations.reduce(
      (a, s) => a + (s.results?.cashflowAnnuel ?? s.cashflowMensuel * 12),
      0
    )

    // TMI pondéré par prix d'achat
    const totalPrix = simulations.reduce((a, s) => a + s.prixAchat, 0)
    const tmiMoyen = totalPrix > 0
      ? simulations.reduce((a, s) => a + ((s.params.tmi as number) ?? 30) * s.prixAchat, 0) / totalPrix
      : 30

    // Revenu imposable estimé (revenus nets - charges déductibles ~60%)
    const revImposable = Math.max(0, totalLoyersNets - totalCharges * 0.6)
    // Estimation impôt : revenu imposable × TMI × 1.172 (IR + PS 17.2%)
    const impotEstime = Math.round(revImposable * (tmiMoyen / 100) * 1.172)

    return {
      totalLoyersBruts,
      totalLoyersNets,
      totalCharges,
      totalMensualites,
      totalCashflowAnnuel,
      tmiMoyen: Math.round(tmiMoyen),
      revImposable,
      impotEstime,
    }
  }, [simulations])

  const rows: { label: string; value: string; sub?: string; color: string }[] = [
    {
      label: 'Revenus locatifs bruts',
      value: `${fmt(data.totalLoyersBruts)} / an`,
      color: '#10b981',
    },
    {
      label: 'Revenus avec vacance locative',
      value: `${fmt(data.totalLoyersNets)} / an`,
      color: '#6ee7b7',
    },
    {
      label: 'Total charges annuelles',
      value: `− ${fmt(data.totalCharges)} / an`,
      color: '#f59e0b',
    },
    {
      label: 'Mensualités crédit annualisées',
      value: `− ${fmt(data.totalMensualites)} / an`,
      color: '#94a3b8',
    },
    {
      label: 'Cashflow net global',
      value: `${data.totalCashflowAnnuel >= 0 ? '+' : ''}${fmt(Math.abs(data.totalCashflowAnnuel))} / an`,
      color: data.totalCashflowAnnuel >= 0 ? '#10b981' : '#ef4444',
    },
    {
      label: `Impôt estimé (TMI ~${data.tmiMoyen}% + PS 17.2%)`,
      value: `≈ ${fmt(data.impotEstime)} / an`,
      sub: 'Estimation — dépend du régime fiscal de chaque bien',
      color: '#f97316',
    },
  ]

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
      <div className="px-5 py-3.5 border-b border-th-border">
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest">Consolidation fiscale</p>
      </div>
      <div className="divide-y divide-th-border">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`px-5 py-3 flex items-center justify-between gap-4 ${
              i === rows.length - 1 ? 'bg-th-surface' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-[13px] text-th-text-1 leading-snug">{row.label}</p>
              {row.sub && <p className="text-[10px] text-th-text-3 mt-0.5">{row.sub}</p>}
            </div>
            <p className="text-[14px] font-bold tabular-nums shrink-0" style={{ color: row.color }}>
              {row.value}
            </p>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 bg-blue-500/[0.04] border-t border-blue-500/10">
        <p className="text-[11px] text-blue-400 leading-snug">
          <span className="inline-flex items-center gap-1 align-middle"><IconLightBulb className="w-3.5 h-3.5 text-blue-400 shrink-0" /></span>{' '}Pour optimiser la fiscalité globale de votre portefeuille, simulez chaque bien avec le régime le plus adapté (LMNP réel, SCI IS, etc.).
        </p>
      </div>
    </div>
  )
}

// ─── 3. Timeline des prêts ────────────────────────────────────────────────────

const TIMELINE_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#14b8a6',
]

function TimelineAcquisition({ simulations }: { simulations: SavedSimulation[] }) {
  const now = new Date()
  const nowYear = now.getFullYear() + now.getMonth() / 12

  const items = useMemo(() => {
    return simulations
      .map((sim, idx) => {
        const startDate = new Date(sim.created_at)
        const startYear = startDate.getFullYear() + startDate.getMonth() / 12
        const duree = (sim.params.duree as number) ?? 20
        const endYear = startYear + duree
        const isActive = nowYear >= startYear && nowYear <= endYear
        const isFinished = nowYear > endYear
        const yearsLeft = Math.max(0, Math.ceil(endYear - nowYear))
        return { sim, startYear, endYear, duree, isActive, isFinished, yearsLeft, color: TIMELINE_COLORS[idx % TIMELINE_COLORS.length] }
      })
      .sort((a, b) => a.startYear - b.startYear)
  }, [simulations, nowYear])

  const minYear = Math.floor(Math.min(...items.map((i) => i.startYear)))
  const maxYear = Math.ceil(Math.max(...items.map((i) => i.endYear)))
  const totalYears = Math.max(maxYear - minYear, 1)

  const pct = (y: number) => Math.min(100, Math.max(0, ((y - minYear) / totalYears) * 100))
  const nowPct = pct(nowYear)

  // Tick years for axis
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round(minYear + (i / 5) * totalYears))

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
      <div className="px-5 py-3.5 border-b border-th-border flex items-center justify-between">
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-widest">Timeline des prêts</p>
        <span className="text-[10px] text-th-text-3 tabular-nums">{minYear} — {maxYear}</span>
      </div>

      <div className="px-5 py-5">
        {/* Bars */}
        <div className="space-y-3 mb-5">
          {items.map(({ sim, startYear, endYear, duree, isActive, isFinished, yearsLeft, color }) => {
            const left = pct(startYear)
            const width = Math.max(pct(endYear) - left, 2)

            return (
              <div key={sim.id} className="flex items-center gap-3">
                {/* Label */}
                <div className="w-28 shrink-0">
                  <p className="text-[11px] font-semibold text-th-text-1 truncate leading-snug">{sim.name}</p>
                  <p className="text-[10px] text-th-text-3">
                    {duree} ans ·{' '}
                    <span style={{ color: isFinished ? '#52525b' : isActive ? color : '#94a3b8' }}>
                      {isFinished ? 'Soldé' : isActive ? `${yearsLeft} an${yearsLeft > 1 ? 's' : ''} restants` : `Début ${Math.round(startYear)}`}
                    </span>
                  </p>
                </div>

                {/* Track */}
                <div className="flex-1 h-8 bg-th-surface2 rounded-lg relative overflow-hidden border border-th-border">
                  {/* Bar */}
                  <div
                    className="absolute inset-y-0 rounded flex items-center px-2 transition-all"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: isFinished ? 'rgba(255,255,255,0.03)' : `${color}1a`,
                      borderLeft: `2px solid ${isFinished ? 'rgba(255,255,255,0.08)' : color}`,
                    }}
                  >
                    {width > 18 && (
                      <span
                        className="text-[9px] font-bold truncate"
                        style={{ color: isFinished ? '#3f3f46' : color }}
                      >
                        {Math.round(startYear)} → {Math.round(endYear)}
                      </span>
                    )}
                  </div>

                  {/* "Aujourd'hui" line */}
                  <div
                    className="absolute inset-y-0 w-px z-10"
                    style={{ left: `${nowPct}%`, background: 'rgba(255,255,255,0.15)' }}
                  />
                </div>

                {/* Year fin */}
                <div className="w-10 text-right shrink-0">
                  <p
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color: isFinished ? '#3f3f46' : isActive ? color : '#6b7280' }}
                  >
                    {Math.round(endYear)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Axis */}
        <div className="flex justify-between pl-[140px] pr-[52px] border-t border-th-border pt-2">
          {ticks.map((year) => (
            <span key={year} className="text-[9px] text-th-text-3 tabular-nums">{year}</span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pl-[140px]">
          <div className="flex items-center gap-1.5">
            <div className="w-px h-4 bg-th-surface3" />
            <span className="text-[9px] text-th-text-3">Aujourd'hui</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { simulations, loading, setStatus, saveSimulation } = useSimulations(user?.id ?? null)
  const toast = useToast()
  const customTags = useMemo(() => loadCustomTags(user?.id ?? null), [user?.id])

  const ownedCount = simulations.filter((s) => s.status === 'possede').length
  const studyCount = simulations.length - ownedCount

  const [scope, setScope] = useState<'possede' | 'simule' | 'tous'>('tous')
  const [scopeInit, setScopeInit] = useState(false)
  useEffect(() => {
    if (!scopeInit && !loading && simulations.length > 0) {
      setScope(ownedCount > 0 ? 'possede' : 'tous')
      setScopeInit(true)
    }
  }, [scopeInit, loading, simulations.length, ownedCount])

  const [ownModalSim, setOwnModalSim] = useState<SavedSimulation | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const view = useMemo(() => {
    if (scope === 'possede') return simulations.filter((s) => s.status === 'possede')
    if (scope === 'simule') return simulations.filter((s) => s.status === 'simule')
    return simulations
  }, [simulations, scope])

  const scopeWord = scope === 'possede' ? 'détenu' : scope === 'simule' ? 'étudié' : 'simulé'

  const stats = useMemo(() => {
    if (view.length === 0) return null
    const totalPrix = view.reduce((a, s) => a + s.prixAchat, 0)
    const totalCfMensuel = view.reduce((a, s) => a + s.cashflowMensuel, 0)
    const totalCfAnnuel = totalCfMensuel * 12
    const avgScore = Math.round(view.reduce((a, s) => a + (s.score ?? 50), 0) / view.length)
    const rendPondere =
      totalPrix > 0 ? view.reduce((a, s) => a + s.rendementBrut * s.prixAchat, 0) / totalPrix : 0
    const effortEpargne = view.reduce((a, s) => a + Math.max(0, -s.cashflowMensuel), 0)
    const totalMensualites = view.reduce((a, s) => a + (s.results?.mensualiteTotale ?? 0), 0)
    const bestBien = [...view].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

    return {
      totalPrix,
      totalCfMensuel,
      totalCfAnnuel,
      avgScore,
      rendPondere,
      effortEpargne,
      totalMensualites,
      bestBien,
      count: view.length,
    }
  }, [view])

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="px-4 sm:px-6 md:px-8 py-8 lg:py-10">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              Portfolio
            </p>
            <h1
              className="text-2xl font-black text-th-text-1"
              style={{ letterSpacing: '-0.04em' }}
            >
              Mon portefeuille
            </h1>
            {stats && (
              <p className="text-sm text-th-text-2 mt-1">
                {stats.count} bien{stats.count > 1 ? 's' : ''} · {scope === 'possede' ? 'Votre patrimoine détenu' : scope === 'simule' ? 'Vos biens à l’étude' : 'Vue consolidée'}
              </p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Link
              href="/analyse"
              className="hidden sm:flex items-center gap-1.5 text-th-text-2 hover:text-th-text-1 font-semibold px-3 py-2 rounded-xl text-sm transition-all"
            >
              Analyse complète
            </Link>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold px-4 py-2 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un bien
            </button>
          </div>
        </div>

        {simulations.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <div className="space-y-8">

            {/* ── Sélecteur de périmètre ── */}
            <div className="inline-flex items-center gap-1 bg-th-surface2 border border-th-border rounded-xl p-1">
              {([
                { id: 'possede', label: 'Mes biens', count: ownedCount },
                { id: 'simule', label: 'Études', count: studyCount },
                { id: 'tous', label: 'Tous', count: simulations.length },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  onClick={() => setScope(o.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                    scope === o.id ? 'bg-th-surface text-th-text-1 shadow-card-th' : 'text-th-text-2 hover:text-th-text-1'
                  }`}
                >
                  {o.id === 'possede' && <BuildingMini className="w-3.5 h-3.5" />}
                  {o.label}
                  <span className="tabular-nums opacity-55">{o.count}</span>
                </button>
              ))}
            </div>

            {view.length === 0 ? (
              <div className="rounded-2xl border border-th-border bg-th-surface px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-th-surface2 border border-th-border flex items-center justify-center mx-auto mb-4 text-th-text-3">
                  <BuildingMini className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-th-text-1 mb-1">
                  {scope === 'possede' ? 'Aucun bien détenu pour l’instant' : 'Aucun bien à l’étude'}
                </p>
                <p className="text-xs text-th-text-2 max-w-sm mx-auto mb-5">
                  {scope === 'possede'
                    ? 'Ajoutez un bien que vous possédez déjà, ou marquez une étude existante comme détenue (icône bâtiment).'
                    : 'Analysez un nouveau bien pour démarrer une étude.'}
                </p>
                {scope === 'possede' && (
                  <button
                    onClick={() => setAddOpen(true)}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter un bien détenu
                  </button>
                )}
                <br />
                <button onClick={() => setScope('tous')} className="text-xs font-semibold text-emerald-500 hover:underline">
                  Voir tous les biens →
                </button>
              </div>
            ) : (
            <>

            {/* ── Section 1 : KPIs globaux ── */}
            {stats && (
              <section>
                <SectionTitle sub={scope === 'possede' ? 'Agrégat de vos biens détenus' : scope === 'simule' ? 'Agrégat de vos biens à l’étude' : 'Agrégat de tous vos biens'}>Vue d'ensemble</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <KpiCard
                    label={scope === 'possede' ? 'Patrimoine détenu' : 'Patrimoine brut'}
                    value={fmt(stats.totalPrix)}
                    sub={`${stats.count} bien${stats.count > 1 ? 's' : ''} ${scopeWord}${stats.count > 1 ? 's' : ''}`}
                  />
                  <KpiCard
                    label="Cashflow mensuel"
                    value={`${stats.totalCfMensuel >= 0 ? '+' : ''}${Math.round(stats.totalCfMensuel)} €`}
                    sub={`${stats.totalCfAnnuel >= 0 ? '+' : ''}${fmt(Math.abs(stats.totalCfAnnuel))} / an`}
                    color={stats.totalCfMensuel >= 0 ? '#10b981' : '#ef4444'}
                  />
                  <KpiCard
                    label="Rendement moyen"
                    value={fmtPct(stats.rendPondere)}
                    sub="pondéré par valeur"
                    color="#a78bfa"
                  />
                  <KpiCard
                    label={stats.effortEpargne > 0 ? "Effort d'épargne" : "Autofinancé"}
                    value={stats.effortEpargne > 0 ? `${Math.round(stats.effortEpargne)} €/mois` : 'OK'}
                    sub={stats.effortEpargne > 0 ? 'mensuel (biens négatifs)' : 'Cashflow global positif'}
                    color={stats.effortEpargne > 0 ? '#f97316' : '#10b981'}
                  />
                  <KpiCard
                    label="Score de santé"
                    value={`${stats.avgScore} / 100`}
                    sub={
                      stats.avgScore >= 70 ? 'Excellent' :
                      stats.avgScore >= 45 ? 'Correct' : 'À optimiser'
                    }
                    color={
                      stats.avgScore >= 70 ? '#10b981' :
                      stats.avgScore >= 45 ? '#f59e0b' : '#ef4444'
                    }
                  />
                </div>

                {/* Best bien highlight */}
                {stats.bestBien && (
                  <div className="mt-3 rounded-xl border border-th-border bg-th-surface px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.14] border border-emerald-500/20 flex items-center justify-center">
                        <IconCheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[11px] text-th-text-3 mb-0.5">Meilleure performance</p>
                        <p className="text-[13px] font-bold text-th-text-1">{stats.bestBien.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-th-text-3">Rendement</p>
                        <p className="text-sm font-bold text-emerald-400 tabular-nums">
                          {fmtPct(stats.bestBien.rendementBrut)} brut
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-th-text-3">Cashflow</p>
                        <p className={`text-sm font-bold tabular-nums ${
                          stats.bestBien.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {stats.bestBien.cashflowMensuel >= 0 ? '+' : ''}{Math.round(stats.bestBien.cashflowMensuel)} €
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-th-text-3">Score</p>
                        <p className="text-sm font-bold text-th-text-1 tabular-nums">
                          {stats.bestBien.score ?? '—'} / 100
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Section 2 : Comparaison des biens ── */}
            <section>
              <SectionTitle sub="Triez par n'importe quelle métrique · survolez pour marquer un bien détenu">Classement & comparaison</SectionTitle>
              <ComparaisonBiens simulations={view} onMarkOwned={setOwnModalSim} customTags={customTags} />
            </section>

            {/* ── Sections 3 & 4 : côte à côte ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section>
                <SectionTitle sub={scope === 'possede' ? 'Sur vos biens détenus' : 'Estimations globales du portefeuille'}>Consolidation fiscale</SectionTitle>
                <ConsolidationFiscale simulations={view} />
              </section>
              <section>
                <SectionTitle sub="Fin de prêt pour chaque bien">Timeline d'acquisition</SectionTitle>
                <TimelineAcquisition simulations={view} />
              </section>
            </div>

            </>
            )}
          </div>
        )}
      </div>

      <MarkOwnedModal
        open={!!ownModalSim}
        sim={ownModalSim}
        onClose={() => setOwnModalSim(null)}
        onConfirm={(status, acquiredAt) => {
          if (ownModalSim) {
            setStatus(ownModalSim.id, status, acquiredAt)
            toast.success(status === 'possede' ? 'Bien ajouté à votre patrimoine ✓' : 'Bien repassé en étude')
          }
          setOwnModalSim(null)
        }}
      />

      <AddOwnedModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (payload) => {
          const r = await saveSimulation({
            name: payload.name,
            params: payload.params,
            results: payload.results,
            score: payload.score,
            status: 'possede',
            acquiredAt: payload.acquiredAt,
          })
          if (r?.error) toast.error(r.error)
          else {
            toast.success('Bien ajouté à votre patrimoine ✓')
            setScope('possede')
          }
        }}
      />
    </AppShell>
  )
}
