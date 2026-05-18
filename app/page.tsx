'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/landing/Navbar'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────────────────────────
   REVEAL HOOK
   ────────────────────────────────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ──────────────────────────────────────────────────────────────────────────────
   COUNT-UP HOOK
   ────────────────────────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf: number
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return value
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useReveal()
  const router = useRouter()
  const goAnalyse = () => router.push('/analyse')
  const goLogin = () => router.push('/auth/login')

  return (
    <div className="bg-[#09090b] text-white overflow-x-hidden selection:bg-emerald-500/30">
      <Navbar />

      <HeroSection onPrimary={goAnalyse} onSecondary={goLogin} />
      <StatsStrip />
      <BentoFeatures />
      <ComparisonSection />
      <PersonasSection onCta={goAnalyse} />
      <ExplicationSection />
      <TestimonialsSection />
      <PricingSection onSignup={goAnalyse} />
      <FaqSection />
      <CtaFinalSection onPrimary={goAnalyse} />
      <FooterMinimal />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — HERO (aurora mesh + 3D tilt + stats)
   ══════════════════════════════════════════════════════════════════════════ */
function HeroSection({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  return (
    <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-32 overflow-hidden">
      <HeroBackground />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-20 items-center">

          {/* LEFT — Copy */}
          <div className="anim-fadein space-y-9 lg:max-w-xl">
            <a
              href="#features"
              className="group inline-flex items-center gap-2 rounded-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] backdrop-blur-md px-3 py-1 text-[12.5px] transition-colors"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-shimmer font-medium">Nouveau · Analyse IA intégrée</span>
              <svg className="w-3 h-3 text-zinc-500 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <h1 className="text-[clamp(2.9rem,6.5vw,5.2rem)] font-semibold leading-[1.0] tracking-[-0.045em]">
              <span className="gt-white block">L'analyse</span>
              <span className="gt-white block">immobilière</span>
              <span className="gradient-text block">redessinée.</span>
            </h1>

            <p className="text-[17px] lg:text-[19px] text-zinc-400 leading-[1.55] max-w-[520px]">
              Évaluez la rentabilité, le cashflow et la fiscalité d'un bien locatif en moins de 30 secondes.
              Sans Excel. Sans approximation.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onPrimary}
                className="group relative inline-flex items-center gap-2 bg-white text-zinc-950 font-medium text-[14.5px] px-5 py-3 rounded-lg transition-all duration-300 hover:shadow-[0_0_42px_-4px_rgba(255,255,255,0.5)] hover:-translate-y-0.5"
              >
                <span className="absolute -inset-px rounded-lg bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
                <span className="relative">Commencer une analyse</span>
                <svg className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                onClick={onSecondary}
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-white font-medium text-[14.5px] px-5 py-3 rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03] transition-all duration-300"
              >
                Se connecter
              </button>
            </div>

            {/* Mini avatars + tagline */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex -space-x-1.5">
                {['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4'].map((c, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-[#09090b] flex items-center justify-center text-[9px] font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, ${c}, ${c}99)` }}
                  >
                    {['A', 'M', 'S', 'T', 'J'][i]}
                  </div>
                ))}
              </div>
              <p className="text-[12.5px] text-zinc-500">
                <span className="text-zinc-300 font-medium">1 200+ investisseurs</span> font confiance à Immolyse
              </p>
            </div>
          </div>

          {/* RIGHT — Product preview with 3D tilt */}
          <div className="relative anim-fadein-slow">
            <ProductPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Aurora mesh */}
      <div className="aurora-mesh" />

      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 30%, transparent 90%)',
        }}
      />

      {/* Noise */}
      <div className="noise" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#09090b]" />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   PRODUCT PREVIEW (3D tilt + interactive)
   ────────────────────────────────────────────────────────────────────────── */
