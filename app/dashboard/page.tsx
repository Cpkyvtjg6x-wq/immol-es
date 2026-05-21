'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { OnboardingWizard } from '@/components/app/OnboardingWizard'
import { ProfileCompletion } from '@/components/app/ProfileCompletion'
import { PatrimoineCard } from '@/components/app/PatrimoineCard'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatPct, formatDate } from '@/lib/utils'

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

function KpiCard({
  label,
  value,
  sub,
  color = 'white',
  icon,
}: {
  label: string
  value: string
  sub: string
  color?: 'white' | 'emerald' | 'red' | 'amber'
  icon: React.ReactNode
}) {
  const colorClass =
    color === 'emerald'
      ? 'text-emerald-400'
      : color === 'red'
      ? 'text-red-400'
      : color === 'amber'
      ? 'text-amber-400'
      : 'text-white'

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500">
          {icon}
        </div>
      </div>
      <div>
        <p className={`text-2xl font-black tabular-nums ${colorClass}`} style={{ letterSpacing: '-0.03em' }}>
          {value}
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>
      </div>
    </div>
  )
}

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
    <div className="bg-[#18181b] border border-white/[0.08] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold text-zinc-400 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color ?? '#10b981' }} />
          <span className="text-zinc-400 text-xs">{p.name}</span>
          <span className="font-bold text-white ml-auto pl-4">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] flex items-center justify-center mb-6 text-3xl">
        🏘️
      </div>
      <p className="text-lg font-black text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
        Analysez votre premier bien
      </p>
      <p className="text-sm text-zinc-500 mb-8 max-w-sm leading-relaxed">
        Entrez les paramètres d&apos;un investissement et obtenez instantanément le rendement, le cashflow, la fiscalité et le dossier bancaire.
      </p>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8 text-xs text-zinc-600">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-black text-zinc-950">1</div>
          <span>Entrez le bien</span>
        </div>
        <div className="w-6 h-px bg-white/[0.1]" />
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-bold text-zinc-400">2</div>
          <span>Résultats instantanés</span>
        </div>
        <div className="w-6 h-px bg-white/[0.1]" />
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-bold text-zinc-400">3</div>
          <span>Sauvegarde auto</span>
        </div>
      </div>

      <Link
        href="/analyse"
        className="flex items-center gap-2 text-sm font-bold bg-emerald-500 text-zinc-950 px-6 py-3.5 rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Analyser mon premier bien
      </Link>
      <p className="text-xs text-zinc-700 mt-4">Gratuit · Résultats en 30 secondes</p>
    </div>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

