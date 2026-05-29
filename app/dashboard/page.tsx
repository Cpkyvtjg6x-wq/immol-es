'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  motion,
  useMotionValue,
  animate,
  type Variants,
} from 'framer-motion'
import { useTheme } from '@/components/app/ThemeProvider'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
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

/* ─────────────────────────── icônes (SVG inline) ─────────────────────────── */

type IconCmp = ({ className }: { className?: string }) => JSX.Element
const svg = (path: React.ReactNode): IconCmp =>
  function Icon({ className = 'w-4 h-4' }: { className?: string }) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {path}
      </svg>
    )
  }

const AlertTriangle = svg(<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />)
const GitCompare = svg(<><circle cx="6" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M11 6H8a2 2 0 0 0-2 2v7m12-6v7a2 2 0 0 1-2 2h-3" /></>)
const FileText = svg(<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 9h1m-1 4h6m-6 4h6" /></>)
const Sparkles = svg(<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />)
const ClipboardList = svg(<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" /><path d="M9 12h.01M13 12h3M9 16h.01M13 16h3" /></>)
const ChevronRight = svg(<path d="M9 6l6 6-6 6" />)
const ArrowRight = svg(<path d="M5 12h14m-6-6 6 6-6 6" />)
const ArrowDownRight = svg(<path d="M7 7l10 10m0 0V9m0 8H9" />)
const Building2 = svg(<><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M3 22h18M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" /></>)
const ArrowLeftRight = svg(<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />)
const ScatterIcon = svg(<><path d="M3 3v18h18" /><circle cx="8" cy="15" r="1.4" /><circle cx="12" cy="9" r="1.4" /><circle cx="17" cy="12" r="1.4" /><circle cx="18" cy="6" r="1.4" /></>)

/* ─────────────────────────── motion ─────────────────────────── */

const EASE_OUT = [0.16, 1, 0.3, 1] as const

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 26 } },
}

/* Nombre qui s'anime de 0 → value */
function CountUp({
  value,
  format,
  className,
  style,
}: {
  value: number
  format: (v: number) => string
  className?: string
  style?: React.CSSProperties
}) {
  const mv = useMotionValue(0)
  const [text, setText] = useState(() => format(0))
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.2, ease: EASE_OUT })
    const unsub = mv.on('change', (v) => setText(format(v)))
    return () => {
      controls.stop()
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <span className={className} style={style}>
      {text}
    </span>
  )
}