function ProductPreview() {
  const wrap = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'analyse' | 'fiscalite' | 'comparer'>('analyse')
  const [prix, setPrix] = useState(245000)
  const [loyer, setLoyer] = useState(1180)

  const result = calculateInvestment({
    ...DEFAULT_PARAMS,
    prixAchat: prix,
    loyerNu: loyer,
    loyerMeuble: loyer,
    ville: 'Lyon',
  })

  const rendBrut = result.rendBrut
  const cf = result.cashflowMensuel
  const cfNegative = cf < 0
  const score = Math.min(100, Math.max(0, Math.round(rendBrut * 11 + (cf > 0 ? 18 : -5))))

  // 3D tilt handler
  const onMove = useCallback((e: React.MouseEvent) => {
    if (!wrap.current) return
    const r = wrap.current.getBoundingClientRect()
    const cx = (e.clientX - r.left) / r.width
    const cy = (e.clientY - r.top) / r.height
    const ry = (cx - 0.5) * 8  // max 4deg
    const rx = -(cy - 0.5) * 8
    wrap.current.style.setProperty('--rx', `${rx}deg`)
    wrap.current.style.setProperty('--ry', `${ry}deg`)
  }, [])
  const onLeave = useCallback(() => {
    if (!wrap.current) return
    wrap.current.style.setProperty('--rx', '0deg')
    wrap.current.style.setProperty('--ry', '0deg')
  }, [])

  return (
    <div className="relative" onMouseMove={onMove} onMouseLeave={onLeave}>
      {/* Outer glow */}
      <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/25 via-transparent to-indigo-500/20 rounded-3xl blur-3xl opacity-70" />

      <div ref={wrap} className="tilt-3d relative">
        {/* Floating LIVE chip (depth) */}
        <div className="tilt-layer-3 absolute -top-3 -left-3 z-20 bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-full px-2.5 py-1 text-[11px] text-emerald-300 font-medium flex items-center gap-1.5 anim-float-slow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </div>

        {/* Window */}
        <div className="relative glass-card rounded-2xl overflow-hidden shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-black/30">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] text-[10.5px] text-zinc-500 font-mono">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="11" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4-2-2.9-2-4z" />
                </svg>
                immolyse.app/analyse
              </div>
            </div>
            <div className="w-12" />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 border-b border-white/[0.04]">
            {([
              { id: 'analyse', label: 'Analyse' },
              { id: 'fiscalite', label: 'Fiscalité' },
              { id: 'comparer', label: 'Comparer' },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative px-3 py-2 text-[12.5px] font-medium transition-colors ${
                  tab === t.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="tilt-layer-1 p-5 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/[0.05]">
              <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
              <span className="text-[12.5px] text-zinc-300 truncate flex-1">
                12 rue Vaubecour, 69002 Lyon
              </span>
              <span className="text-[10.5px] text-emerald-400 font-mono">T3 · 68m²</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MiniInput
                label="Prix d'achat"
                value={formatCurrency(prix)}
                slider={
                  <input
                    type="range" min={80000} max={500000} step={5000}
                    value={prix}
                    onChange={(e) => setPrix(+e.target.value)}
                    style={{ ['--val' as any]: `${((prix - 80000) / (500000 - 80000)) * 100}%` }}
                  />
                }
              />
              <MiniInput
                label="Loyer mensuel"
                value={`${loyer.toLocaleString('fr-FR')} €`}
                slider={
                  <input
                    type="range" min={400} max={3000} step={20}
                    value={loyer}
                    onChange={(e) => setLoyer(+e.target.value)}
                    style={{ ['--val' as any]: `${((loyer - 400) / (3000 - 400)) * 100}%` }}
                  />
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <ResultTile label="Rendement brut" value={`${rendBrut.toFixed(2)}%`} tone={rendBrut >= 6 ? 'good' : rendBrut >= 4 ? 'neutral' : 'warn'} />
              <ResultTile label="Cashflow / mois" value={`${cf >= 0 ? '+' : ''}${Math.round(cf)} €`} tone={cfNegative ? 'warn' : 'good'} />
              <ResultTile label="Score IA" value={`${score}/100`} tone={score >= 65 ? 'good' : score >= 45 ? 'neutral' : 'warn'} />
            </div>

            <MiniChart cf={cf} />

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11.5px] font-medium text-emerald-200">Recommandation IA</p>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                  {cfNegative
                    ? 'Cashflow négatif. Passage en LMNP recommandé pour réduire de ~38% l\'imposition annuelle.'
                    : 'Investissement équilibré. Régime LMNP optimal pour les 12 premières années.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating PDF chip */}
        <div className="tilt-layer-2 absolute -bottom-3 -right-3 z-20 glass-card rounded-xl px-3 py-2 flex items-center gap-2 anim-float">
          <div className="w-7 h-7 rounded-md bg-red-500/15 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-medium text-white">rapport.pdf</div>
            <div className="text-[9.5px] text-zinc-500 font-mono">prêt à exporter</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniInput({ label, value, slider }: { label: string; value: string; slider: React.ReactNode }) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <span className="text-[10.5px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      <div className="text-[15px] font-semibold text-white tabular">{value}</div>
      {slider}
    </div>
  )
}

function ResultTile({ label, value, tone }: { label: string; value: string; tone: 'good' | 'neutral' | 'warn' }) {
  const colors = {
    good: 'text-emerald-300 bg-emerald-500/[0.04] border-emerald-500/15',
    neutral: 'text-amber-300 bg-amber-500/[0.04] border-amber-500/15',
    warn: 'text-red-300 bg-red-500/[0.04] border-red-500/15',
  }[tone]
  return (
    <div className={`p-2.5 rounded-lg border ${colors}`}>
      <div className="text-[9.5px] text-zinc-500 uppercase tracking-wider font-medium mb-1">{label}</div>
      <div className="text-[15px] font-semibold tabular">{value}</div>
    </div>
  )
}

function MiniChart({ cf }: { cf: number }) {
  const years = 20
  const points = Array.from({ length: years + 1 }, (_, i) => {
    const base = cf * 12 * i * 1.02
    const apprec = 1000 * i * i * 0.4
    return Math.max(0, base + apprec + 18000)
  })
  const max = Math.max(...points)
  const min = Math.min(...points)
  const w = 100
  const h = 40
  const d = points
    .map((p, i) => {
      const x = (i / years) * w
      const y = h - ((p - min) / (max - min || 1)) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  const area = `${d} L ${w} ${h} L 0 ${h} Z`

  return (
    <div className="px-2.5 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10.5px] text-zinc-500 uppercase tracking-wider font-medium">Patrimoine projeté · 20 ans</span>
        <span className="text-[11px] text-emerald-300 font-mono font-medium">+{(max / 1000).toFixed(0)}k €</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-12">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chart-fill)" />
        <path d={d} fill="none" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATS STRIP (animated counters)
   ══════════════════════════════════════════════════════════════════════════ */
function StatsStrip() {
  const [start, setStart] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setStart(true), { threshold: 0.3 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const v1 = useCountUp(12547, 1800, start)
  const v2 = useCountUp(34, 1500, start)        // M€
  const v3 = useCountUp(49, 1500, start)        // /5  → 4.9
  const v4 = useCountUp(98, 1500, start)        // %

  return (
    <section ref={ref} className="relative border-y border-white/[0.05] py-12 lg:py-14">
      <div className="absolute inset-0 dot-pattern opacity-[0.4] pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
          <Stat value={`${v1.toLocaleString('fr-FR')}`} suffix="" label="Biens analysés" />
          <Stat value={`${v2.toLocaleString('fr-FR')}`} suffix=" M€" label="Économies fiscales détectées" />
          <Stat value={`${(v3 / 10).toFixed(1)}`} suffix="/5" label="Note utilisateurs" />
          <Stat value={`${v4}`} suffix=" %" label="Décisions plus rapides" />
        </div>
      </div>
    </section>
  )
}

function Stat({ value, suffix, label }: { value: string; suffix: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-tight tabular gt-white">
        {value}<span className="text-emerald-300">{suffix}</span>
      </div>
      <div className="text-[12px] text-zinc-500 mt-1 uppercase tracking-[0.18em]">{label}</div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   BENTO FEATURES (asymmetric grid)
   ══════════════════════════════════════════════════════════════════════════ */
function BentoFeatures() {
  return (
    <section id="features" className="relative py-28 lg:py-36">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] pointer-events-none opacity-60">
        <div className="aurora-mesh subtle" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Fonctionnalités
          </div>
          <h2 className="text-[clamp(2.2rem,4.5vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.04em] gt-white">
            Une boîte à outils complète,
            <br />
            <span className="text-zinc-500">pensée comme un produit, pas un Excel.</span>
          </h2>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 reveal reveal-d1">
          {/* Big cell — Score IA */}
          <BentoCell className="md:col-span-2 md:row-span-2 min-h-[420px]">
            <div className="flex flex-col h-full justify-between">
              <div>
                <Eyebrow>Score IA · GPT-4</Eyebrow>
                <h3 className="text-[clamp(1.5rem,2.2vw,2rem)] font-semibold tracking-tight gt-white mt-3 max-w-md">
                  Un score d'opportunité de 0 à 100, expliqué en une phrase.
                </h3>
                <p className="text-[14px] text-zinc-500 mt-3 max-w-md">
                  L'IA analyse rendement, cashflow, fiscalité et marché local pour vous donner une réponse claire : foncez ou passez votre tour.
                </p>
              </div>
              <BentoScoreDial />
            </div>
          </BentoCell>

          {/* Tall — 10 régimes fiscaux */}
          <BentoCell className="md:row-span-2 min-h-[420px]">
            <Eyebrow>10 régimes fiscaux</Eyebrow>
            <h3 className="text-[18px] font-semibold tracking-tight gt-white mt-3">
              Choisit le régime optimal pour vous.
            </h3>
            <p className="text-[13px] text-zinc-500 mt-2">
              Micro-foncier, Réel, LMNP, LMP, SCI IS/IR, SARL de famille, indivision...
            </p>
            <BentoFiscalList />
          </BentoCell>

          {/* Medium — Données marché */}
          <BentoCell>
            <Eyebrow>Données marché</Eyebrow>
            <h3 className="text-[16px] font-semibold tracking-tight gt-white mt-2.5">
              18 villes, 44 quartiers.
            </h3>
            <BentoCityList />
          </BentoCell>

          {/* Medium — Export */}
          <BentoCell>
            <Eyebrow>Export pro</Eyebrow>
            <h3 className="text-[16px] font-semibold tracking-tight gt-white mt-2.5">
              PDF banque & Excel détaillé.
            </h3>
            <BentoExportPreview />
          </BentoCell>

          {/* Wide — Multi-scénarios */}
          <BentoCell className="md:col-span-3 min-h-[200px]">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="max-w-md">
                <Eyebrow>Multi-scénarios</Eyebrow>
                <h3 className="text-[clamp(1.3rem,2vw,1.7rem)] font-semibold tracking-tight gt-white mt-2.5">
                  Nu, meublé, colocation, saisonnier — comparés en un écran.
                </h3>
                <p className="text-[13px] text-zinc-500 mt-2 max-w-sm">
                  Le même bien sous 4 régimes locatifs, avec les chiffres exacts pour chaque option.
                </p>
              </div>
              <BentoScenarios />
            </div>
          </BentoCell>
        </div>
      </div>
    </section>
  )
}

function BentoCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`spotlight relative rounded-2xl p-6 bg-gradient-to-b from-white/[0.025] to-transparent border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04] ${className}`}>
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 uppercase tracking-[0.2em]">
      <span className="w-1 h-1 rounded-full bg-emerald-400" />
      {children}
    </div>
  )
}

function BentoScoreDial() {
  const score = 87
  const circ = 2 * Math.PI * 70
  const offset = circ - (score / 100) * circ
  return (
    <div className="flex items-center gap-5 mt-6">
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
          <circle
            cx="80" cy="80" r="70"
            stroke="url(#dial-grad)" strokeWidth="6" fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="dial-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[44px] font-semibold tracking-tight text-white tabular leading-none">{score}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">/100</div>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {[
          { l: 'Rendement', v: 92 },
          { l: 'Cashflow', v: 88 },
          { l: 'Fiscalité', v: 81 },
          { l: 'Marché', v: 86 },
        ].map((s) => (
          <div key={s.l} className="space-y-1">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-zinc-400">{s.l}</span>
              <span className="text-zinc-300 font-mono tabular">{s.v}</span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-indigo-400 rounded-full" style={{ width: `${s.v}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BentoFiscalList() {
  const items = [
    { name: 'LMNP réel', cf: '+1 540', best: true },
    { name: 'SCI à l\'IS', cf: '+340' },
    { name: 'LMNP micro', cf: '+620' },
    { name: 'SARL de famille', cf: '+180' },
    { name: 'Réel foncier', cf: '−480' },
    { name: 'Micro-foncier', cf: '−1 240' },
  ]
  return (
    <div className="mt-4 space-y-1.5">
      {items.map((i) => {
        const pos = !i.cf.startsWith('−')
        return (
          <div
            key={i.name}
            className={`flex items-center justify-between px-2.5 py-2 rounded-md text-[12px] ${
              i.best ? 'bg-emerald-500/10 border border-emerald-500/25' : 'bg-white/[0.02] border border-white/[0.04]'
            }`}
          >
            <span className="text-zinc-200 flex items-center gap-1.5">
              {i.best && <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/15 px-1 py-0.5 rounded">★</span>}
              {i.name}
            </span>
            <span className={`font-mono tabular ${pos ? 'text-emerald-300' : 'text-red-300'}`}>{i.cf}€/m</span>
          </div>
        )
      })}
    </div>
  )
}

function BentoCityList() {
  const cities = [
    { c: 'Paris', p: '11 200', r: '3.4' },
    { c: 'Lyon', p: '5 480', r: '5.1' },
    { c: 'Marseille', p: '3 320', r: '6.8' },
    { c: 'Nantes', p: '4 050', r: '5.6' },
  ]
  return (
    <div className="mt-4 space-y-1">
      {cities.map((c) => (
        <div key={c.c} className="flex items-center justify-between text-[11.5px] px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors">
          <span className="text-zinc-300">{c.c}</span>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-zinc-500">{c.p} €/m²</span>
            <span className="text-emerald-300 tabular">{c.r}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function BentoExportPreview() {
  return (
    <div className="mt-4 space-y-1.5">
      {[
        { name: 'rapport.pdf', icon: 'pdf' },
        { name: 'amortissement.xlsx', icon: 'xls' },
      ].map((f) => (
        <div key={f.name} className="flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${f.icon === 'pdf' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
            </svg>
          </div>
          <span className="text-[11.5px] text-zinc-300 flex-1">{f.name}</span>
          <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
          </svg>
        </div>
      ))}
    </div>
  )
}

function BentoScenarios() {
  const sc = [
    { name: 'Nu', rd: '4.8', cf: '−120', neg: true },
    { name: 'Meublé', rd: '6.2', cf: '+180', neg: false },
    { name: 'Coloc', rd: '8.4', cf: '+540', neg: false, best: true },
    { name: 'Saisonnier', rd: '9.1', cf: '+720', neg: false },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1 max-w-2xl">
      {sc.map((s) => (
        <div
          key={s.name}
          className={`p-3 rounded-lg border text-center ${
            s.best ? 'bg-emerald-500/[0.06] border-emerald-500/25' : 'bg-white/[0.02] border-white/[0.05]'
          }`}
        >
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">{s.name}</div>
          <div className="text-[18px] font-semibold tabular text-white">{s.rd}%</div>
          <div className={`text-[10.5px] font-mono mt-1 tabular ${s.neg ? 'text-red-300' : 'text-emerald-300'}`}>{s.cf}€/m</div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPARISON SECTION (Excel vs Immolyse, drag slider)
   ══════════════════════════════════════════════════════════════════════════ */
function ComparisonSection() {
  const [pos, setPos] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onDown = () => { dragging.current = true }
  const onUp = () => { dragging.current = false }
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const x = ((clientX - r.left) / r.width) * 100
    setPos(Math.max(5, Math.min(95, x)))
  }

  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchend', up)
    }
  }, [])

  return (
    <section className="relative py-28 lg:py-32 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-12 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Avant / Après
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Du tableur infernal,
            <br />
            <span className="gradient-text">à la décision claire.</span>
          </h2>
          <p className="text-[14.5px] text-zinc-500 mt-5">Glisse le curseur pour voir la différence.</p>
        </div>

        <div
          ref={ref}
          onMouseMove={onMove}
          onTouchMove={onMove}
          className="relative aspect-[16/9] w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/[0.08] glass-card cursor-ew-resize reveal reveal-d1 select-none"
        >
          {/* Right side : Immolyse */}
          <ImmolyseScreenshot />

          {/* Left side : Excel (clipped) */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <ExcelScreenshot />
          </div>

          {/* Drag handle */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/40"
            style={{ left: `${pos}%` }}
          >
            <button
              onMouseDown={onDown}
              onTouchStart={onDown}
              className="compare-handle absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-white/30 flex items-center justify-center shadow-2xl"
              aria-label="Glisser pour comparer"
            >
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
              </svg>
            </button>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/25 text-[10.5px] font-mono text-red-300 uppercase tracking-wider">
            Excel · 47 min
          </div>
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-[10.5px] font-mono text-emerald-300 uppercase tracking-wider">
            Immolyse · 30 sec
          </div>
        </div>
      </div>
    </section>
  )
}

function ExcelScreenshot() {
  // Fake messy spreadsheet
  const rows = Array.from({ length: 14 }, (_, i) => i)
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  return (
    <div className="absolute inset-0 bg-[#1c1c1f]">
      <div className="absolute top-0 left-0 right-0 h-6 bg-[#252528] border-b border-black/40 flex items-center px-2 gap-1">
        <span className="text-[10px] font-mono text-zinc-400">Calculs_Rentabilité_V12_FINAL_FINAL2.xlsx</span>
      </div>
      <div className="absolute top-6 inset-x-0 h-7 bg-[#2a2a2d] border-b border-black/40 flex items-center px-2 gap-3">
        {['Fichier', 'Édition', 'Affichage', 'Formules', 'Données'].map((t) => (
          <span key={t} className="text-[9.5px] text-zinc-500">{t}</span>
        ))}
      </div>
      <div className="absolute top-[52px] inset-x-0 px-1.5">
        <div className="grid" style={{ gridTemplateColumns: `28px repeat(${cols.length}, 1fr)` }}>
          <div className="text-[9px] text-zinc-600 text-center"></div>
          {cols.map((c) => (
            <div key={c} className="text-[9px] text-zinc-500 text-center py-1 border-r border-black/30 bg-[#2a2a2d]">{c}</div>
          ))}
          {rows.map((r) =>
            Array.from({ length: cols.length + 1 }, (_, c) => c).map((c) => {
              const isHeader = c === 0
              const isError = (r === 4 && c === 3) || (r === 7 && c === 5) || (r === 11 && c === 2)
              const isFormula = (r + c) % 5 === 0
              return (
                <div
                  key={`${r}-${c}`}
                  className={`text-[9px] py-0.5 px-1 border-b border-r border-black/30 truncate ${
                    isHeader ? 'text-zinc-600 bg-[#2a2a2d] text-center' :
                    isError ? 'bg-red-900/30 text-red-300' :
                    isFormula ? 'text-emerald-400' :
                    'text-zinc-400'
                  }`}
                >
                  {isHeader ? r + 1 :
                   isError ? '#REF!' :
                   isFormula ? `=SI(B${r}>0;B${r}*C${r};0)` :
                   c === 1 ? ['Prix', 'Loyer', 'Taxes', 'Charges', 'Travaux', 'Notaire', 'Crédit', 'Rendement', 'Cashflow', 'Impot', 'IFI', 'PV', 'Net', 'Total'][r] || '' :
                   `${(Math.random() * 9999).toFixed(0)}`}
                </div>
              )
            })
          )}
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-[10px] text-red-400 bg-red-900/30 border border-red-500/30 rounded px-2 py-1">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01" />
        </svg>
        Référence circulaire détectée en F12. Formule cassée.
      </div>
    </div>
  )
}

function ImmolyseScreenshot() {
  return (
    <div className="absolute inset-0 bg-[#09090b]">
      {/* Subtle aurora */}
      <div className="absolute inset-0 opacity-50">
        <div className="aurora-mesh subtle" />
      </div>

      <div className="absolute inset-0 p-8 grid grid-cols-12 grid-rows-6 gap-3">
        {/* Header */}
        <div className="col-span-12 row-span-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500" />
            <span className="text-[13px] font-semibold text-white">Analyse · Lyon 2ᵉ</span>
          </div>
          <div className="flex gap-1.5">
            <div className="px-2 py-0.5 text-[9px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded">SCORE 87</div>
          </div>
        </div>

        {/* Big stat */}
        <div className="col-span-6 row-span-2 glass-card rounded-xl p-4 flex flex-col justify-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Rendement net</div>
          <div className="text-[42px] font-semibold tracking-tight text-white tabular leading-none mt-1">5.78%</div>
          <div className="text-[11px] text-emerald-300 font-mono mt-2">+1.4 vs marché Lyon</div>
        </div>
        <div className="col-span-3 row-span-2 glass-card rounded-xl p-4 flex flex-col justify-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Cashflow</div>
          <div className="text-[24px] font-semibold tracking-tight text-emerald-300 tabular mt-1">+128€</div>
        </div>
        <div className="col-span-3 row-span-2 glass-card rounded-xl p-4 flex flex-col justify-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Régime</div>
          <div className="text-[16px] font-semibold text-white mt-1">LMNP réel</div>
          <div className="text-[10px] text-emerald-400 mt-1">★ Optimal</div>
        </div>

        {/* Chart */}
        <div className="col-span-8 row-span-3 glass-card rounded-xl p-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Patrimoine projeté · 20 ans</div>
          <svg viewBox="0 0 200 80" className="w-full h-full">
            <defs>
              <linearGradient id="im-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0 70 Q 50 60 100 40 T 200 8 L 200 80 L 0 80 Z" fill="url(#im-grad)" />
            <path d="M 0 70 Q 50 60 100 40 T 200 8" fill="none" stroke="#34d399" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Score */}
        <div className="col-span-4 row-span-3 glass-card rounded-xl p-4 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
              <circle cx="50" cy="50" r="40" stroke="#34d399" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * 0.13} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[28px] font-semibold tabular text-white">87</div>
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-2">Score IA</div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PERSONAS
   ══════════════════════════════════════════════════════════════════════════ */
function PersonasSection({ onCta }: { onCta: () => void }) {
  const personas = [
    {
      tag: 'Débutant',
      title: 'Vous achetez votre premier bien',
      desc: 'On vous dit ce qui est rentable, ce qui ne l\'est pas, et pourquoi. Aucune connaissance fiscale requise.',
      points: ['Score d\'opportunité clair', 'Recommandation IA en français', 'Glossaire intégré'],
      icon: '👤',
      grad: 'from-emerald-500/15 to-emerald-500/0',
      ring: 'border-emerald-500/20',
    },
    {
      tag: 'Multi-bien',
      title: 'Vous avez déjà 3 biens ou plus',
      desc: 'Comparez vos investissements, identifiez ceux qui sous-performent, optimisez votre fiscalité globale.',
      points: ['Comparaison multi-biens', 'Optimisation 10 régimes', 'Bibliothèque centralisée'],
      icon: '🏘️',
      grad: 'from-indigo-500/15 to-indigo-500/0',
      ring: 'border-indigo-500/20',
    },
    {
      tag: 'Pro',
      title: 'Vous êtes CGP, agent ou courtier',
      desc: 'Présentez à vos clients des analyses complètes en quelques secondes, avec votre logo en PDF.',
      points: ['Rapports white-label', 'Accès API', 'Multi-comptes équipe'],
      icon: '💼',
      grad: 'from-pink-500/15 to-pink-500/0',
      ring: 'border-pink-500/20',
    },
  ]

  return (
    <section className="relative py-28 lg:py-32 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Pour qui
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Conçu pour vous,
            <br />
            <span className="text-zinc-500">quel que soit votre niveau.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 reveal reveal-d1">
          {personas.map((p) => (
            <div key={p.tag} className={`spotlight relative rounded-2xl p-7 bg-gradient-to-b ${p.grad} border ${p.ring} hover:border-white/20 transition-all duration-500`}>
              <div className="text-3xl mb-5">{p.icon}</div>
              <div className="text-[10.5px] font-mono text-emerald-400 uppercase tracking-[0.2em] mb-2">{p.tag}</div>
              <h3 className="text-[18px] font-semibold tracking-tight text-white mb-3">{p.title}</h3>
              <p className="text-[13.5px] text-zinc-400 leading-[1.6] mb-5">{p.desc}</p>
              <div className="space-y-2 mb-6">
                {p.points.map((pt) => (
                  <div key={pt} className="flex items-center gap-2 text-[12.5px] text-zinc-300">
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {pt}
                  </div>
                ))}
              </div>
              <button
                onClick={onCta}
                className="text-[12.5px] text-emerald-300 hover:text-emerald-200 font-medium inline-flex items-center gap-1.5 group"
              >
                Essayer pour ce profil
                <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPLICATION (3 blocs alternés)
   ══════════════════════════════════════════════════════════════════════════ */
function ExplicationSection() {
  return (
    <section id="produit" className="relative py-28 lg:py-36 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-20 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Comment ça marche
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Du bien à la décision,
            <br />
            <span className="text-zinc-500">en trois étapes.</span>
          </h2>
        </div>

        <div className="space-y-24">
          <ExpliBlock
            num="01"
            title="Analysez un bien"
            subtitle="Entrez les chiffres, l'outil fait le reste."
            description="Prix d'achat, loyer estimé, ville. Immolyse calcule instantanément le rendement brut, net, et nette-nette avec des données de marché actualisées."
            visual={<ZoomVisualAnalyse />}
            reverse={false}
          />
          <ExpliBlock
            num="02"
            title="Calcul automatique"
            subtitle="Cashflow réel, fiscalité comparée."
            description="L'outil simule 10 régimes fiscaux (LMNP, LMP, SCI IS/IR, micro-foncier, réel...) et recommande celui qui optimise votre cashflow net après impôt."
            visual={<ZoomVisualFiscal />}
            reverse={true}
          />
          <ExpliBlock
            num="03"
            title="Exportez en un clic"
            subtitle="PDF prêt-pour-banquier ou Excel détaillé."
            description="Rapport de présentation bancaire en PDF, tableau d'amortissement complet en Excel. Les documents que votre courtier attend, en 5 secondes."
            visual={<ZoomVisualExport />}
            reverse={false}
          />
        </div>
      </div>
    </section>
  )
}

function ExpliBlock({ num, title, subtitle, description, visual, reverse }: { num: string; title: string; subtitle: string; description: string; visual: React.ReactNode; reverse: boolean }) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center reveal ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <div className="space-y-5">
        <div className="text-[11px] font-mono text-emerald-400 tracking-[0.2em]">{num} —</div>
        <h3 className="text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.03em] gt-white">
          {title}
        </h3>
        <p className="text-[16px] text-zinc-300 font-medium">{subtitle}</p>
        <p className="text-[15px] text-zinc-500 leading-[1.65] max-w-md">{description}</p>
      </div>
      <div className="relative">{visual}</div>
    </div>
  )
}

function ZoomVisualAnalyse() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-3xl blur-2xl" />
      <div className="relative glass-card rounded-xl p-5 space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Analyse express</div>
          <div className="text-[10.5px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2 py-0.5">en direct</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { l: 'Adresse', v: 'Lyon 2ᵉ' },
            { l: 'Surface', v: '68 m²' },
            { l: 'Prix', v: '245 000 €' },
            { l: 'Loyer', v: '1 180 €' },
          ].map((f) => (
            <div key={f.l} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="text-[9.5px] text-zinc-600 uppercase tracking-wider mb-0.5">{f.l}</div>
              <div className="text-[13px] text-white font-medium">{f.v}</div>
            </div>
          ))}
        </div>
        <div className="h-px bg-white/[0.05]" />
        <div className="space-y-2">
          {[
            { label: 'Rendement brut', value: '5.78 %' },
            { label: 'Rendement net', value: '4.12 %' },
            { label: 'Cashflow/mois', value: '+128 €' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[12.5px]">
              <span className="text-zinc-500">{r.label}</span>
              <span className="font-mono font-semibold text-emerald-300 tabular">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ZoomVisualFiscal() {
  const rows = [
    { name: 'Micro-foncier', net: '-1 240 €', tone: 'bad' },
    { name: 'Réel foncier', net: '-480 €', tone: 'bad' },
    { name: 'LMNP réel', net: '+1 540 €', tone: 'good', best: true },
    { name: 'LMNP micro', net: '+620 €', tone: 'good' },
    { name: 'SCI à l\'IS', net: '+340 €', tone: 'good' },
  ]
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-tl from-indigo-500/15 to-transparent rounded-3xl blur-2xl" />
      <div className="relative glass-card rounded-xl p-5 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Comparateur fiscal</div>
          <div className="text-[10.5px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/15 rounded-full px-2 py-0.5">10 régimes</div>
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div
              key={r.name}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-[12.5px] ${
                r.best ? 'bg-emerald-500/[0.08] border border-emerald-500/25' : 'bg-white/[0.02] border border-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2 text-zinc-200">
                {r.best && <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">OPTI</span>}
                {r.name}
              </span>
              <span className={`font-mono font-semibold tabular ${r.tone === 'good' ? 'text-emerald-300' : 'text-red-300'}`}>
                {r.net}/mois
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ZoomVisualExport() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-br from-amber-500/10 to-transparent rounded-3xl blur-2xl" />
      <div className="relative glass-card rounded-xl p-5 space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Exports</div>
          <div className="text-[10.5px] text-zinc-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">prêt</div>
        </div>
        <div className="space-y-2">
          {[
            { name: 'rapport-banque.pdf', size: '420 Ko', color: 'red' },
            { name: 'amortissement.xlsx', size: '186 Ko', color: 'emerald' },
            { name: 'comparatif-fiscal.pdf', size: '312 Ko', color: 'red' },
          ].map((f) => (
            <div key={f.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${f.color === 'red' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-white truncate">{f.name}</div>
                <div className="text-[10px] font-mono text-zinc-500">{f.size}</div>
              </div>
              <svg className="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   TESTIMONIALS (marquee)
   ══════════════════════════════════════════════════════════════════════════ */
function TestimonialsSection() {
  const items = [
    {
      name: 'Antoine M.',
      role: 'Investisseur · 7 biens',
      quote: 'J\'ai économisé 14 000€/an en basculant en LMNP, alors que mon comptable me jurait que le micro-foncier était optimal. Immolyse a vu juste en 30 secondes.',
      result: '+14 000 €/an',
      avatar: 'A',
      color: '#10b981',
    },
    {
      name: 'Sophie T.',
      role: 'Première acquisition',
      quote: 'J\'allais signer un T2 à Bordeaux que je pensais rentable. L\'outil m\'a montré un cashflow réel de −230€/mois. J\'ai évité une catastrophe.',
      result: 'Décision évitée',
      avatar: 'S',
      color: '#6366f1',
    },
    {
      name: 'Mehdi R.',
      role: 'CGP indépendant',
      quote: 'Je fais 3 analyses par jour pour mes clients. Avant : 1h chacune sur Excel. Maintenant : 30 secondes avec un PDF white-label. Imbattable.',
      result: '×120 plus rapide',
      avatar: 'M',
      color: '#ec4899',
    },
    {
      name: 'Julie B.',
      role: 'Investisseuse · 3 biens',
      quote: 'Le score IA m\'a fait découvrir qu\'un de mes biens sous-performait à cause de la fiscalité. 4 800€/an récupérés.',
      result: '+4 800 €/an',
      avatar: 'J',
      color: '#f59e0b',
    },
    {
      name: 'Thomas L.',
      role: 'Agent immobilier',
      quote: 'Je l\'utilise en RDV avec mes acheteurs. Ça crée une confiance immédiate. Mon taux de transformation a doublé.',
      result: '×2 conversion',
      avatar: 'T',
      color: '#06b6d4',
    },
  ]
  // duplicate for seamless marquee
  const marqueeItems = [...items, ...items]

  return (
    <section className="relative py-28 lg:py-32 border-t border-white/[0.04] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 mb-12">
        <div className="text-center max-w-2xl mx-auto reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Témoignages
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Des décisions, pas des promesses.
          </h2>
          <p className="text-[14.5px] text-zinc-500 mt-5">Ce que disent celles et ceux qui utilisent Immolyse au quotidien.</p>
        </div>
      </div>

      <div className="marquee reveal">
        <div className="marquee-track">
          {marqueeItems.map((t, i) => (
            <div key={i} className="w-[360px] flex-shrink-0 spotlight relative rounded-2xl p-6 bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.06] hover:border-white/[0.14] transition-all duration-500">
              <svg className="w-5 h-5 text-zinc-700 mb-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10c0-3.31 2.69-6 6-6V2C8.58 2 5 5.58 5 10v6h6v-6H7zm12 0c0-3.31 2.69-6 6-6V2c-4.42 0-8 3.58-8 8v6h6v-6h-4z" transform="translate(-2 0)" />
              </svg>
              <p className="text-[13.5px] text-zinc-200 leading-[1.6] mb-5 min-h-[110px]">{t.quote}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold text-white border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-white">{t.name}</div>
                    <div className="text-[10.5px] text-zinc-500">{t.role}</div>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-300">
                  {t.result}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PRICING
   ══════════════════════════════════════════════════════════════════════════ */
function PricingSection({ onSignup }: { onSignup: () => void }) {
  const [annual, setAnnual] = useState(true)
  const plans = [
    {
      name: 'Découverte',
      price: { monthly: 0, annual: 0 },
      desc: 'Pour tester l\'outil',
      features: ['Analyse express', '3 simulations sauvegardées', 'Export PDF (filigrane)', 'Données marché basiques'],
      cta: 'Commencer gratuitement',
      featured: false,
    },
    {
      name: 'Pro',
      price: { monthly: 29, annual: 19 },
      desc: 'L\'essentiel pour investir sérieusement',
      features: ['Simulations illimitées', '10 régimes fiscaux', 'Analyse IA (GPT-4)', 'Export PDF & Excel pro', 'Comparaison multi-biens', 'Support prioritaire'],
      cta: 'Essai 14 jours',
      featured: true,
    },
    {
      name: 'Agence',
      price: { monthly: 79, annual: 59 },
      desc: 'Pour les pros de l\'immobilier',
      features: ['Tout le plan Pro', 'Jusqu\'à 5 sièges', 'Rapports white-label', 'Accès API', 'Onboarding dédié'],
      cta: 'Contacter l\'équipe',
      featured: false,
    },
  ]

  return (
    <section id="pricing" className="relative py-28 lg:py-36 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Tarifs
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Simple. Honnête.
            <br />
            <span className="text-zinc-500">Sans surprise.</span>
          </h2>

          <div className="inline-flex items-center gap-1 p-1 mt-8 rounded-full bg-white/[0.04] border border-white/[0.07]">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${!annual ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'}`}
            >
              Annuel
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${annual ? 'bg-emerald-500/15 text-emerald-700' : 'bg-emerald-500/15 text-emerald-300'}`}>−35%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto reveal reveal-d1">
          {plans.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 transition-all duration-300 ${
                  plan.featured
                    ? 'bg-gradient-to-b from-emerald-500/[0.06] to-transparent border border-emerald-500/30 shadow-[0_0_60px_-15px_rgba(16,185,129,0.25)]'
                    : 'bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 text-[10.5px] font-semibold">
                    <span className="w-1 h-1 rounded-full bg-zinc-950 animate-pulse" />
                    Le plus choisi
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-[15px] font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-[12.5px] text-zinc-500">{plan.desc}</p>
                </div>

                <div className="mb-6">
                  {price === 0 ? (
                    <div className="text-4xl font-semibold text-white tracking-tight">Gratuit</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-semibold text-white tracking-tight tabular">{price}</span>
                      <span className="text-zinc-500 text-sm">€/mois</span>
                    </div>
                  )}
                  {annual && price > 0 && (
                    <p className="text-[11.5px] text-zinc-600 mt-1.5">Facturé {price * 12}€/an</p>
                  )}
                </div>

                <button
                  onClick={onSignup}
                  className={`w-full text-[13.5px] font-medium py-2.5 rounded-lg transition-all duration-200 mb-6 ${
                    plan.featured
                      ? 'bg-white text-zinc-950 hover:bg-zinc-100 hover:shadow-[0_0_30px_-4px_rgba(255,255,255,0.4)]'
                      : 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-[13px] text-zinc-300">
                      <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-[12px] text-zinc-600 mt-10">
          Paiement Stripe sécurisé · Résiliable à tout moment · TVA incluse
        </p>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   FAQ
   ══════════════════════════════════════════════════════════════════════════ */
function FaqSection() {
  const [open, setOpen] = useState<number | null>(0)
  const faqs = [
    { q: 'Faut-il être expert en fiscalité immobilière ?', a: 'Non. L\'outil est conçu pour que vous obteniez une réponse claire sans connaissance préalable. L\'IA traduit chaque chiffre en recommandation lisible, et un glossaire est intégré pour les termes techniques.' },
    { q: 'D\'où viennent les données de marché ?', a: 'Les prix au m² et rendements moyens sont issus de sources publiques (DVF, MeilleursAgents, Notaires.fr, INSEE) et mises à jour mensuellement. 18 villes et 44 quartiers sont couverts pour le moment.' },
    { q: 'Mes données sont-elles confidentielles ?', a: 'Oui. Toutes les simulations sont chiffrées (AES-256), stockées en Europe (Supabase Frankfurt), et ne sont jamais partagées avec des tiers. Le code est conforme RGPD.' },
    { q: 'L\'analyse fiscale tient-elle compte de ma situation personnelle ?', a: 'Oui : tranche marginale d\'imposition, situation matrimoniale, biens existants, autres revenus locatifs. Plus les informations sont précises, plus la recommandation est juste.' },
    { q: 'Puis-je résilier à tout moment ?', a: 'Oui, en un clic depuis votre compte, sans engagement, sans pénalité, sans appel téléphonique forcé. Le remboursement est prorata.' },
    { q: 'Est-ce que ça remplace mon comptable ?', a: 'Non — c\'est un outil d\'analyse pour décider vite. Pour la déclaration fiscale et l\'optimisation pointue, un expert reste recommandé. Mais Immolyse vous prépare un dossier propre à lui soumettre.' },
  ]

  return (
    <section className="relative py-28 lg:py-32 border-t border-white/[0.04]">
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-14 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Questions fréquentes
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Tout ce qu'on vous demande.
          </h2>
        </div>

        <div className="space-y-2 reveal reveal-d1">
          {faqs.map((f, i) => (
            <div key={i} className={`rounded-xl border border-white/[0.06] hover:border-white/[0.12] transition-all bg-white/[0.015] ${open === i ? 'acc-open bg-white/[0.03]' : ''}`}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
              >
                <span className="text-[14.5px] font-medium text-white">{f.q}</span>
                <svg className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="acc-content">
                <div>
                  <p className="px-5 pb-4 text-[13.5px] text-zinc-400 leading-[1.65]">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   CTA FINAL
   ══════════════════════════════════════════════════════════════════════════ */
function CtaFinalSection({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden border-t border-white/[0.04]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="aurora-mesh" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)',
          }}
        />
        <div className="noise" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 lg:px-10 text-center space-y-8 reveal">
        <h2 className="text-[clamp(2.6rem,5.5vw,4.4rem)] font-semibold leading-[1.0] tracking-[-0.045em] gt-white">
          Votre prochain investissement
          <br />
          <span className="gradient-text">commence ici.</span>
        </h2>
        <p className="text-[17px] text-zinc-400 leading-[1.55] max-w-xl mx-auto">
          Analysez un bien immobilier en 30 secondes. Gratuit, sans inscription.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onPrimary}
            className="group relative inline-flex items-center gap-2 bg-white text-zinc-950 font-medium text-[15px] px-6 py-3.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_56px_-4px_rgba(255,255,255,0.5)] hover:-translate-y-0.5"
          >
            <span className="absolute -inset-px rounded-lg bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
            <span className="relative">Commencer maintenant</span>
            <svg className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        <p className="text-[12.5px] text-zinc-600 pt-2">
          Aucune carte requise · Résultats en 30 secondes
        </p>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════════════════ */
function FooterMinimal() {
  return (
    <footer className="border-t border-white/[0.04] py-10">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-zinc-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </div>
          <span className="text-zinc-500 text-[12.5px]">Immolyse © {new Date().getFullYear()}</span>
        </div>
        <div className="flex gap-6">
          {['CGU', 'Confidentialité', 'Contact'].map((l) => (
            <a key={l} href="#" className="text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors">{l}</a>
          ))}
        </div>
      </div>
    </footer>
  )
}
