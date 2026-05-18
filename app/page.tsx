'use client'

import { useEffect, useRef, useState } from 'react'
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
      <LogoStrip />
      <ExplicationSection />
      <FeaturesSection />
      <PricingSection onSignup={goAnalyse} />
      <CtaFinalSection onPrimary={goAnalyse} />
      <FooterMinimal />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — HERO (split-screen with live product preview)
   ══════════════════════════════════════════════════════════════════════════ */
function HeroSection({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  return (
    <section className="relative pt-32 lg:pt-36 pb-20 lg:pb-28 overflow-hidden">
      {/* Ambient background */}
      <HeroBackground />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">

          {/* LEFT — Copy */}
          <div className="anim-fadein space-y-8 lg:max-w-xl">
            {/* Pill */}
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] backdrop-blur-md px-3 py-1 text-[12.5px] text-zinc-300 transition-colors"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-zinc-200 font-medium">Nouveau · Analyse IA intégrée</span>
              <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Headline */}
            <h1 className="text-[clamp(2.8rem,6vw,4.8rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              <span className="gt-white">L'outil d'analyse</span>
              <br />
              <span className="gt-white">immobilière des </span>
              <span className="gradient-text">pros.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[17px] lg:text-[18px] text-zinc-400 leading-[1.55] max-w-[520px]">
              Évaluez la rentabilité, le cashflow et la fiscalité d'un bien locatif en moins de 30 secondes.
              Sans Excel. Sans approximation.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onPrimary}
                className="group inline-flex items-center gap-2 bg-white text-zinc-950 font-medium text-[14.5px] px-5 py-3 rounded-lg transition-all duration-300 hover:shadow-[0_0_36px_-4px_rgba(255,255,255,0.4)] hover:-translate-y-0.5"
              >
                Commencer une analyse
                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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

            {/* Tiny meta line */}
            <div className="flex items-center gap-5 pt-2 text-[12.5px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Gratuit pour commencer
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Aucune carte requise
              </span>
            </div>
          </div>

          {/* RIGHT — Product preview */}
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
      {/* Top glow */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] rounded-full anim-glow"
        style={{
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 35%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
      {/* Side glow */}
      <div
        className="absolute top-1/3 right-0 w-[500px] h-[500px] rounded-full opacity-50"
        style={{
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)',
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#09090b]" />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   PRODUCT PREVIEW (interactive, glassmorphism)
   ────────────────────────────────────────────────────────────────────────── */
function ProductPreview() {
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

  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-gradient-to-br from-emerald-500/20 via-transparent to-indigo-500/10 rounded-3xl blur-2xl opacity-60" />

      {/* Floating accent labels */}
      <div className="absolute -top-3 -left-3 z-20 bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1 text-[11px] text-emerald-300 font-medium flex items-center gap-1.5 anim-float-slow">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        LIVE
      </div>

      {/* Window */}
      <div className="relative glass-card rounded-2xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4-2-2.9-2-4z" />
                <circle cx="12" cy="11" r="9" />
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
        <div className="p-5 space-y-4">
          {/* Address bar */}
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

          {/* Inputs */}
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

          {/* Result tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            <ResultTile
              label="Rendement brut"
              value={`${rendBrut.toFixed(2)}%`}
              tone={rendBrut >= 6 ? 'good' : rendBrut >= 4 ? 'neutral' : 'warn'}
            />
            <ResultTile
              label="Cashflow / mois"
              value={`${cf >= 0 ? '+' : ''}${Math.round(cf)} €`}
              tone={cfNegative ? 'warn' : 'good'}
            />
            <ResultTile
              label="Score IA"
              value={`${score}/100`}
              tone={score >= 65 ? 'good' : score >= 45 ? 'neutral' : 'warn'}
            />
          </div>

          {/* Mini chart */}
          <MiniChart cf={cf} />

          {/* AI insight */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11.5px] font-medium text-emerald-200">
                Recommandation IA
              </p>
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
      <div className="absolute -bottom-3 -right-3 z-20 glass-card rounded-xl px-3 py-2 flex items-center gap-2 anim-float">
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
  )
}

function MiniInput({ label, value, slider }: { label: string; value: string; slider: React.ReactNode }) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <div className="text-[15px] font-semibold text-white tabular-nums">{value}</div>
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
      <div className="text-[15px] font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function MiniChart({ cf }: { cf: number }) {
  // Synthetic projection over 20 years
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
   LOGO STRIP (subtle social proof)
   ══════════════════════════════════════════════════════════════════════════ */
function LogoStrip() {
  const logos = ['Bpi France', 'Notaires.fr', 'PAP', 'SeLoger', 'Empruntis', 'MeilleursAgents']
  return (
    <section className="relative py-10 border-y border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <p className="text-center text-[11.5px] text-zinc-600 uppercase tracking-[0.18em] font-medium mb-6">
          Données et méthodes alignées avec
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-zinc-600 hover:text-zinc-400 transition-colors text-[15px] font-medium tracking-tight"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — EXPLICATION (3 blocs)
   ══════════════════════════════════════════════════════════════════════════ */
function ExplicationSection() {
  return (
    <section id="produit" className="relative py-28 lg:py-36">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        {/* Section title */}
        <div className="text-center max-w-2xl mx-auto mb-20 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            Comment ça marche
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Du bien à la décision,
            <br />
            <span className="text-zinc-500">en trois étapes.</span>
          </h2>
        </div>

        {/* 3 blocks */}
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

function ExpliBlock({
  num, title, subtitle, description, visual, reverse,
}: {
  num: string; title: string; subtitle: string; description: string; visual: React.ReactNode; reverse: boolean
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center reveal ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      {/* Text */}
      <div className="space-y-5">
        <div className="text-[11px] font-mono text-emerald-400 tracking-[0.2em]">{num} —</div>
        <h3 className="text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.03em] gt-white">
          {title}
        </h3>
        <p className="text-[16px] text-zinc-300 font-medium">{subtitle}</p>
        <p className="text-[15px] text-zinc-500 leading-[1.65] max-w-md">{description}</p>
      </div>
      {/* Visual */}
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
          <FieldChip label="Adresse" value="Lyon 2ᵉ" />
          <FieldChip label="Surface" value="68 m²" />
          <FieldChip label="Prix" value="245 000 €" />
          <FieldChip label="Loyer" value="1 180 €" />
        </div>
        <div className="h-px bg-white/[0.05]" />
        <div className="space-y-2">
          {[
            { label: 'Rendement brut', value: '5.78 %', color: 'text-emerald-300' },
            { label: 'Rendement net', value: '4.12 %', color: 'text-emerald-300' },
            { label: 'Cashflow/mois', value: '+128 €', color: 'text-emerald-300' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[12.5px]">
              <span className="text-zinc-500">{r.label}</span>
              <span className={`font-mono font-semibold ${r.color}`}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FieldChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <div className="text-[9.5px] text-zinc-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-[13px] text-white font-medium">{value}</div>
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
              <span className={`font-mono font-semibold ${r.tone === 'good' ? 'text-emerald-300' : 'text-red-300'}`}>
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
   SECTION 3 — FEATURES (minimal icons grid)
   ══════════════════════════════════════════════════════════════════════════ */
function FeaturesSection() {
  const features = [
    {
      title: 'Instantané',
      desc: 'Analyse complète en moins de 30 secondes — pas de tableur à remplir.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: 'Précis',
      desc: 'Données marché actualisées de 18 villes, méthode fiscale conforme 2026.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
        </svg>
      ),
    },
    {
      title: 'Simple',
      desc: 'Trois champs suffisent. Le reste se calibre tout seul.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
        </svg>
      ),
    },
    {
      title: 'Décisif',
      desc: 'Score d\'opportunité de 0 à 100 + recommandation IA en une phrase.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: 'Multi-scénarios',
      desc: 'Compare nu, meublé, colocation, saisonnier — sur un seul écran.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h18M3 16h18M9 4v16M15 4v16" />
        </svg>
      ),
    },
    {
      title: 'Exportable',
      desc: 'PDF présentation banque, Excel complet, partage par lien sécurisé.',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
        </svg>
      ),
    },
  ]

  return (
    <section id="features" className="relative py-28 lg:py-36 border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-16 reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11.5px] text-zinc-400 mb-5">
            Pourquoi Immolyse
          </div>
          <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.035em] gt-white">
            Conçu pour décider vite,
            <br />
            <span className="text-zinc-500">sans rien sacrifier.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden border border-white/[0.05] reveal reveal-d1">
          {features.map((f) => (
            <div key={f.title} className="group bg-[#0c0c0e] hover:bg-[#101013] p-7 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-emerald-300 mb-5 group-hover:border-emerald-500/25 group-hover:bg-emerald-500/[0.06] transition-all">
                {f.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-1.5 tracking-tight">{f.title}</h3>
              <p className="text-[13.5px] text-zinc-500 leading-[1.55]">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 4 — PRICING (3 plans, ultra clean)
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

          {/* Toggle */}
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
                      <span className="text-4xl font-semibold text-white tracking-tight">{price}</span>
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
   SECTION 5 — CTA FINAL
   ══════════════════════════════════════════════════════════════════════════ */
function CtaFinalSection({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden border-t border-white/[0.04]">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 50%, black 30%, transparent 80%)',
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 lg:px-10 text-center space-y-8 reveal">
        <h2 className="text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] gt-white">
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
            className="group inline-flex items-center gap-2 bg-white text-zinc-950 font-medium text-[15px] px-6 py-3.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_48px_-4px_rgba(255,255,255,0.45)] hover:-translate-y-0.5"
          >
            Commencer maintenant
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
   FOOTER (minimal)
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