/* Sparkline au tracé animé */
function Sparkline({
  points,
  color = '#10b981',
  width = 72,
  height = 24,
  delay = 0.25,
}: {
  points: number[]
  color?: string
  width?: number
  height?: number
  delay?: number
}) {
  const pts = points.length >= 2 ? points : [points[0] ?? 0, points[0] ?? 0]
  const min = Math.min(...pts)
  const max = Math.max(...pts)
  const range = max - min || 1
  const step = width / (pts.length - 1)
  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(height - ((p - min) / range) * (height - 5) - 2.5).toFixed(1)}`)
    .join(' ')
  const last = pts[pts.length - 1]
  const lastX = width
  const lastY = height - ((last - min) / range) * (height - 5) - 2.5
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }} aria-hidden>
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut', delay }}
      />
      <motion.circle
        cx={lastX}
        cy={lastY}
        r={2.4}
        fill={color}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: delay + 1 }}
      />
    </svg>
  )
}

/* ─────────────────────────── helpers ─────────────────────────── */

function scoreColors(score: number) {
  return score >= 70
    ? { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.22)' }
    : score >= 50
    ? { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.22)' }
    : { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.22)' }
}

function ScoreBadge({ score }: { score: number }) {
  const c = scoreColors(score)
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border tabular-nums"
      style={{ color: c.color, background: c.bg, borderColor: c.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {score}
    </span>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
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
      <div className="flex items-center gap-0 mb-10">
        {[
          { n: '1', label: 'Renseignez le bien et le financement' },
          { n: '2', label: 'Obtenez le score et les métriques clés' },
          { n: '3', label: 'Sauvegardez et comparez' },
        ].map((step, i) => (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center gap-2 w-32">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border ${
                i === 0 ? 'bg-emerald-500/[0.14] border-emerald-500/30 text-emerald-500' : 'bg-th-surface2 border-th-border text-th-text-3'
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
    </motion.div>
  )
}

/* ─────────────────────────── page ─────────────────────────── */

type SortKey = 'date' | 'score' | 'rendement' | 'cashflow' | 'prix'

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
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const tableRef = useRef<HTMLDivElement>(null)

  /* Glass tokens (transparence theme-aware) */
  const glassBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.66)'
  const glassBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  /* Chart colors adapt to theme */
  const chartGrid = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const chartAxis = isDark ? '#71717a' : '#a1a1aa'
  const chartRefLine = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'

  function loadSimulation(sim: SavedSimulation) {
    if (sim.params && Object.keys(sim.params).length > 0) {
      sessionStorage.setItem('immolyse_load_params', JSON.stringify(sim.params))
    }
    toast.info('Simulation chargée — paramètres restaurés')
    router.push('/analyse')
  }

  function openBankReport(sim: SavedSimulation) {
    if (sim.params && Object.keys(sim.params).length > 0) {
      sessionStorage.setItem('immolyse_last_params', JSON.stringify(sim.params))
    }
    router.push('/rapport-bancaire')
  }

  async function handleDelete(id: string) {
    await deleteSimulation(id)
    toast.success('Simulation supprimée')
  }

  async function handleToggleFavorite(id: string, isFav: boolean) {
    await toggleFavorite(id, isFav)
    toast.success(isFav ? 'Retiré des favoris' : 'Ajouté aux favoris')
  }

  function focusTable(sort: SortKey) {
    setSortBy(sort)
    setFilterTab('tous')
    setSearch('')
    requestAnimationFrame(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
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
        if (data && data.onboarding_completed === false) setShowOnboarding(true)
      } catch {
        /* table absente — ne pas bloquer */
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
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.ville.toLowerCase().includes(q))
    }
    if (filterTab === 'favoris') list = list.filter((s) => s.is_favorite)
    if (filterTab === 'top') list = list.filter((s) => (s.score ?? 0) >= 70)
    if (filterTab === 'positif') list = list.filter((s) => s.cashflowMensuel >= 0)
    if (sortBy === 'score') list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    else if (sortBy === 'rendement') list.sort((a, b) => b.rendementBrut - a.rendementBrut)
    else if (sortBy === 'cashflow') list.sort((a, b) => b.cashflowMensuel - a.cashflowMensuel)
    else if (sortBy === 'prix') list.sort((a, b) => b.prixAchat - a.prixAchat)
    return list
  }, [simulations, search, filterTab, sortBy])

  /* ── Portfolio metrics ── */
  const totalCf = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
  const totalInvested = simulations.reduce((a, s) => a + s.prixAchat, 0)
  const avgScore =
    simulations.length > 0 ? Math.round(simulations.reduce((a, s) => a + (s.score ?? 0), 0) / simulations.length) : 0
  const avgRendNet =
    simulations.length > 0 ? simulations.reduce((a, s) => a + s.rendementNet, 0) / simulations.length : 0

  const best = simulations.length > 0 ? [...simulations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] : null
  const bestByNet = simulations.length > 0 ? [...simulations].sort((a, b) => b.rendementNet - a.rendementNet)[0] : null
  const negatives = simulations.filter((s) => s.cashflowMensuel < 0)
  const worstNeg = negatives.length > 0 ? [...negatives].sort((a, b) => a.cashflowMensuel - b.cashflowMensuel)[0] : null

  const simLimit = isPro ? SUBSCRIPTION_LIMITS[tier ?? 'pro'].simulations : SUBSCRIPTION_LIMITS.free.simulations
  const simLimitDisplay = simLimit === Infinity ? null : simLimit

  /* Séries temporelles (cumulées / glissantes) pour les sparklines */
  const series = useMemo(() => {
    const byDate = [...simulations].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const cumPrix: number[] = []
    const cumCf: number[] = []
    const runRend: number[] = []
    const runScore: number[] = []
    let accP = 0
    let accC = 0
    let sumR = 0
    let sumS = 0
    byDate.forEach((s, i) => {
      accP += s.prixAchat
      accC += s.cashflowMensuel
      sumR += s.rendementNet
      sumS += s.score ?? 0
      cumPrix.push(accP)
      cumCf.push(accC)
      runRend.push(sumR / (i + 1))
      runScore.push(sumS / (i + 1))
    })
    return { cumPrix, cumCf, runRend, runScore }
  }, [simulations])

  const newThisMonth = useMemo(() => {
    const monthAgo = Date.now() - 30 * 864e5
    return simulations.filter((s) => new Date(s.created_at).getTime() >= monthAgo).length
  }, [simulations])

  /* Données scatter risque-rendement */
  const scatterData = useMemo(
    () =>
      simulations.map((s) => ({
        x: Math.round(s.rendementNet * 100) / 100,
        y: Math.round(s.cashflowMensuel),
        z: s.prixAchat,
        score: s.score ?? 0,
        name: s.name,
        ville: s.ville,
        id: s.id,
      })),
    [simulations]
  )

  /* Nudges « À faire ensuite » */
  type Nudge = { title: string; desc: string; tone: 'warn' | 'info' | 'neutral' | 'accent'; onClick: () => void }
  const nudges = useMemo<Nudge[]>(() => {
    const list: Nudge[] = []
    if (worstNeg) {
      list.push({
        tone: 'warn',
        title: `${negatives.length} bien${negatives.length > 1 ? 's' : ''} à cashflow négatif`,
        desc: `Optimisez « ${worstNeg.name} » — ${Math.round(worstNeg.cashflowMensuel)} €/mois`,
        onClick: () => loadSimulation(worstNeg),
      })
    }
    if (simulations.length >= 2) {
      list.push({
        tone: 'info',
        title: 'Comparez vos meilleurs biens',
        desc: bestByNet ? `${bestByNet.name} mène à ${formatPct(bestByNet.rendementNet)} net` : 'Décidez sur des données objectives',
        onClick: () => router.push('/comparer'),
      })
    }
    if (best) {
      list.push({
        tone: 'neutral',
        title: 'Préparez le dossier bancaire',
        desc: `${best.name} — prêt à exporter en PDF`,
        onClick: () => openBankReport(best),
      })
    }
    if (!isPro && simLimitDisplay && simulations.length >= Math.floor(simLimitDisplay * 0.6)) {
      list.push({
        tone: 'accent',
        title: simulations.length >= simLimitDisplay ? 'Limite du plan gratuit atteinte' : 'Bientôt à la limite du plan gratuit',
        desc: 'Passez au Pro — simulations illimitées, PDF, dossier bancaire',
        onClick: () => router.push('/#pricing'),
      })
    }
    if (list.length === 0) {
      list.push({
        tone: 'accent',
        title: 'Analysez un nouveau bien',
        desc: 'Lancez une simulation complète en 2 minutes',
        onClick: () => router.push('/analyse'),
      })
    }
    return list.slice(0, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulations, worstNeg, best, bestByNet, isPro, simLimitDisplay, negatives.length])

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
    user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'vous'

  const toneStyles: Record<Nudge['tone'], { Icon: IconCmp; color: string; bg: string }> = {
    warn: { Icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    info: { Icon: GitCompare, color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    neutral: { Icon: FileText, color: '#a1a1aa', bg: 'rgba(161,161,170,0.12)' },
    accent: { Icon: Sparkles, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  }

  return (
    <AppShell>
      {showOnboarding && user && (
        <OnboardingWizard userId={user.id} onComplete={() => setShowOnboarding(false)} />
      )}

      <div className="min-h-screen bg-th-bg relative overflow-hidden">

        {/* Aurora vivante en fond */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/3 rounded-full"
          style={{
            width: 520,
            height: 520,
            background: 'radial-gradient(circle, rgba(16,185,129,0.13), transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{ x: [0, 50, -20, 0], y: [0, 30, 10, 0], opacity: [0.55, 0.9, 0.6, 0.55] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-40 right-0 rounded-full"
          style={{
            width: 420,
            height: 420,
            background: 'radial-gradient(circle, rgba(96,165,250,0.10), transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{ x: [0, -40, 0], y: [0, 40, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Banner checkout */}
        {checkoutBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mx-6 md:mx-8 mt-4 rounded-xl bg-emerald-500/[0.14] border border-emerald-500/20 px-5 py-4 flex items-center gap-4"
          >
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
          </motion.div>
        )}

        {/* Top bar */}
        <div className="relative border-b border-th-border px-6 md:px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-widest mb-1">Tableau de bord</p>
            <h1 className="text-xl font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
              {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
            </h1>
          </div>
          <Link
            href="/analyse"
            className="flex items-center gap-2 text-sm font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-4 py-2.5 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle analyse
          </Link>
        </div>

        {/* Content */}
        <div className="relative px-6 md:px-8 py-7">
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
            <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">

              {/* ── Ligne de statut ── */}
              <motion.div
                variants={item}
                className="relative flex items-center gap-3 rounded-2xl px-5 py-4 overflow-hidden"
                style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(14px)' }}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${totalCf >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${totalCf >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </span>
                <p className="text-sm text-th-text-1">
                  {totalCf >= 0 ? (
                    <>Votre portefeuille <span className="font-bold text-emerald-500">s&apos;autofinance</span> — <span className="font-bold">+{Math.round(totalCf)} €/mois</span>, score moyen {avgScore}/100 sur {simulations.length} bien{simulations.length > 1 ? 's' : ''}.</>
                  ) : (
                    <>Effort d&apos;épargne de <span className="font-bold text-amber-500">{Math.round(totalCf)} €/mois</span> — score moyen {avgScore}/100{negatives.length > 0 ? `, ${negatives.length} bien${negatives.length > 1 ? 's' : ''} à optimiser` : ''}.</>
                  )}
                </p>
              </motion.div>

              {/* ── KPIs cliquables ── */}
              <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Patrimoine simulé',
                    value: totalInvested,
                    format: (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)} M€` : formatCurrency(v)),
                    spark: series.cumPrix,
                    chip: newThisMonth > 0 ? `+${newThisMonth} ce mois` : `${simulations.length} biens`,
                    chipColor: '#10b981',
                    sort: 'prix' as SortKey,
                    accent: true,
                  },
                  {
                    label: 'Cashflow mensuel',
                    value: totalCf,
                    format: (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)} €`,
                    spark: series.cumCf,
                    chip: totalCf >= 0 ? 'Autofinancé' : 'Effort mensuel',
                    chipColor: totalCf >= 0 ? '#10b981' : '#f59e0b',
                    sort: 'cashflow' as SortKey,
                    accent: false,
                  },
                  {
                    label: 'Rendement net moyen',
                    value: avgRendNet,
                    format: (v: number) => `${v.toFixed(1)} %`,
                    spark: series.runRend,
                    chip: bestByNet ? `top ${formatPct(bestByNet.rendementNet)}` : '',
                    chipColor: '#10b981',
                    sort: 'rendement' as SortKey,
                    accent: false,
                  },
                  {
                    label: 'Score moyen',
                    value: avgScore,
                    format: (v: number) => `${Math.round(v)}`,
                    suffix: ' /100',
                    spark: series.runScore,
                    chip: avgScore >= 70 ? 'Excellent' : avgScore >= 50 ? 'Solide' : 'À optimiser',
                    chipColor: scoreColors(avgScore).color,
                    sort: 'score' as SortKey,
                    accent: false,
                  },
                ].map((k) => (
                  <motion.button
                    key={k.label}
                    onClick={() => focusTable(k.sort)}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="group relative text-left rounded-2xl px-5 py-4 overflow-hidden"
                    style={{
                      background: k.accent ? 'rgba(16,185,129,0.10)' : glassBg,
                      border: `1px solid ${k.accent ? 'rgba(16,185,129,0.28)' : glassBorder}`,
                      backdropFilter: 'blur(14px)',
                    }}
                  >
                    <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-widest mb-2">{k.label}</p>
                    <div className="flex items-baseline gap-0.5">
                      <CountUp
                        value={k.value}
                        format={k.format}
                        className={`font-black tabular-nums leading-none ${k.accent ? 'text-emerald-500' : 'text-th-text-1'}`}
                        style={{ fontSize: '26px', letterSpacing: '-0.04em' }}
                      />
                      {k.suffix && <span className="text-xs font-semibold text-th-text-3">{k.suffix}</span>}
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      {k.chip ? (
                        <span className="text-[11px] font-semibold" style={{ color: k.chipColor }}>{k.chip}</span>
                      ) : <span />}
                      <Sparkline points={k.spark} color={k.chipColor} />
                    </div>
                    <span className="absolute right-3 top-3 text-th-text-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </span>
                  </motion.button>
                ))}
              </motion.div>

              {/* ── À faire ensuite + Carte risque·rendement ── */}
              <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* À faire ensuite */}
                <div
                  className="rounded-2xl px-5 py-4"
                  style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(14px)' }}
                >
                  <p className="text-sm font-bold text-th-text-1 mb-3 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-emerald-500" /> À faire ensuite
                  </p>
                  <div className="space-y-1">
                    {nudges.map((n, idx) => {
                      const t = toneStyles[n.tone]
                      const Icon = t.Icon
                      return (
                        <motion.button
                          key={idx}
                          onClick={n.onClick}
                          whileHover={{ x: 4 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="group w-full flex items-center gap-3 py-2.5 border-t border-th-border first:border-t-0 text-left"
                        >
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.bg, color: t.color }}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-th-text-1 truncate">{n.title}</p>
                            <p className="text-[11px] text-th-text-2 truncate">{n.desc}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-th-text-3 group-hover:text-th-text-1 group-hover:translate-x-1 transition-all shrink-0" />
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Carte risque · rendement */}
                <div
                  className="rounded-2xl px-5 py-4"
                  style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(14px)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-th-text-1 flex items-center gap-2">
                      <ScatterIcon className="w-4 h-4 text-emerald-500" /> Carte risque · rendement
                    </p>
                    <span className="text-[10px] text-th-text-3">taille = prix · couleur = score</span>
                  </div>
                  {scatterData.length >= 2 ? (
                    <ResponsiveContainer width="100%" height={190}>
                      <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
                        <CartesianGrid stroke={chartGrid} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Rdt net"
                          unit="%"
                          tick={{ fill: chartAxis, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Cashflow"
                          unit="€"
                          width={44}
                          tick={{ fill: chartAxis, fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <ZAxis type="number" dataKey="z" range={[60, 360]} />
                        <ReferenceLine y={0} stroke={chartRefLine} strokeWidth={1} />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3', stroke: chartAxis }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload as (typeof scatterData)[number]
                            return (
                              <div className="bg-th-surface2 border border-th-border rounded-xl px-3.5 py-2.5 shadow-card-th">
                                <p className="text-xs font-bold text-th-text-1 mb-1">{d.name}</p>
                                <p className="text-[11px] text-th-text-2">{d.ville}</p>
                                <div className="mt-1.5 space-y-0.5 text-[11px]">
                                  <p className="text-th-text-2">Rdt net : <span className="font-semibold text-th-text-1">{d.x} %</span></p>
                                  <p className="text-th-text-2">Cashflow : <span className={`font-semibold ${d.y >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>{d.y >= 0 ? '+' : ''}{d.y} €</span></p>
                                  <p className="text-th-text-2">Score : <span className="font-semibold" style={{ color: scoreColors(d.score).color }}>{d.score}</span></p>
                                </div>
                                <p className="text-[10px] text-th-text-3 mt-1.5">Cliquez pour ouvrir →</p>
                              </div>
                            )
                          }}
                        />
                        <Scatter
                          data={scatterData}
                          onClick={(p: { id?: string }) => {
                            const sim = simulations.find((s) => s.id === p.id)
                            if (sim) loadSimulation(sim)
                          }}
                          cursor="pointer"
                        >
                          {scatterData.map((d) => (
                            <Cell key={d.id} fill={scoreColors(d.score).color} fillOpacity={0.82} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[190px] flex flex-col items-center justify-center text-center gap-2">
                      <p className="text-xs text-th-text-2">Analysez au moins 2 biens pour voir la carte</p>
                      <Link href="/analyse" className="text-xs font-semibold text-emerald-500 hover:underline">Lancer une analyse →</Link>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* ── Simulations ── */}
              <motion.div variants={item} ref={tableRef} style={{ scrollMarginTop: '20px' }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-widest">Simulations</p>
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
                        onChange={(e) => setSearch(e.target.value)}
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
                        { id: 'tous', label: 'Tous' },
                        { id: 'favoris', label: 'Favoris' },
                        { id: 'top', label: 'Score ≥70' },
                        { id: 'positif', label: 'CF positif' },
                      ] as const).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilterTab(f.id)}
                          className={`relative px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                            filterTab === f.id ? 'text-th-text-1' : 'text-th-text-2 hover:text-th-text-1'
                          }`}
                        >
                          {filterTab === f.id && (
                            <motion.span
                              layoutId="filter-pill"
                              className="absolute inset-0 bg-th-surface rounded-md shadow-card-th"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="relative">{f.label}</span>
                        </button>
                      ))}
                    </div>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="bg-th-input-bg border border-th-input-border rounded-lg text-[11px] font-semibold text-th-text-2 px-3 py-2 focus:outline-none focus:border-emerald-500/40 transition-all"
                    >
                      <option value="date">Tri : Date</option>
                      <option value="score">Tri : Score</option>
                      <option value="rendement">Tri : Rendement</option>
                      <option value="cashflow">Tri : Cashflow</option>
                      <option value="prix">Tri : Prix</option>
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
                      <div
                        className="hidden md:block rounded-xl overflow-hidden"
                        style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(14px)' }}
                      >
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_90px_100px] gap-4 px-5 py-3 border-b border-th-border">
                          {['Simulation', 'Rendement', 'Cashflow', 'Prix achat', 'Score', ''].map((h) => (
                            <span key={h} className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest">{h}</span>
                          ))}
                        </div>
                        <div>
                          {filteredSims.map((sim: SavedSimulation, i) => {
                            const sc = sim.score ?? 0
                            return (
                              <motion.div
                                key={sim.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: Math.min(i * 0.03, 0.3), ease: EASE_OUT }}
                                onClick={() => loadSimulation(sim)}
                                className="group grid grid-cols-[2fr_1fr_1fr_1fr_90px_100px] gap-4 items-center px-5 py-4 border-t border-th-border hover:bg-th-surface2 transition-colors cursor-pointer"
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
                                  {sim.score !== null ? (
                                    <div className="flex flex-col gap-1.5">
                                      <ScoreBadge score={sc} />
                                      <div className="h-1 rounded-full bg-th-surface3 overflow-hidden">
                                        <motion.div
                                          className="h-1 rounded-full"
                                          style={{ background: scoreColors(sc).color }}
                                          initial={{ width: 0 }}
                                          animate={{ width: `${sc}%` }}
                                          transition={{ duration: 0.9, ease: EASE_OUT, delay: Math.min(i * 0.03, 0.3) + 0.1 }}
                                        />
                                      </div>
                                    </div>
                                  ) : <span className="text-xs text-th-text-3">—</span>}
                                </div>
                                <div className="flex items-center gap-1 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); loadSimulation(sim) }}
                                    className="w-7 h-7 rounded-lg hover:bg-th-surface3 flex items-center justify-center text-th-text-3 hover:text-emerald-500 transition-colors"
                                    title="Ouvrir"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(sim.id, sim.is_favorite) }}
                                    className="w-7 h-7 rounded-lg hover:bg-th-surface3 flex items-center justify-center text-th-text-3 hover:text-amber-400 transition-colors"
                                    title="Favori"
                                  >
                                    <svg className={`w-3.5 h-3.5 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(sim.id) }}
                                    className="w-7 h-7 rounded-lg hover:bg-th-surface3 flex items-center justify-center text-th-text-3 hover:text-red-400 transition-colors"
                                    title="Supprimer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden space-y-3">
                        {filteredSims.map((sim: SavedSimulation) => (
                          <div key={sim.id} onClick={() => loadSimulation(sim)} className="rounded-xl border border-th-border bg-th-surface p-4 shadow-card-th active:scale-[0.99] transition-transform">
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
                                onClick={(e) => { e.stopPropagation(); loadSimulation(sim) }}
                                className="flex-1 text-xs font-semibold text-emerald-500 bg-emerald-500/[0.14] border border-emerald-500/20 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                              >
                                Ouvrir
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(sim.id, sim.is_favorite) }}
                                className="w-9 h-9 rounded-lg bg-th-surface2 flex items-center justify-center text-th-text-3 hover:text-amber-400 transition-colors"
                              >
                                <svg className={`w-4 h-4 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(sim.id) }}
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
              </motion.div>

              {/* ── Actions rapides ── */}
              <motion.div variants={item}>
                <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-widest mb-4">Actions rapides</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { Icon: Building2, title: 'Analyser un bien', desc: 'Calculateur complet : paramètres, régimes fiscaux et projection', cta: 'Lancer', href: '/analyse', accent: true },
                    { Icon: ArrowLeftRight, title: 'Comparer des biens', desc: 'Mettez plusieurs biens côte à côte pour décider objectivement', cta: 'Comparer', href: '/comparer', accent: false },
                    { Icon: FileText, title: 'Dossier bancaire', desc: 'Export PDF professionnel pour votre dossier de financement', cta: isPro ? 'Exporter' : 'Pro requis', href: '/rapport-bancaire', accent: false },
                  ].map((it) => {
                    const Icon = it.Icon
                    return (
                      <motion.div key={it.title} whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
                        <Link
                          href={it.href}
                          className="block rounded-2xl p-5 h-full"
                          style={{ background: glassBg, border: `1px solid ${it.accent ? 'rgba(16,185,129,0.28)' : glassBorder}`, backdropFilter: 'blur(14px)' }}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${it.accent ? 'bg-emerald-500/15 text-emerald-500' : 'bg-th-surface2 text-th-text-2 border border-th-border'}`}>
                            <Icon className="w-[18px] h-[18px]" />
                          </div>
                          <p className="text-sm font-semibold text-th-text-1">{it.title}</p>
                          <p className="text-xs text-th-text-2 mt-1 leading-relaxed">{it.desc}</p>
                          <span className={`inline-flex items-center gap-1 mt-4 text-xs font-semibold ${it.accent ? 'text-emerald-500' : 'text-th-text-1'}`}>
                            {it.cta} <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>

              {/* ── Upsell ── */}
              {!isPro && simLimitDisplay && simulations.length >= Math.floor(simLimitDisplay * 0.6) && (
                <motion.div
                  variants={item}
                  className="rounded-2xl px-5 py-4 flex items-center gap-4"
                  style={{ background: glassBg, border: `1px solid ${glassBorder}`, backdropFilter: 'blur(14px)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-th-text-1">
                      {simulations.length >= simLimitDisplay
                        ? 'Limite du plan gratuit atteinte'
                        : `${simLimitDisplay - simulations.length} simulation${simLimitDisplay - simulations.length > 1 ? 's' : ''} restante${simLimitDisplay - simulations.length > 1 ? 's' : ''}`}
                    </p>
                    <p className="text-xs text-th-text-3 mt-0.5">Plan Pro dès 19 €/mois — simulations illimitées, export PDF, dossier bancaire</p>
                  </div>
                  <div className="shrink-0 w-28">
                    <div className="h-1.5 bg-th-surface3 rounded-full overflow-hidden mb-1.5">
                      <motion.div
                        className="h-1.5 bg-amber-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (simulations.length / simLimitDisplay) * 100)}%` }}
                        transition={{ duration: 1, ease: EASE_OUT }}
                      />
                    </div>
                    <p className="text-[9px] text-th-text-3 text-right tabular-nums">{simulations.length} / {simLimitDisplay}</p>
                  </div>
                  <Link
                    href="/#pricing"
                    className="shrink-0 text-xs font-semibold text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 px-3.5 py-2 rounded-lg transition-all"
                  >
                    Passer au Pro
                  </Link>
                </motion.div>
              )}

            </motion.div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
