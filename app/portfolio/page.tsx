'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'
import { AppShell } from '@/components/app/AppShell'
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
      <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-5 text-3xl">
        🏘
      </div>
      <h2 className="text-xl font-black text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
        Votre portfolio est vide
      </h2>
      <p className="text-sm text-zinc-400 max-w-xs leading-relaxed mb-6">
        Analysez et sauvegardez des biens dans le calculateur pour les retrouver ici et suivre votre patrimoine global.
      </p>
      <Link
        href="/analyse"
        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-3">
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{label}</p>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none" style={{ letterSpacing: '-0.04em', color: color ?? 'white' }}>
          {icon && <span className="mr-1">{icon}</span>}{value}
        </p>
        {sub && <p className="text-[11px] text-zinc-600 mt-1.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-0.5">{children}</p>
      {sub && <p className="text-[12px] text-zinc-600">{sub}</p>}
    </div>
  )
}

// ─── 1. Comparaison des biens ─────────────────────────────────────────────────

type SortKey = 'score' | 'rendementBrut' | 'cashflowMensuel' | 'prixAchat'

function ComparaisonBiens({ simulations }: { simulations: SavedSimulation[] }) {
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
          active ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
        }`}
      >
        {label}
        {active && <span className="opacity-60">{desc ? '▼' : '▲'}</span>}
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Table header */}
      <div className="px-5 py-3 border-b border-white/[0.05] grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4">
        <div className="w-6" />
        <ColBtn k="prixAchat" label="Bien" />
        <div className="w-28 hidden md:block"><ColBtn k="rendementBrut" label="Rendement" /></div>
        <div className="w-20 hidden sm:block"><ColBtn k="cashflowMensuel" label="Cashflow" /></div>
        <div className="w-20 hidden lg:block"><span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Mensualité</span></div>
        <ColBtn k="score" label="Score" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.03]">
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
              className="px-5 py-3.5 grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 hover:bg-white/[0.015] transition-colors"
            >
              {/* Rang */}
              <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[10px] font-bold text-zinc-600 shrink-0">
                {i + 1}
              </div>

              {/* Nom + ville + prix bar */}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white truncate leading-snug">{sim.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-zinc-600 truncate">{sim.ville}</p>
                  <span className="text-zinc-700 text-[10px]">·</span>
                  <p className="text-[11px] text-zinc-500 shrink-0">{fmt(sim.prixAchat)}</p>
                </div>
                {/* Prix bar */}
                <div className="h-0.5 bg-white/[0.05] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-white/20 rounded-full"
                    style={{ width: `${prixPct}%` }}
                  />
                </div>
              </div>

              {/* Rendement */}
              <div className="w-28 hidden md:block">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-emerald-400 tabular-nums">{fmtPct(sim.rendementBrut)}</p>
                  <p className="text-[10px] text-zinc-600">{fmtPct(sim.rendementNet)} net</p>
                </div>
                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rendPct}%` }} />
                </div>
              </div>

              {/* Cashflow */}
              <div className="w-20 hidden sm:block text-right">
                <p className="text-[10px] text-zinc-600 mb-0.5">CF / mois</p>
                <p className={`text-sm font-bold tabular-nums ${cfPos ? 'text-emerald-400' : 'text-red-400'}`}>
                  {cfPos ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                </p>
              </div>

              {/* Mensualité */}
              <div className="w-20 hidden lg:block text-right">
                <p className="text-[10px] text-zinc-600 mb-0.5">Mensualité</p>
                <p className="text-sm font-semibold text-zinc-300 tabular-nums">
                  {mensualite > 0 ? `${Math.round(mensualite)} €` : '—'}
                </p>
              </div>

              {/* Score */}
              <div className="w-10 text-right shrink-0">
                <p className="text-[10px] text-zinc-600 mb-0.5">Score</p>
                <p className="text-sm font-black tabular-nums" style={{ color: scoreColor }}>{score}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer link */}
      <div className="px-5 py-3 border-t border-white/[0.04]">
        <Link href="/comparer" className="text-[11px] font-semibold text-zinc-600 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.05]">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Consolidation fiscale</p>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`px-5 py-3 flex items-center justify-between gap-4 ${
              i === rows.length - 1 ? 'bg-white/[0.02]' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-[13px] text-zinc-300 leading-snug">{row.label}</p>
              {row.sub && <p className="text-[10px] text-zinc-600 mt-0.5">{row.sub}</p>}
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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Timeline des prêts</p>
        <span className="text-[10px] text-zinc-600 tabular-nums">{minYear} — {maxYear}</span>
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
                  <p className="text-[11px] font-semibold text-zinc-300 truncate leading-snug">{sim.name}</p>
                  <p className="text-[10px] text-zinc-600">
                    {duree} ans ·{' '}
                    <span style={{ color: isFinished ? '#52525b' : isActive ? color : '#94a3b8' }}>
                      {isFinished ? 'Soldé' : isActive ? `${yearsLeft} an${yearsLeft > 1 ? 's' : ''} restants` : `Début ${Math.round(startYear)}`}
                    </span>
                  </p>
                </div>

                {/* Track */}
                <div className="flex-1 h-8 bg-white/[0.025] rounded-lg relative overflow-hidden border border-white/[0.04]">
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
        <div className="flex justify-between pl-[140px] pr-[52px] border-t border-white/[0.04] pt-2">
          {ticks.map((year) => (
            <span key={year} className="text-[9px] text-zinc-700 tabular-nums">{year}</span>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 pl-[140px]">
          <div className="flex items-center gap-1.5">
            <div className="w-px h-4 bg-white/20" />
            <span className="text-[9px] text-zinc-600">Aujourd'hui</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { simulations, loading } = useSimulations(user?.id ?? null)

  const stats = useMemo(() => {
    if (simulations.length === 0) return null
    const totalPrix = simulations.reduce((a, s) => a + s.prixAchat, 0)
    const totalCfMensuel = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
    const totalCfAnnuel = totalCfMensuel * 12
    const avgScore = Math.round(
      simulations.reduce((a, s) => a + (s.score ?? 50), 0) / simulations.length
    )
    // Rendement pondéré par valeur du bien
    const rendPondere =
      totalPrix > 0
        ? simulations.reduce((a, s) => a + s.rendementBrut * s.prixAchat, 0) / totalPrix
        : 0
    // Effort d'épargne = somme des cashflows négatifs
    const effortEpargne = simulations.reduce(
      (a, s) => a + Math.max(0, -s.cashflowMensuel),
      0
    )
    const totalMensualites = simulations.reduce(
      (a, s) => a + (s.results?.mensualiteTotale ?? 0),
      0
    )
    const bestBien = [...simulations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

    return {
      totalPrix,
      totalCfMensuel,
      totalCfAnnuel,
      avgScore,
      rendPondere,
      effortEpargne,
      totalMensualites,
      bestBien,
      count: simulations.length,
    }
  }, [simulations])

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
              Portfolio
            </p>
            <h1
              className="text-2xl font-black text-white"
              style={{ letterSpacing: '-0.04em' }}
            >
              Mon portefeuille
            </h1>
            {stats && (
              <p className="text-sm text-zinc-500 mt-1">
                {stats.count} bien{stats.count > 1 ? 's' : ''} · Vue consolidée de votre patrimoine
              </p>
            )}
          </div>
          <Link
            href="/analyse"
            className="shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un bien
          </Link>
        </div>

        {simulations.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <div className="space-y-8">

            {/* ── Section 1 : KPIs globaux ── */}
            {stats && (
              <section>
                <SectionTitle sub="Agrégat de tous vos biens">Vue d'ensemble</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <KpiCard
                    label="Patrimoine brut"
                    value={fmt(stats.totalPrix)}
                    sub={`${stats.count} bien${stats.count > 1 ? 's' : ''} simulé${stats.count > 1 ? 's' : ''}`}
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
                  <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <IconCheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[11px] text-zinc-600 mb-0.5">Meilleure performance</p>
                        <p className="text-[13px] font-bold text-white">{stats.bestBien.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-600">Rendement</p>
                        <p className="text-sm font-bold text-emerald-400 tabular-nums">
                          {fmtPct(stats.bestBien.rendementBrut)} brut
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-600">Cashflow</p>
                        <p className={`text-sm font-bold tabular-nums ${
                          stats.bestBien.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {stats.bestBien.cashflowMensuel >= 0 ? '+' : ''}{Math.round(stats.bestBien.cashflowMensuel)} €
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-zinc-600">Score</p>
                        <p className="text-sm font-bold text-white tabular-nums">
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
              <SectionTitle sub="Triez par n'importe quelle métrique">Classement & comparaison</SectionTitle>
              <ComparaisonBiens simulations={simulations} />
            </section>

            {/* ── Sections 3 & 4 : côte à côte ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section>
                <SectionTitle sub="Estimations globales du portefeuille">Consolidation fiscale</SectionTitle>
                <ConsolidationFiscale simulations={simulations} />
              </section>
              <section>
                <SectionTitle sub="Fin de prêt pour chaque bien">Timeline d'acquisition</SectionTitle>
                <TimelineAcquisition simulations={simulations} />
              </section>
            </div>

          </div>
        )}
      </div>
    </AppShell>
  )
}