export default function DashboardPage() {
  const router = useRouter()
  const toast = useToast()
  const { user, loading: authLoading, isPro } = useAuth()
  const { simulations, loading: simsLoading, deleteSimulation, toggleFavorite } = useSimulations(
    user?.id ?? null
  )
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checkoutBanner, setCheckoutBanner] = useState(false)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'tous' | 'favoris' | 'top' | 'positif'>('tous')
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'rendement' | 'cashflow'>('date')

  function loadSimulation(sim: ReturnType<typeof useSimulations>['simulations'][number]) {
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
    toast.success(isFav ? 'Retiré des favoris' : 'Ajouté aux favoris ⭐')
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  // Vérifier si l'utilisateur a complété l'onboarding
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
        // table absente ou colonne manquante — ne pas bloquer le dashboard
      }
    }
    checkOnboarding()
  }, [user])

  // Détecter retour de checkout Stripe
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('checkout') === 'success') {
        setCheckoutBanner(true)
        // Nettoyer l'URL
        window.history.replaceState({}, '', '/dashboard')
        setTimeout(() => setCheckoutBanner(false), 6000)
      }
    }
  }, [])

  // ⚠️ useMemo DOIT être avant tout return anticipé (règles des hooks React)
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
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border border-white/[0.08] rounded-full" />
          <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'vous'

  /* Portfolio metrics */
  const totalInvested = simulations.reduce((a, s) => a + s.prixAchat, 0)
  const totalCf = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
  const avgScore =
    simulations.length > 0
      ? Math.round(simulations.reduce((a, s) => a + (s.score ?? 0), 0) / simulations.length)
      : 0
  const avgRendBrut =
    simulations.length > 0
      ? simulations.reduce((a, s) => a + s.rendementBrut, 0) / simulations.length
      : 0

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

  /* Best simulation */
  const best = simulations.length > 0
    ? [...simulations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
    : null

  /* filteredSims est défini plus haut, avant le return anticipé */

  return (
    <AppShell>
      {/* ── Onboarding ── */}
      {showOnboarding && user && (
        <OnboardingWizard
          userId={user.id}
          onComplete={() => setShowOnboarding(false)}
        />
      )}

      <div className="min-h-screen bg-[#09090b]">

        {/* ── Banner checkout success ── */}
        {checkoutBanner && (
          <div className="mx-8 mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">✓</div>
            <div>
              <p className="text-sm font-bold text-white">Abonnement activé ! 🎉</p>
              <p className="text-xs text-zinc-400">Bienvenue dans IMMORA Pro. Toutes les fonctionnalités sont maintenant débloquées.</p>
            </div>
            <button onClick={() => setCheckoutBanner(false)} className="ml-auto text-zinc-600 hover:text-zinc-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="border-b border-white/[0.05] px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-0.5">
              Tableau de bord
            </p>
            <h1 className="text-xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
              Bonjour, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
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

        <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">

          {/* ── Patrimoine & Santé ── */}
          <PatrimoineCard simulations={simulations} isPro={!!isPro} />

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Simulations"
              value={simulations.length.toString()}
              sub={`${simulations.length}/3 plan gratuit`}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            />
            <KpiCard
              label="Patrimoine simulé"
              value={totalInvested > 0 ? formatCurrency(totalInvested) : '—'}
              sub="prix total acquisitions"
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
            />
            <KpiCard
              label="Cashflow total"
              value={simulations.length > 0 ? `${totalCf >= 0 ? '+' : ''}${Math.round(totalCf)} €/mois` : '—'}
              sub="cumul mensuel"
              color={simulations.length === 0 ? 'white' : totalCf >= 0 ? 'emerald' : 'red'}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
            <KpiCard
              label="Score moyen"
              value={simulations.length > 0 ? avgScore.toString() + '/100' : '—'}
              sub={avgScore >= 70 ? 'Excellent portefeuille' : avgScore >= 50 ? 'Portefeuille correct' : simulations.length > 0 ? 'À optimiser' : 'Aucune simulation'}
              color={simulations.length === 0 ? 'white' : avgScore >= 70 ? 'emerald' : avgScore >= 50 ? 'amber' : 'red'}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
          </div>

          {/* ── Profile completion ── */}
          <ProfileCompletion
            hasEmail={!!user?.email}
            hasName={!!(user?.user_metadata?.full_name || user?.user_metadata?.name)}
            simulationCount={simulations.length}
            isPro={!!isPro}
          />

          {/* ── Best simulation highlight ── */}
          {best && (
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-5 flex items-center gap-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider mb-0.5">Meilleure simulation</p>
                <p className="text-sm font-bold text-white truncate">{best.name}</p>
                <p className="text-xs text-zinc-500">{best.ville}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Rendement brut</p>
                  <p className="text-base font-black text-emerald-400 tabular-nums">{formatPct(best.rendementBrut)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Cashflow</p>
                  <p className={`text-base font-black tabular-nums ${best.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {best.cashflowMensuel >= 0 ? '+' : ''}{Math.round(best.cashflowMensuel)} €
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Score</p>
                  <p className="text-base font-black text-white tabular-nums">{best.score ?? '—'}/100</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Charts ── */}
          {simulations.length >= 2 && (
            <div className="grid grid-cols-2 gap-4">
              {/* Rendement chart */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Rendement brut vs net
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-white/[0.12]" />
                      <span className="text-[10px] text-zinc-600">Brut</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      <span className="text-[10px] text-zinc-600">Net</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={rendChart} barGap={4} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                      width={35}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Brut" fill="rgba(255,255,255,0.10)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Net" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Cashflow chart */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Cashflow mensuel
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                      <span className="text-[10px] text-zinc-600">Positif</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                      <span className="text-[10px] text-zinc-600">Négatif</span>
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cfChart} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      unit="€"
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
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

          {/* ── Bibliothèque de simulations ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                Bibliothèque
              </p>
              <span className="text-[11px] text-zinc-600">
                {simulations.length} simulation{simulations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {simsLoading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="relative w-6 h-6">
                  <div className="w-6 h-6 border border-white/[0.08] rounded-full" />
                  <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
                </div>
                <span className="text-sm text-zinc-500">Chargement…</span>
              </div>
            ) : simulations.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">

                {/* ── Search + Filters ── */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher par nom ou ville…"
                      className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg text-sm text-white placeholder:text-zinc-600 pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-all"
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-lg p-1">
                    {([
                      { id: 'tous', label: 'Tous' },
                      { id: 'favoris', label: '⭐ Favoris' },
                      { id: 'top', label: '🏆 Score ≥ 70' },
                      { id: 'positif', label: '✅ CF positif' },
                    ] as const).map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilterTab(f.id)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                          filterTab === f.id
                            ? 'bg-white/[0.1] text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-white/[0.04] border border-white/[0.07] rounded-lg text-[11px] font-semibold text-zinc-400 px-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-all"
                  >
                    <option value="date" className="bg-zinc-900">↓ Date</option>
                    <option value="score" className="bg-zinc-900">↓ Score</option>
                    <option value="rendement" className="bg-zinc-900">↓ Rendement</option>
                    <option value="cashflow" className="bg-zinc-900">↓ Cashflow</option>
                  </select>
                </div>

                {/* Table */}
                {filteredSims.length === 0 ? (
                  <div className="text-center py-12 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01]">
                    <p className="text-sm text-zinc-500">Aucune simulation ne correspond à ce filtre</p>
                    <button onClick={() => { setSearch(''); setFilterTab('tous') }} className="text-xs text-emerald-400 hover:underline mt-2 block mx-auto">
                      Réinitialiser les filtres
                    </button>
                  </div>
                ) : (
                  <>
                  {/* Table desktop */}
                  <div className="hidden md:block rounded-xl border border-white/[0.07] overflow-hidden">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_100px] gap-4 px-5 py-3 border-b border-white/[0.05] bg-white/[0.02]">
                      {['Simulation', 'Rendement', 'Cashflow', 'Prix achat', 'Score', ''].map((h) => (
                        <span key={h} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</span>
                      ))}
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {filteredSims.map((sim: SavedSimulation) => (
                        <div key={sim.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_80px_100px] gap-4 items-center px-5 py-4 hover:bg-white/[0.02] transition-colors">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-white truncate">{sim.name}</p>
                              {sim.is_favorite && <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
                            </div>
                            <p className="text-[11px] text-zinc-600">{sim.ville} · {formatDate(sim.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white tabular-nums">{formatPct(sim.rendementBrut)}</p>
                            <p className="text-[11px] text-zinc-600">{formatPct(sim.rendementNet)} net</p>
                          </div>
                          <div>
                            <p className={`text-sm font-bold tabular-nums ${sim.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {sim.cashflowMensuel >= 0 ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                            </p>
                            <p className="text-[11px] text-zinc-600">par mois</p>
                          </div>
                          <div><p className="text-sm text-white tabular-nums">{formatCurrency(sim.prixAchat)}</p></div>
                          <div>{sim.score !== null ? <ScoreBadge score={sim.score} /> : <span className="text-xs text-zinc-600">—</span>}</div>
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => loadSimulation(sim)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-emerald-400 transition-colors" title="Charger">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </button>
                            <button onClick={() => handleToggleFavorite(sim.id, sim.is_favorite)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-amber-400 transition-colors">
                              <svg className={`w-3.5 h-3.5 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(sim.id)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cards mobile */}
                  <div className="md:hidden space-y-3">
                    {filteredSims.map((sim: SavedSimulation) => (
                      <div key={sim.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-white truncate">{sim.name}</p>
                              {sim.is_favorite && <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{sim.ville} · {formatDate(sim.created_at)}</p>
                          </div>
                          {sim.score !== null && <ScoreBadge score={sim.score} />}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                            <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">Rendement</p>
                            <p className="text-sm font-bold text-white tabular-nums">{formatPct(sim.rendementBrut)}</p>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                            <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">Cashflow</p>
                            <p className={`text-sm font-bold tabular-nums ${sim.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {sim.cashflowMensuel >= 0 ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                            </p>
                          </div>
                          <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                            <p className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide">Prix</p>
                            <p className="text-sm font-bold text-white tabular-nums">{Math.round(sim.prixAchat / 1000)}k€</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => loadSimulation(sim)} className="flex-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors">
                            Ouvrir →
                          </button>
                          <button onClick={() => handleToggleFavorite(sim.id, sim.is_favorite)} className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-zinc-500 hover:text-amber-400 transition-colors">
                            <svg className={`w-4 h-4 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(sim.id)} className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Actions rapides
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: 'Analyser un bien',
                  desc: 'Calculateur Express ou Avancé avec tous les paramètres',
                  cta: 'Lancer',
                  ctaStyle: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
                  href: '/analyse',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                  ),
                  title: 'Comparer des biens',
                  desc: 'Mettez 2 à 3 biens côte à côte pour décider',
                  cta: 'Comparer',
                  ctaStyle: 'bg-white/[0.05] text-zinc-300 border border-white/[0.1] hover:bg-white/[0.1]',
                  href: '/comparer',
                },
                {
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ),
                  title: 'Rapport banquier',
                  desc: 'Export PDF professionnel pour votre dossier de financement',
                  cta: 'Pro requis',
                  ctaStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20',
                  href: '#',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 flex flex-col gap-4"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-zinc-400">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  <Link
                    href={item.href}
                    className={`self-start text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${item.ctaStyle}`}
                  >
                    {item.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* ── Portfolio summary ── */}
          {simulations.length > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-5">
                Résumé du portefeuille
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Rendement moyen</p>
                  <p className="text-xl font-black text-emerald-400 tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                    {formatPct(avgRendBrut)}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">brut moyen</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Investissement total</p>
                  <p className="text-xl font-black text-white tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                    {formatCurrency(totalInvested)}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">prix acquisitions</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Cashflow net</p>
                  <p className={`text-xl font-black tabular-nums ${totalCf >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={{ letterSpacing: '-0.03em' }}>
                    {totalCf >= 0 ? '+' : ''}{Math.round(totalCf)} €
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">par mois</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Biens analysés</p>
                  <p className="text-xl font-black text-white tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                    {simulations.length}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">simulations sauvegardées</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  )
}
