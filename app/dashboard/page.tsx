'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts'
import { AppShell } from '@/components/app/AppShell'
import { IconCheckCircle } from '@/components/ui/icons'
import { OnboardingWizard } from '@/components/app/OnboardingWizard'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatPct, formatDate } from '@/lib/utils'
import { SUBSCRIPTION_LIMITS } from '@/lib/types'

/* ─────────────────────────── helpers ─────────────────────────── */

function ScoreBadge({ score }: { score: number }) {
  const [color, bg, border] =
    score >= 70
      ? ['#10b981', 'rgba(16,185,129,0.1)', 'rgba(16,185,129,0.2)']
      : score >= 50
      ? ['#f59e0b', 'rgba(245,158,11,0.1)', 'rgba(245,158,11,0.2)']
      : ['#ef4444', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.2)']
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border tabular-nums"
      style={{ color, background: bg, borderColor: border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {score}
    </span>
  )
}

/* ── Hero KPI card — grande métrique dominante ── */
function HeroKpi({
  label, value, sub, accent, delta,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
  delta?: { text: string; positive: boolean | null }
}) {
  const deltaColor =
    delta?.positive === true ? 'text-emerald-500' :
    delta?.positive === false ? 'text-red-400' :
    'text-th-text-3'

  return (
    <div
      className={`rounded-2xl border px-6 py-5 flex flex-col gap-3 transition-colors shadow-card-th ${
        accent
          ? 'border-emerald-500/30 bg-emerald-500/[0.13]'
          : 'border-th-border bg-th-surface hover:bg-th-surface2'
      }`}
    >
      <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-widest">{label}</p>
      <p
        className={`font-black tabular-nums leading-none ${accent ? 'text-emerald-500' : 'text-th-text-1'}`}
        style={{ fontSize: '30px', letterSpacing: '-0.04em' }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-th-text-3 leading-snug">{sub}</p>}
      {delta && (
        <p className={`text-[10px] font-semibold ${deltaColor}`}>
          {delta.text}
        </p>
      )}
    </div>
  )
}

/* ── Mini KPI card — métrique secondaire ── */
function MiniKpi({
  label, value, sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-th-border bg-th-surface px-4 py-3.5 flex flex-col gap-1.5 shadow-card-th">
      <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest leading-tight">{label}</p>
      <p
        className="font-bold tabular-nums leading-none text-th-text-1"
        style={{ fontSize: '18px', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-th-text-3 leading-snug">{sub}</p>}
    </div>
  )
}

/* ── Tooltip recharts — theme-aware ── */
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color?: string }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-th-surface2 border border-th-border rounded-xl px-4 py-3 shadow-card-th">
      <p className="text-xs font-semibold text-th-text-2 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? '#10b981' }} />
          <span className="text-th-text-2 text-xs">{p.name}</span>
          <span className="font-bold text-th-text-1 ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl border border-th-border bg-th-surface flex items-center justify-center mb-8 shadow-card-th">
        <svg className="w-7 h-7 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>

      <p className="text-xl font-black text-th-text-1 mb-3" style={{ letterSpacing: '-0.03em' }}>
        Votre premier investissement commence ici
      </p>
      <p className="text-sm text-th-text-2 mb-10 max-w-md leading-relaxed">
        Analysez un bien en 2 minutes — rendement net, cashflow mensuel, fiscalité optimale et score Immora calculés instantanément.
      </p>

      {/* Steps */}
      <div className="flex items-center gap-0 mb-10">
        {[
          { n: '1', label: 'Renseignez le bien et le financement' },
          { n: '2', label: 'Obtenez le score et les métriques clés' },
          { n: '3', label: 'Sauvegardez et comparez' },
        ].map((step, i) => (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center gap-2 w-32">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border ${
                i === 0
                  ? 'bg-emerald-500/[0.14] border-emerald-500/30 text-emerald-500'
                  : 'bg-th-surface2 border-th-border text-th-text-3'
              }`}>
                {step.n}
              </div>
              <p className="text-[10px] text-th-text-3 text-center leading-tight">{step.label}</p>
            </div>
            {i < 2 && <div className="w-8 h-px bg-th-border mx-1 mb-6 shrink-0" />}
          </div>
        ))}
      </div>

      <Link
        href="/analyse"
        className="flex items-center gap-2 text-sm font-bold bg-emerald-500 text-zinc-950 px-7 py-3.5 rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Analyser mon premier bien
      </Link>
      <p className="text-xs text-th-text-3 mt-4">Résultats instantanés · Sauvegarde automatique</p>
    </div>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading, isPro, tier } = useAuth()
  const { simulations, loading: simsLoading, deleteSimulation, toggleFavorite } = useSimulations(
    user?.id ?? null
  )
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checkoutBanner, setCheckoutBanner] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'tous' | 'favoris' | 'top' | 'positif'>('tous')
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'rendement' | 'cashflow'>('date')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  /* Chart colors adapt to theme */
  const chartGrid = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const chartAxis = isDark ? '#71717a' : '#a1a1aa'
  const chartCursor = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
  const chartBarBrut = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)'
  const chartRefLine = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'

  function loadSimulation(sim: SavedSimulation) {
    if (sim.params && Object.keys(sim.params).length > 0) {
      localStorage.setItem('immolyse_last_params', JSON.stringify(sim.params))
    }
    toast.info('Simulation chargée — paramètres restaurés')
    router.push('/analyse')
  }

  async function handleDelete(id: string) {
    await deleteSimulation(id)
    toast.success('Simulation supprimée')
  }

  async function handleToggleFavorite(id: string, isFav: boolean) {
    await toggleFavorite(id, isFav)
    toast.success(isFav ? 'Retiré des favoris' : 'Ajouté aux favoris')
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const checkOnboarding = async () => {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
        if (data && data.onboarding_completed === false) {
          setShowOnboarding(true)
        }
      } catch {
        // table absente ou colonne manquante — ne pas bloquer
      }
    }
    checkOnboarding()
  }, [user])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('checkout') === 'success') {
        setCheckoutBanner(true)
        window.history.replaceState({}, '', '/dashboard')
        setTimeout(() => setCheckoutBanner(false), 6000)
      }
    }
  }, [])

  const filteredSims = useMemo(() => {
    let list = [...simulations]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.ville.toLowerCase().includes(q)
      )
    }
    if (filterTab === 'favoris') list = list.filter(s => s.is_favorite)
    if (filterTab === 'top') list = list.filter(s => (s.score ?? 0) >= 70)
    if (filterTab === 'positif') list = list.filter(s => s.cashflowMensuel >= 0)
    if (sortBy === 'score') list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    else if (sortBy === 'rendement') list.sort((a, b) => b.rendementBrut - a.rendementBrut)
    else if (sortBy === 'cashflow') list.sort((a, b) => b.cashflowMensuel - a.cashflowMensuel)
    return list
  }, [simulations, search, filterTab, sortBy])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border border-th-border rounded-full" />
          <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'vous'

  /* ── Portfolio metrics ── */
  const totalCf = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
  const totalInvested = simulations.reduce((a, s) => a + s.prixAchat, 0)
  const avgScore =
    simulations.length > 0
      ? Math.round(simulations.reduce((a, s) => a + (s.score ?? 0), 0) / simulations.length)
      : 0
  const avgRendBrut =
    simulations.length > 0
      ? simulations.reduce((a, s) => a + s.rendementBrut, 0) / simulations.length
      : 0

  /* Meilleure simulation (score) */
  const best = simulations.length > 0
    ? [...simulations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
    : null

  /* Meilleur rendement net */
  const bestByNet = simulations.length > 0
    ? [...simulations].sort((a, b) => b.rendementNet - a.rendementNet)[0]
    : null

  /* Limite plan */
  const simLimit = isPro ? SUBSCRIPTION_LIMITS[tier ?? 'pro'].simulations : SUBSCRIPTION_LIMITS.free.simulations
  const simLimitDisplay = simLimit === Infinity ? null : simLimit

  /* Chart data */
  const rendChart = simulations.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
    Brut: Math.round(s.rendementBrut * 100) / 100,
    Net: Math.round(s.rendementNet * 100) / 100,
  }))
  const cfChart = simulations.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
    cashflow: Math.round(s.cashflowMensuel),
  }))

  return (
    <AppShell>
      {showOnboarding && user && (
        <OnboardingWizard
          userId={user.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <div className="min-h-screen bg-th-bg">

        {/* ── Banner checkout ── */}
        {checkoutBanner && (
          <div className="mx-8 mt-4 rounded-xl bg-emerald-500/[0.14] border border-emerald-500/20 px-5 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <IconCheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-th-text-1">Abonnement activé</p>
              <p className="text-xs text-th-text-2">Bienvenue dans IMMORA Pro. Toutes les fonctionnalités sont débloquées.</p>
            </div>
            <button onClick={() => setCheckoutBanner(false)} className="ml-auto text-th-text-3 hover:text-th-text-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="border-b border-th-border px-6 md:px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-widest mb-1">
              Tableau de bord
            </p>
            <h1
              className="text-xl font-black text-th-text-1"
              style={{ letterSpacing: '-0.03em' }}
            >
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
            </h1>
          </div>
          <Link
            href="/analyse"
            className="flex items-center gap-2 text-sm font-semibold bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle analyse
          </Link>
        </div>

        {/* ── Content ── */}
        <div className="px-6 md:px-8 py-7 space-y-7">

          {simsLoading ? (
            <div className="flex items-center justify-center py-24 gap-3">
              <div className="relative w-6 h-6">
                <div className="w-6 h-6 border border-th-border rounded-full" />
                <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
              </div>
              <span className="text-sm text-th-text-2">Chargement…</span>
            </div>
          ) : simulations.length === 0 ? (
            <EmptyState />
          ) : (
            <>

              {/* ── Hero KPIs ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <HeroKpi
                  label="Meilleur rendement net"
                  value={bestByNet ? formatPct(bestByNet.rendementNet) : '—'}
                  sub={bestByNet ? `${bestByNet.name} · ${bestByNet.ville}` : undefined}
                  accent
                />
                <HeroKpi
                  label="Cashflow mensuel total"
                  value={`${totalCf >= 0 ? '+' : ''}${Math.round(totalCf)} €`}
                  sub={`${Math.round(totalCf * 12).toLocaleString('fr')} € par an`}
                  delta={totalCf >= 0
                    ? { text: 'Portefeuille autofinancé', positive: true }
                    : { text: `Effort mensuel nécessaire`, positive: false }}
                />
                <HeroKpi
                  label="Score moyen"
                  value={`${avgScore} / 100`}
                  sub={avgScore >= 70 ? 'Excellent portefeuille' : avgScore >= 50 ? 'Portefeuille solide' : 'Portefeuille à optimiser'}
                  delta={simulations.length > 1 ? {
                    text: `${simulations.length} biens analysés`,
                    positive: null,
                  } : undefined}
                />
              </div>

              {/* ── Mini KPIs ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <MiniKpi
                  label="Rendement brut moyen"
                  value={formatPct(avgRendBrut)}
                  sub="Loyers / prix acquisition"
                />
                <MiniKpi
                  label="Patrimoine simulé"
                  value={totalInvested > 0 ? formatCurrency(totalInvested) : '—'}
                  sub="Valeur totale des biens"
                />
                <MiniKpi
                  label="Cashflow annuel"
                  value={`${totalCf >= 0 ? '+' : ''}${Math.round(totalCf * 12).toLocaleString('fr')} €`}
                  sub="Cumul sur 12 mois"
                />
                <MiniKpi
                  label="Simulations"
                  value={simLimitDisplay
                    ? `${simulations.length} / ${simLimitDisplay}`
                    : simulations.length.toString()}
                  sub={simLimitDisplay && simulations.length >= simLimitDisplay * 0.7 ? 'Bientôt à la limite' : 'Sauvegardes actives'}
                />
              </div>

              {/* ── Meilleure simulation ── */}
              {best && (
                <div className="rounded-xl border border-emerald-500/[0.12] bg-emerald-500/[0.13] px-5 py-4 flex items-center gap-6">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/[0.14] border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest mb-0.5">
                      Meilleure simulation
                    </p>
                    <p className="text-sm font-bold text-th-text-1 truncate">{best.name}</p>
                    <p className="text-xs text-th-text-2">{best.ville}</p>
                  </div>
                  <div className="hidden md:grid grid-cols-3 gap-8 shrink-0">
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest mb-1">Rendement brut</p>
                      <p className="text-sm font-black text-emerald-500 tabular-nums">{formatPct(best.rendementBrut)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest mb-1">Cashflow</p>
                      <p className={`text-sm font-black tabular-nums ${best.cashflowMensuel >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {best.cashflowMensuel >= 0 ? '+' : ''}{Math.round(best.cashflowMensuel)} €
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest mb-1">Score</p>
                      <p className="text-sm font-black text-th-text-1 tabular-nums">{best.score ?? '—'}/100</p>
                    </div>
                  </div>
                  <button
                    onClick={() => loadSimulation(best)}
                    className="shrink-0 text-[11px] font-semibold text-th-text-2 hover:text-th-text-1 border border-th-border hover:border-th-border-med px-3 py-1.5 rounded-lg transition-all"
                  >
                    Ouvrir
                  </button>
                </div>
              )}

              {/* ── Simulations ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-widest">
                    Simulations
                  </p>
                  <span className="text-[11px] text-th-text-3">
                    {simulations.length} enregistr{simulations.length !== 1 ? 'ées' : 'ée'}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Search + Filters */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher par nom ou ville…"
                        className="w-full bg-th-input-bg border border-th-input-border rounded-lg text-sm text-th-text-1 placeholder:text-th-text-3 pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-all"
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-th-text-3 hover:text-th-text-2">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-th-surface2 border border-th-border rounded-lg p-1">
                      {([
                        { id: 'tous',    label: 'Tous' },
                        { id: 'favoris', label: 'Favoris' },
                        { id: 'top',     label: 'Score ≥70' },
                        { id: 'positif', label: 'CF positif' },
                      ] as const).map(f => (
                        <button
                          key={f.id}
                          onClick={() => setFilterTab(f.id)}
                          className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                            filterTab === f.id
                              ? 'bg-th-surface shadow-card-th text-th-text-1'
                              : 'text-th-text-2 hover:text-th-text-1'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as typeof sortBy)}
                      className="bg-th-input-bg border border-th-input-border rounded-lg text-[11px] font-semibold text-th-text-2 px-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-all"
                    >
                      <option value="date">Tri : Date</option>
                      <option value="score">Tri : Score</option>
                      <option value="rendement">Tri : Rendement</option>
                      <option value="cashflow">Tri : Cashflow</option>
                    </select>
                  </div>

                  {filteredSims.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-dashed border-th-border">
                      <p className="text-sm text-th-text-2">Aucun résultat pour ce filtre</p>
                      <button
                        onClick={() => { setSearch(''); setFilterTab('tous') }}
                        className="text-xs text-emerald-500 hover:underline mt-2 block mx-auto"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block rounded-xl border border-th-border overflow-hidden shadow-card-th">
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_100px] gap-4 px-5 py-3 border-b border-th-border bg-th-surface2">
                          {['Simulation', 'Rendement', 'Cashflow', 'Prix achat', 'Score', ''].map((h) => (
                            <span key={h} className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest">{h}</span>
                          ))}
                        </div>
                        <div className="divide-y divide-th-border bg-th-surface">
                          {filteredSims.map((sim: SavedSimulation) => (
                            <div
                              key={sim.id}
                              className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_100px] gap-4 items-center px-5 py-4 hover:bg-th-surface2 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-sm font-semibold text-th-text-1 truncate">{sim.name}</p>
                                  {sim.is_favorite && (
                                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-[11px] text-th-text-3">{sim.ville} · {formatDate(sim.created_at)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-th-text-1 tabular-nums">{formatPct(sim.rendementBrut)}</p>
                                <p className="text-[11px] text-th-text-3">{formatPct(sim.rendementNet)} net</p>
                              </div>
                              <div>
                                <p className={`text-sm font-bold tabular-nums ${sim.cashflowMensuel >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {sim.cashflowMensuel >= 0 ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                                </p>
                                <p className="text-[11px] text-th-text-3">par mois</p>
                              </div>
                              <div>
                                <p className="text-sm text-th-text-1 tabular-nums">{formatCurrency(sim.prixAchat)}</p>
                              </div>
                              <div>
                                {sim.score !== null ? <ScoreBadge score={sim.score} /> : <span className="text-xs text-th-text-3">—</span>}
                              </div>
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => loadSimulation(sim)}
                                  className="w-7 h-7 rounded-lg hover:bg-th-surface3 flex items-center justify-center text-th-text-3 hover:text-emerald-500 transition-colors"
                                  title="Charger"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleToggleFavorite(sim.id, sim.is_favorite)}
                                  className="w-7 h-7 rounded-lg hover:bg-th-surface3 flex items-center justify-center text-th-text-3 hover:text-amber-400 transition-colors"
                                >
                                  <svg className={`w-3.5 h-3.5 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(sim.id)}
                                  className="w-7 h-7 rounded-lg hover:bg-th-surface3 flex items-center justify-center text-th-text-3 hover:text-red-400 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden space-y-3">
                        {filteredSims.map((sim: SavedSimulation) => (
                          <div key={sim.id} className="rounded-xl border border-th-border bg-th-surface p-4 shadow-card-th">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-th-text-1 truncate">{sim.name}</p>
                                  {sim.is_favorite && (
                                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  )}
                                </div>
                                <p className="text-[11px] text-th-text-2 mt-0.5">{sim.ville} · {formatDate(sim.created_at)}</p>
                              </div>
                              {sim.score !== null && <ScoreBadge score={sim.score} />}
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-th-surface2 rounded-lg p-2.5 text-center">
                                <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wide">Rendement</p>
                                <p className="text-sm font-bold text-th-text-1 tabular-nums">{formatPct(sim.rendementBrut)}</p>
                              </div>
                              <div className="bg-th-surface2 rounded-lg p-2.5 text-center">
                                <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wide">Cashflow</p>
                                <p className={`text-sm font-bold tabular-nums ${sim.cashflowMensuel >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                  {sim.cashflowMensuel >= 0 ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                                </p>
                              </div>
                              <div className="bg-th-surface2 rounded-lg p-2.5 text-center">
                                <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wide">Prix</p>
                                <p className="text-sm font-bold text-th-text-1 tabular-nums">{Math.round(sim.prixAchat / 1000)}k€</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => loadSimulation(sim)}
                                className="flex-1 text-xs font-semibold text-emerald-500 bg-emerald-500/[0.14] border border-emerald-500/20 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                              >
                                Ouvrir
                              </button>
                              <button
                                onClick={() => handleToggleFavorite(sim.id, sim.is_favorite)}
                                className="w-9 h-9 rounded-lg bg-th-surface2 flex items-center justify-center text-th-text-3 hover:text-amber-400 transition-colors"
                              >
                                <svg className={`w-4 h-4 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(sim.id)}
                                className="w-9 h-9 rounded-lg bg-th-surface2 flex items-center justify-center text-th-text-3 hover:text-red-400 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Charts ── */}
              {simulations.length >= 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-th-border bg-th-surface p-6 shadow-card-th">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-widest">
                        Rendement brut vs net
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: chartBarBrut }} />
                          <span className="text-[10px] text-th-text-3">Brut</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                          <span className="text-[10px] text-th-text-3">Net</span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={rendChart} barGap={4} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: chartAxis, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartAxis, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" width={32} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: chartCursor }} />
                        <Bar dataKey="Brut" fill={chartBarBrut} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Net" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-xl border border-th-border bg-th-surface p-6 shadow-card-th">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-widest">
                        Cashflow mensuel
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                          <span className="text-[10px] text-th-text-3">Positif</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                          <span className="text-[10px] text-th-text-3">Négatif</span>
                        </div>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={cfChart} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: chartAxis, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartAxis, fontSize: 10 }} axisLine={false} tickLine={false} unit="€" width={40} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: chartCursor }} />
                        <ReferenceLine y={0} stroke={chartRefLine} strokeWidth={1} />
                        <Bar dataKey="cashflow" radius={[3, 3, 0, 0]} name="Cashflow">
                          {cfChart.map((entry, i) => (
                            <Cell key={i} fill={entry.cashflow >= 0 ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── Actions rapides ── */}
              <div>
                <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-widest mb-4">
                  Actions rapides
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ),
                      title: 'Analyser un bien',
                      desc: 'Calculateur complet avec tous les paramètres, régimes fiscaux et projection',
                      cta: 'Lancer',
                      ctaClass: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
                      href: '/analyse',
                    },
                    {
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      ),
                      title: 'Comparer des biens',
                      desc: 'Mettez deux biens côte à côte pour décider sur des données objectives',
                      cta: 'Comparer',
                      ctaClass: 'bg-th-surface3 text-th-text-1 border border-th-border hover:bg-th-surface2',
                      href: '/comparer',
                    },
                    {
                      icon: (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      ),
                      title: 'Dossier bancaire',
                      desc: 'Export PDF professionnel pour votre dossier de financement',
                      cta: isPro ? 'Exporter' : 'Pro requis',
                      ctaClass: isPro
                        ? 'bg-th-surface3 text-th-text-1 border border-th-border hover:bg-th-surface2'
                        : 'bg-amber-500/[0.14] text-amber-500 border border-amber-500/20 hover:bg-amber-500/20',
                      href: '/rapport-bancaire',
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-th-border bg-th-surface p-5 flex flex-col gap-4 shadow-card-th"
                    >
                      <div className="w-8 h-8 rounded-lg bg-th-surface2 border border-th-border flex items-center justify-center text-th-text-2">
                        {item.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-th-text-1">{item.title}</p>
                        <p className="text-xs text-th-text-2 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                      <Link
                        href={item.href}
                        className={`self-start text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${item.ctaClass}`}
                      >
                        {item.cta}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Upsell discret ── */}
              {!isPro && simLimitDisplay && simulations.length >= Math.floor(simLimitDisplay * 0.6) && (
                <div className="rounded-xl border border-th-border bg-th-surface px-5 py-4 flex items-center gap-4 shadow-card-th">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-th-text-1">
                      {simulations.length >= simLimitDisplay
                        ? 'Limite du plan gratuit atteinte'
                        : `${simLimitDisplay - simulations.length} simulation${simLimitDisplay - simulations.length > 1 ? 's' : ''} restante${simLimitDisplay - simulations.length > 1 ? 's' : ''}`}
                    </p>
                    <p className="text-xs text-th-text-3 mt-0.5">
                      Plan Starter dès 9 €/mois — simulations illimitées, export PDF, dossier bancaire
                    </p>
                  </div>
                  <div className="shrink-0 w-28">
                    <div className="h-1 bg-th-surface3 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-1 bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (simulations.length / simLimitDisplay) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-th-text-3 text-right tabular-nums">
                      {simulations.length} / {simLimitDisplay}
                    </p>
                  </div>
                  <Link
                    href="/#pricing"
                    className="shrink-0 text-xs font-semibold text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 px-3.5 py-2 rounded-lg transition-all"
                  >
                    Passer au Pro
                  </Link>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
