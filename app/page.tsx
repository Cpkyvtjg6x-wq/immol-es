'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/landing/Navbar'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'

/* ──────────────────────────────────────────────────────────────────────────────
   HOOKS
   ────────────────────────────────────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.06 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf: number
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return value
}

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const h = () => setY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return y
}

function useScrollProgress() {
  const [p, setP] = useState(0)
  useEffect(() => {
    const h = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  return p
}

function useInView<T extends HTMLElement>(opts: IntersectionObserverInit = { threshold: 0.1 }, once = true) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); if (once) obs.disconnect() }
      else if (!once) setInView(false)
    }, opts)
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [once])
  return [ref, inView] as const
}

/* ──────────────────────────────────────────────────────────────────────────────
   ATOMS
   ────────────────────────────────────────────────────────────────────────── */
function ScrollProgressBar() {
  const p = useScrollProgress()
  return <div className="scroll-progress" style={{ width: `${p * 100}%` }} />
}

/* Séparateur horizontal fin — même style Linear */
function Hr() {
  return <div className="border-t border-white/[0.06]" />
}

/* Label numéroté Linear — "1.0  Analyse →" */
function SectionLink({ num, label, href = '/analyse' }: { num: string; label: string; href?: string }) {
  return (
    <a
      href={href}
      className="section-num inline-flex items-center gap-2 transition-colors hover:text-white/65 group"
    >
      <span className="mono">{num}</span>
      <span>{label}</span>
      <svg
        className="w-3 h-3 transition-transform group-hover:translate-x-0.5 opacity-50"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </a>
  )
}

/* Grille sous-fonctionnalités numérotées */
function SubLinks({ items }: { items: Array<{ num: string; label: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
      {items.map((item) => (
        <a
          key={item.num}
          href="/analyse"
          className="flex items-center gap-2.5 text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors duration-200 group"
        >
          <span className="mono text-[11px] text-zinc-700 group-hover:text-zinc-500 transition-colors">{item.num}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </div>
  )
}

/* ProductFrame — fenêtre app avec chrome minimal */
function ProductFrame({
  children, className = '', url = 'immora.app/analyse', noChrome = false,
}: { children: React.ReactNode; className?: string; url?: string; noChrome?: boolean }) {
  return (
    <div
      className={`relative rounded-xl border border-white/[0.08] overflow-hidden bg-[#0d0d0e] ${className}`}
      style={{ boxShadow: '0 0 0 0.5px rgba(255,255,255,0.04), 0 40px 100px -20px rgba(0,0,0,0.8)' }}
    >
      {!noChrome && (
        <div className="flex items-center gap-2 px-4 h-10 border-b border-white/[0.05] bg-white/[0.008]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3a3a3c]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3a3a3c]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#3a3a3c]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.04]">
              <svg className="w-2.5 h-2.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="mono text-[10px] text-zinc-500">{url}</span>
            </div>
          </div>
          <div className="w-14" />
        </div>
      )}
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE ROOT
   ══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useReveal()
  const router = useRouter()
  const go = () => router.push('/analyse')
  const login = () => router.push('/auth/login')

  return (
    <div className="bg-[#09090b] text-white overflow-x-hidden selection:bg-emerald-500/30">
      <ScrollProgressBar />
      <Navbar />
      <HeroSection onCta={go} onLogin={login} />
      <Hr />
      <Section1Analyse />
      <Hr />
      <Section2Fiscalite />
      <Hr />
      <Section3Export />
      <Hr />
      <TestimonialsSection />
      <Hr />
      <PricingSection onSignup={go} />
      <Hr />
      <FaqSection />
      <CtaFinalSection onPrimary={go} />
      <FooterMinimal onLogin={login} />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   HERO — Layout Linear : titre gauche · description droite · screenshot fade
   ══════════════════════════════════════════════════════════════════════════ */
function HeroSection({ onCta, onLogin }: { onCta: () => void; onLogin: () => void }) {
  const scrollY = useScrollY()

  return (
    <section className="relative pt-28 lg:pt-36 overflow-hidden">
      {/* Tiny ambient — très discret */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none opacity-25"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.15), transparent 70%)', filter: 'blur(60px)' }} />
      <div className="noise absolute inset-0 pointer-events-none" />

      {/* ── 2-col header ── */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 reveal">
        <div className="grid lg:grid-cols-[1fr_480px] gap-12 lg:gap-20 items-end pb-14 lg:pb-20">

          {/* Gauche — titre */}
          <div>
            {/* Announcement pill */}
            <a href="/analyse"
              className="inline-flex items-center gap-2 mb-8 text-[12.5px] text-zinc-400 hover:text-zinc-200 transition-colors group"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span>Nouveau · Analyse IA</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">immora.app →</span>
            </a>

            <h1
              className="display-lg text-white"
              style={{ fontSize: 'clamp(2.8rem, 6vw, 5.4rem)', letterSpacing: '-0.05em', lineHeight: '1.0' }}
            >
              Le simulateur d&apos;investissement
              <br />immobilier.
            </h1>
          </div>

          {/* Droite — description + CTA */}
          <div className="flex flex-col justify-end gap-8 lg:pb-1">
            <p className="text-[17px] lg:text-[18px] text-zinc-400 leading-[1.65]">
              Rentabilité nette, cashflow mensuel, optimisation fiscale automatique — tout ce qu&apos;il faut pour investir avec précision.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onCta}
                className="group inline-flex items-center gap-2 bg-white text-[#09090b] text-[14px] font-semibold px-5 py-2.5 rounded-lg hover:-translate-y-px hover:shadow-[0_0_40px_-4px_rgba(255,255,255,0.3)] transition-all duration-300"
              >
                Commencer gratuitement
                <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button onClick={onLogin} className="text-[14px] text-zinc-500 hover:text-zinc-200 transition-colors px-4 py-2.5">
                Se connecter
              </button>
            </div>
            <p className="mono text-[11px] text-zinc-700 tracking-wider">Gratuit · Sans carte · Résultats en 30 secondes</p>
          </div>
        </div>
      </div>

      {/* ── Screenshot hero — full-width avec fade ── */}
      <div
        className="relative px-4 lg:px-10 screenshot-fade reveal reveal-d1"
        style={{ transform: `translateY(${scrollY * -0.03}px)` }}
      >
        <div className="max-w-[1320px] mx-auto">
          <ProductFrame url="immora.app/analyse · Lyon 2ᵉ · T3 · 68 m²">
            <HeroScreenshotContent />
          </ProductFrame>
        </div>
      </div>
    </section>
  )
}

/* ── Contenu screenshot hero ── */
function HeroScreenshotContent() {
  const [prix, setPrix] = useState(245000)
  const [loyer, setLoyer] = useState(1180)
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.05 })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000)
    return () => clearInterval(id)
  }, [])

  const result = calculateInvestment({ ...DEFAULT_PARAMS, prixAchat: prix, loyerNu: loyer, loyerMeuble: loyer, ville: 'Lyon' })
  const rendBrut = result.rendBrut
  const cf = result.cashflowMensuel
  const score = Math.min(95, Math.max(18, Math.round(
    (rendBrut >= 7 ? 26 : rendBrut >= 5 ? 18 : 12) +
    (result.rendNet >= 5 ? 17 : result.rendNet >= 3 ? 9 : 5) +
    (cf >= 200 ? 21 : cf >= 0 ? 17 : cf >= -200 ? 7 : 3) + 11
  ))) + (tick % 3 === 0 ? 1 : tick % 3 === 1 ? -1 : 0)

  return (
    <div ref={ref}>
      {/* App navbar interne */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.05] bg-white/[0.008]">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-[5px] bg-emerald-500 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
              </svg>
            </div>
            <span className="text-[13px] font-bold tracking-[-0.04em]">IMMO<span className="text-emerald-400">RA</span></span>
          </div>
          <div className="hidden sm:flex items-center gap-0.5">
            {['Analyse', 'Fiscalité', 'Scénarios', 'Export'].map((t, i) => (
              <button key={t} className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${i === 0 ? 'text-white bg-white/[0.07]' : 'text-zinc-500 hover:text-zinc-300'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/[0.09] border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-tick" />
            <span className="mono text-[10px] text-emerald-300 font-medium">Score {score}/100</span>
          </div>
          <button className="px-3.5 py-1.5 rounded-md bg-white text-[#09090b] text-[12px] font-semibold">Export PDF</button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-5 lg:p-7 space-y-4">
        {/* Address bar */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
            <circle cx="12" cy="11" r="3" />
          </svg>
          <span className="text-[13px] text-zinc-200">12 rue Vaubecour, 69002 Lyon</span>
          <span className="hidden md:block mono text-[10.5px] text-zinc-600 border-l border-white/[0.06] pl-3">T3 · 68 m² · Meublé</span>
          <span className="ml-auto hidden md:block mono text-[10.5px] text-emerald-400/80">Marché Lyon +1.2 pts</span>
        </div>

        {/* Layout 2 colonnes : sliders gauche / KPIs droite */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">

          {/* Inputs */}
          <div className="space-y-3">
            <SliderInput label="Prix d'achat" value={prix} display={formatCurrency(prix)}
              min={80000} max={600000} step={5000} onChange={setPrix} />
            <SliderInput label="Loyer mensuel" value={loyer} display={`${loyer.toLocaleString('fr-FR')} €/mois`}
              min={400} max={3500} step={20} onChange={setLoyer} />
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.12]">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {cf < -100 ? 'Cashflow négatif — LMNP réel recommandé, réduction fiscale de ~38%.' : 'Solide. Régime LMNP réel optimal sur 15 ans. Cashflow positif.'}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <KpiCard label="Rendement brut" value={`${rendBrut.toFixed(2)}%`} sub="annuel" />
              <KpiCard label="Rendement net" value={`${result.rendNet.toFixed(2)}%`} sub="après charges" tone="good" />
              <KpiCard label="Cashflow/mois" value={`${cf >= 0 ? '+' : ''}${Math.round(cf)} €`} sub="crédit+impôt" tone={cf >= 0 ? 'good' : 'warn'} />
              <KpiCard label="Régime optimal" value="LMNP réel" sub="+1 540 €/an" tone="em" />
            </div>
            {/* Chart patrimoine */}
            <PatrimoineChartCard cf={cf} inView={inView} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SliderInput({ label, value, display, min, max, step, onChange }: {
  label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.06] space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em]">{label}</span>
        <span className="text-[14px] font-semibold text-white tabular">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ ['--val' as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </div>
  )
}

function KpiCard({ label, value, sub, tone = 'neutral' }: { label: string; value: string; sub?: string; tone?: 'good' | 'neutral' | 'warn' | 'em' }) {
  const border = { good: 'border-white/[0.06]', neutral: 'border-white/[0.06]', warn: 'border-red-500/[0.18]', em: 'border-emerald-500/[0.22]' }[tone]
  const bg = { good: 'bg-white/[0.02]', neutral: 'bg-white/[0.02]', warn: 'bg-red-500/[0.04]', em: 'bg-emerald-500/[0.05]' }[tone]
  const color = { good: 'text-emerald-300', neutral: 'text-white', warn: 'text-red-300', em: 'text-emerald-300' }[tone]
  return (
    <div className={`p-3.5 rounded-xl border ${border} ${bg}`}>
      <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-2">{label}</div>
      <div className={`text-[18px] font-semibold tabular ${color}`}>{value}</div>
      {sub && <div className="mono text-[9px] text-zinc-600 mt-1.5">{sub}</div>}
    </div>
  )
}

function PatrimoineChartCard({ cf, inView }: { cf: number; inView: boolean }) {
  const years = 20
  const pts = Array.from({ length: years + 1 }, (_, i) => Math.max(0, cf * 12 * i + 900 * i * i * 0.5 + 20000))
  const mx = Math.max(...pts); const mn = Math.min(...pts)
  const w = 400; const h = 56
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${((i / years) * w).toFixed(1)} ${(h - ((p - mn) / (mx - mn || 1)) * h).toFixed(1)}`).join(' ')
  const area = `${d} L ${w} ${h} L 0 ${h} Z`
  return (
    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center justify-between mb-3">
        <span className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em]">Projection patrimoine · 20 ans</span>
        <span className="mono text-[11px] text-emerald-300 font-medium">+{Math.round(mx / 1000)}k €</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-14">
        <defs>
          <linearGradient id="pf-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pf-fill)" className={`chart-fill ${inView ? 'in-view' : ''}`} />
        <path d={d} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`chart-draw ${inView ? 'in-view' : ''}`} />
      </svg>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 1 — ANALYSER
   ══════════════════════════════════════════════════════════════════════════ */
function Section1Analyse() {
  return (
    <section className="relative">
      {/* Header 2-col */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-24 items-end mb-6 reveal">
          <h2 className="text-white" style={{ fontSize: 'clamp(2.2rem,5vw,4.2rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.02' }}>
            Analysez n&apos;importe quel bien.
            <br />En 30 secondes.
          </h2>
          <div className="flex flex-col gap-5 lg:pb-1">
            <p className="text-[16px] text-zinc-400 leading-[1.65]">
              Prix, surface, loyer estimé, ville. IMMORA calcule instantanément rendement brut, net, cashflow mensuel et score d&apos;opportunité — avec les données du marché local.
            </p>
            <SectionLink num="1.0" label="Analyse" href="/analyse" />
          </div>
        </div>
      </div>

      {/* Screenshot full-width avec fade */}
      <div className="px-4 lg:px-10 screenshot-fade-soft reveal reveal-d1">
        <div className="max-w-[1320px] mx-auto">
          <ProductFrame url="immora.app/analyse · Score 87/100 · Lyon 2ᵉ">
            <AnalyseScreenshot />
          </ProductFrame>
        </div>
      </div>

      {/* Sub-links */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-28 lg:pb-36 reveal reveal-d2">
        <SubLinks items={[
          { num: '1.1', label: 'Données de marché' },
          { num: '1.2', label: 'Score IA 0–100' },
          { num: '1.3', label: 'Multi-scénarios' },
          { num: '1.4', label: 'Comparaison biens' },
        ]} />
      </div>
    </section>
  )
}

function AnalyseScreenshot() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.05 })
  const score = useCountUp(87, 1800, inView)
  const circ = 2 * Math.PI * 52

  return (
    <div ref={ref} className="p-5 lg:p-7 space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: 'Rendement brut', v: '5.78%', d: '+1.2 vs marché Lyon' },
          { l: 'Rendement net-net', v: '4.12%', d: 'après impôt LMNP réel' },
          { l: 'Cashflow mensuel', v: '+128 €', d: 'crédit 20 ans · 3.8%', good: true },
          { l: 'Patrimoine · 20 ans', v: '+248 k€', d: 'cumul + appréciation', em: true },
        ].map((k) => (
          <div key={k.l} className={`p-4 rounded-xl border ${k.em ? 'bg-emerald-500/[0.06] border-emerald-500/[0.18]' : 'bg-white/[0.025] border-white/[0.06]'}`}>
            <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-2.5">{k.l}</div>
            <div className={`text-[21px] font-bold tabular ${k.em || k.good ? 'text-emerald-300' : 'text-white'}`}>{k.v}</div>
            <div className="mono text-[9px] text-zinc-600 mt-1.5">{k.d}</div>
          </div>
        ))}
      </div>

      {/* Chart + Score + Scénarios */}
      <div className="grid md:grid-cols-[1fr_200px_240px] gap-3">
        {/* Chart */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between mb-3">
            <span className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Projection patrimoine</span>
            <span className="flex items-center gap-1.5 mono text-[10px] text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-tick" />
              en temps réel
            </span>
          </div>
          <svg viewBox="0 0 400 72" preserveAspectRatio="none" className="w-full h-16">
            <defs>
              <linearGradient id="a1-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0 66 C 80 58 160 42 240 26 S 360 8 400 4 L 400 72 L 0 72 Z" fill="url(#a1-fill)" className={`chart-fill ${inView ? 'in-view' : ''}`} />
            <path d="M 0 66 C 80 58 160 42 240 26 S 360 8 400 4" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" className={`chart-draw ${inView ? 'in-view' : ''}`} />
          </svg>
          <div className="flex justify-between mt-2 mono text-[9px] text-zinc-700">
            {['Auj.', '5 ans', '10 ans', '15 ans', '20 ans'].map((l) => <span key={l}>{l}</span>)}
          </div>
        </div>

        {/* Score */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-3">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.05)" strokeWidth="5" fill="none" />
              <circle cx="60" cy="60" r="52" stroke="#34d399" strokeWidth="5" fill="none" strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={inView ? circ - (score / 100) * circ : circ}
                style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[34px] font-bold text-white tabular leading-none">{score}</div>
              <div className="mono text-[8.5px] text-zinc-600 uppercase tracking-wider mt-0.5">/100</div>
            </div>
          </div>
          <span className="mono text-[9.5px] text-zinc-500 uppercase tracking-wider">Score opportunité</span>
        </div>

        {/* Scénarios locatifs */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
          <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em] mb-3">Scénarios locatifs</div>
          <div className="space-y-1.5">
            {[
              { n: 'Nu', rd: '4.8', cf: '−120', best: false },
              { n: 'Meublé', rd: '6.2', cf: '+180', best: false },
              { n: 'Colocation', rd: '8.4', cf: '+540', best: true },
              { n: 'Saisonnier', rd: '9.1', cf: '+720', best: false },
            ].map((s) => (
              <div key={s.n} className={`flex justify-between items-center px-2.5 py-2 rounded-lg text-[11.5px] border ${s.best ? 'bg-emerald-500/[0.07] border-emerald-500/[0.18]' : 'bg-white/[0.02] border-white/[0.04]'}`}>
                <span className={`${s.best ? 'text-zinc-100' : 'text-zinc-400'}`}>{s.n}</span>
                <div className="flex items-center gap-3 mono">
                  <span className="text-zinc-400">{s.rd}%</span>
                  <span className={s.cf.startsWith('-') ? 'text-red-300' : 'text-emerald-300'}>{s.cf}€/m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.1]">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-[12px] text-zinc-400">
          <span className="text-emerald-200 font-medium">Recommandation IMMORA ·</span>{' '}
          Investissement équilibré. LMNP réel optimal — économie fiscale +14 040 €/an vs micro-foncier.
        </p>
        <span className="ml-auto hidden md:block mono text-[10px] text-zinc-700 whitespace-nowrap">Analyse en direct</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 2 — FISCALITÉ
   ══════════════════════════════════════════════════════════════════════════ */
function Section2Fiscalite() {
  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-24 items-end mb-6 reveal">
          <h2 className="text-white" style={{ fontSize: 'clamp(2.2rem,5vw,4.2rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.02' }}>
            Optimisez votre fiscalité,
            <br />automatiquement.
          </h2>
          <div className="flex flex-col gap-5 lg:pb-1">
            <p className="text-[16px] text-zinc-400 leading-[1.65]">
              L&apos;outil compare 10 régimes fiscaux en temps réel — LMNP, LMP, SCI IS/IR, micro-foncier, réel, SARL famille — et recommande celui qui maximise votre cashflow net après impôt.
            </p>
            <SectionLink num="2.0" label="Fiscalité" href="/analyse" />
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-10 screenshot-fade-soft reveal reveal-d1">
        <div className="max-w-[1320px] mx-auto">
          <ProductFrame url="immora.app/analyse/fiscalite · 10 régimes comparés">
            <FiscaliteScreenshot />
          </ProductFrame>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-28 lg:pb-36 reveal reveal-d2">
        <SubLinks items={[
          { num: '2.1', label: 'LMNP / LMP réel' },
          { num: '2.2', label: 'SCI IS / IR' },
          { num: '2.3', label: 'Travaux & DPE' },
          { num: '2.4', label: 'Avant / Après fiscal' },
        ]} />
      </div>
    </section>
  )
}

function FiscaliteScreenshot() {
  const rows = [
    { name: 'LMNP réel', net: 1540, pct: 100, best: true },
    { name: 'LMP réel', net: 1180, pct: 76 },
    { name: 'LMNP micro-BIC', net: 620, pct: 40 },
    { name: 'SCI à l\'IS', net: 340, pct: 22 },
    { name: 'SARL famille', net: 180, pct: 12 },
    { name: 'Indivision', net: 80, pct: 5 },
    { name: 'Réel foncier', net: -480, pct: 31, neg: true },
    { name: 'Micro-foncier', net: -1240, pct: 80, neg: true },
  ]

  return (
    <div className="p-5 lg:p-7 space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06]">
          <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-2">Régimes comparés</div>
          <div className="text-[28px] font-bold text-white tabular">10</div>
          <div className="mono text-[9px] text-zinc-600 mt-1">LMNP · LMP · SCI · Micro…</div>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.18]">
          <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-2">Économie max détectée</div>
          <div className="text-[28px] font-bold text-emerald-300 tabular">+14 040</div>
          <div className="mono text-[9px] text-emerald-600 mt-1">€ / an · LMNP vs micro</div>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.025] border border-white/[0.06]">
          <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-2">Régime recommandé</div>
          <div className="text-[20px] font-bold text-white">LMNP réel</div>
          <div className="mono text-[9px] text-zinc-600 mt-1">Optimal sur 15 ans</div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="grid md:grid-cols-[1fr_360px] gap-4">
        {/* Liste régimes */}
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const pos = !r.neg
            return (
              <div
                key={r.name}
                className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] overflow-hidden border ${r.best ? 'bg-emerald-500/[0.08] border-emerald-500/[0.25]' : 'bg-white/[0.02] border-white/[0.05]'}`}
                style={{ animation: `fade-in 0.4s cubic-bezier(0.16,1,0.3,1) ${i * 45}ms both` }}
              >
                <div
                  className={`absolute inset-y-0 left-0 opacity-15 rounded-xl ${pos ? 'bg-emerald-400' : 'bg-red-400'}`}
                  style={{ width: `${r.pct}%`, animation: `bar-grow-anim 0.9s cubic-bezier(0.16,1,0.3,1) ${i * 45 + 180}ms both` }}
                />
                <span className="relative flex items-center gap-2 text-zinc-100">
                  {r.best && <span className="mono text-[8px] text-emerald-300 bg-emerald-500/20 border border-emerald-500/25 px-1.5 py-0.5 rounded-md">OPTI</span>}
                  {r.name}
                </span>
                <span className={`relative mono font-semibold tabular text-[13px] ${pos ? 'text-emerald-200' : 'text-red-300'}`}>
                  {r.net >= 0 ? '+' : '−'}{Math.abs(r.net).toLocaleString('fr-FR')} €/m
                </span>
              </div>
            )
          })}
        </div>

        {/* Détail LMNP réel */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-3">
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Détail LMNP réel</span>
            <span className="mono text-[9.5px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded">Recommandé</span>
          </div>
          <div className="space-y-2">
            {[
              { l: 'Loyers bruts', v: '+14 160 €' },
              { l: 'Charges déductibles', v: '−3 820 €' },
              { l: 'Amortissements', v: '−7 280 €' },
              { l: 'Base imposable', v: '+3 060 €' },
              { l: 'Impôt (TMI 30%)', v: '−918 €' },
              { l: 'Prélèvements sociaux', v: '−0 €' },
            ].map((r) => (
              <div key={r.l} className="flex justify-between text-[12px] py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">{r.l}</span>
                <span className={`mono tabular font-medium ${r.v.startsWith('+') ? 'text-emerald-300' : r.v.startsWith('−') && r.v !== '−0 €' ? 'text-red-300' : 'text-zinc-300'}`}>{r.v}</span>
              </div>
            ))}
            <div className="flex justify-between text-[13px] pt-1">
              <span className="font-medium text-white">Cashflow net annuel</span>
              <span className="mono font-bold text-emerald-300">+18 480 €</span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-500">
            <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Économie vs micro-foncier : +14 040 €/an
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION 3 — EXPORT
   ══════════════════════════════════════════════════════════════════════════ */
function Section3Export() {
  return (
    <section className="relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 lg:py-32">
        <div className="grid lg:grid-cols-[1fr_420px] gap-12 lg:gap-24 items-end mb-6 reveal">
          <h2 className="text-white" style={{ fontSize: 'clamp(2.2rem,5vw,4.2rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.02' }}>
            Exportez le dossier
            <br />que votre banquier attend.
          </h2>
          <div className="flex flex-col gap-5 lg:pb-1">
            <p className="text-[16px] text-zinc-400 leading-[1.65]">
              Rapport PDF 12 pages, tableau d&apos;amortissement Excel 240 lignes. Format banker-ready, personnalisable avec votre logo. En un clic depuis l&apos;interface.
            </p>
            <SectionLink num="3.0" label="Export" href="/analyse" />
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-10 screenshot-fade-soft reveal reveal-d1">
        <div className="max-w-[1320px] mx-auto">
          <ProductFrame url="immora.app/rapport-bancaire.pdf · 12 pages · Lyon 2ᵉ T3">
            <ExportScreenshot />
          </ProductFrame>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-28 lg:pb-36 reveal reveal-d2">
        <SubLinks items={[
          { num: '3.1', label: 'Rapport PDF bancaire' },
          { num: '3.2', label: 'Excel amortissement' },
          { num: '3.3', label: 'White-label' },
          { num: '3.4', label: 'API partenaires' },
        ]} />
      </div>
    </section>
  )
}

function ExportScreenshot() {
  return (
    <div className="p-5 lg:p-7 space-y-5">
      {/* Doc header */}
      <div className="flex items-start justify-between p-4 rounded-xl bg-white/[0.025] border border-white/[0.06]">
        <div>
          <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-1.5">Dossier d&apos;investissement · Confidentiel</div>
          <div className="text-[18px] font-bold text-white">12 rue Vaubecour, 69002 Lyon</div>
          <div className="text-[13px] text-zinc-400 mt-1">T3 · 68 m² · Bail meublé · Valeur 245 000 €</div>
        </div>
        <div className="text-right flex-shrink-0 ml-8">
          <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.15em]">Édité le</div>
          <div className="text-[13px] text-zinc-300 font-medium mt-0.5">19 mai 2026</div>
          <div className="mt-2 flex items-center gap-1.5 mono text-[9.5px] text-emerald-300">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Validé IMMORA
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        {/* Left: chart + stats */}
        <div className="space-y-3">
          {/* Chart */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="flex items-center justify-between mb-3">
              <span className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Patrimoine projeté · 20 ans</span>
              <span className="mono text-[11px] text-emerald-300 font-medium">+248 k€</span>
            </div>
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-14">
              <defs>
                <linearGradient id="ex-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0 54 C 80 48 160 36 240 20 S 360 6 400 3 L 400 60 L 0 60 Z" fill="url(#ex-fill)" />
              <path d="M 0 54 C 80 48 160 36 240 20 S 360 6 400 3" fill="none" stroke="#34d399" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Rendement brut', v: '5.78%', c: 'em' },
              { l: 'Cashflow net', v: '+128 €', c: 'em' },
              { l: 'Régime optimal', v: 'LMNP', c: 'ind' },
              { l: 'Score', v: '87/100', c: 'em' },
            ].map((s) => (
              <div key={s.l} className={`p-2.5 rounded-lg text-center border ${s.c === 'em' ? 'bg-emerald-500/[0.06] border-emerald-500/15' : 'bg-indigo-500/[0.06] border-indigo-500/15'}`}>
                <div className="mono text-[8px] text-zinc-500 uppercase tracking-wider">{s.l}</div>
                <div className={`mono text-[13px] font-bold tabular mt-1 ${s.c === 'em' ? 'text-emerald-300' : 'text-indigo-300'}`}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Amortissement preview */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em] mb-2.5">Tableau d&apos;amortissement · Premières années</div>
            <div className="space-y-0">
              <div className="grid grid-cols-5 gap-2 text-center mono text-[9px] text-zinc-600 uppercase tracking-wider pb-1.5 border-b border-white/[0.05]">
                {['Année', 'Capital dû', 'Intérêts', 'Amort.', 'Solde'].map((h) => <span key={h}>{h}</span>)}
              </div>
              {[
                ['2026', '245 000', '784', '452', '244 548'],
                ['2027', '244 548', '778', '458', '244 090'],
                ['2028', '244 090', '772', '464', '243 626'],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 text-center mono text-[10px] py-1.5 border-b border-white/[0.03]">
                  {row.map((cell, j) => (
                    <span key={j} className={j === 0 ? 'text-zinc-400' : j === 4 ? 'text-zinc-200' : 'text-zinc-500'}>{cell}</span>
                  ))}
                </div>
              ))}
              <div className="mono text-[9px] text-zinc-700 text-center pt-1.5">240 lignes complètes dans l&apos;export Excel</div>
            </div>
          </div>
        </div>

        {/* Right: export files + verdict */}
        <div className="space-y-3">
          {/* Export files */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em] mb-3">Fichiers générés</div>
            <div className="space-y-2">
              {[
                { name: 'rapport-banque.pdf', sub: '12 pages · banker-ready', icon: 'red' },
                { name: 'amortissement.xlsx', sub: '240 lignes · complet', icon: 'green' },
                { name: 'analyse-fiscale.pdf', sub: '4 pages · comparatif', icon: 'indigo' },
              ].map((f) => (
                <div key={f.name} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.025] border border-white/[0.05] group hover:border-white/[0.1] transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${f.icon === 'red' ? 'bg-red-500/15 text-red-400' : f.icon === 'green' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/15 text-indigo-400'}`}>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-zinc-200 font-medium truncate">{f.name}</div>
                    <div className="mono text-[9.5px] text-zinc-600">{f.sub}</div>
                  </div>
                  <svg className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 py-2.5 rounded-lg bg-white text-[#09090b] text-[13px] font-bold hover:bg-zinc-100 transition-colors">
              Télécharger tout (3 fichiers)
            </button>
          </div>

          {/* Verdict bancaire */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em] mb-3">Verdict bancaire</div>
            <div className="space-y-2">
              {[
                { l: 'Ratio d\'endettement', v: '28%', ok: true, max: '35%' },
                { l: 'Apport personnel', v: '15%', ok: true, min: '10%' },
                { l: 'Cashflow net', v: '+128€/m', ok: true },
                { l: 'Score crédit', v: 'Bon (B+)', ok: true },
              ].map((r) => (
                <div key={r.l} className="flex items-center justify-between text-[12px]">
                  <span className="text-zinc-400">{r.l}</span>
                  <div className="flex items-center gap-2">
                    <span className="mono font-medium text-zinc-200">{r.v}</span>
                    <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2 text-[11.5px]">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-200 font-medium">Dossier solide</span>
              <span className="text-zinc-500">· Prêt à soumettre à la banque</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   TESTIMONIALS — marquee épuré
   ══════════════════════════════════════════════════════════════════════════ */
function TestimonialsSection() {
  const items = [
    { name: 'Antoine M.', role: 'Investisseur · 7 biens', quote: 'J\'ai économisé 14 000€/an en basculant en LMNP, alors que mon comptable jurait que le micro-foncier était optimal. IMMORA a vu juste en 30 secondes.', result: '+14 000 €/an', color: '#10b981' },
    { name: 'Sophie T.', role: 'Première acquisition', quote: 'J\'allais signer un T2 à Bordeaux que je croyais rentable. L\'outil m\'a montré un cashflow réel de −230€/mois. J\'ai évité une catastrophe financière.', result: 'Décision évitée', color: '#6366f1' },
    { name: 'Mehdi R.', role: 'CGP indépendant', quote: '3 analyses par jour pour mes clients. Avant : 1h chacune sur Excel. Maintenant : 30 secondes avec un PDF white-label. La différence est incomparable.', result: '×120 plus rapide', color: '#ec4899' },
    { name: 'Julie B.', role: 'Investisseuse · 3 biens', quote: 'Le score IA m\'a révélé qu\'un de mes biens sous-performait à cause du régime fiscal. 4 800€/an récupérés après un simple changement.', result: '+4 800 €/an', color: '#f59e0b' },
    { name: 'Thomas L.', role: 'Agent immobilier', quote: 'Je l\'utilise en rendez-vous avec mes acheteurs. Ça crée une confiance immédiate et un niveau de sérieux que mes concurrents n\'ont pas. Mon taux de conversion a doublé.', result: '×2 conversion', color: '#06b6d4' },
  ]
  const all = [...items, ...items]

  return (
    <section className="py-24 lg:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mb-16 reveal">
        <div className="grid lg:grid-cols-2 gap-8 items-end">
          <h2 className="text-white" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.02' }}>
            Des décisions, pas des promesses.
          </h2>
          <p className="text-[16px] text-zinc-400 leading-[1.65]">
            Ce que disent celles et ceux qui utilisent IMMORA pour investir.
          </p>
        </div>
      </div>

      <div className="marquee reveal">
        <div className="marquee-track">
          {all.map((t, i) => (
            <div
              key={i}
              className="w-[380px] flex-shrink-0 rounded-xl p-6 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.11] transition-colors duration-300"
            >
              <p className="text-[15.5px] text-zinc-200 leading-[1.55] mb-5 min-h-[88px]">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white flex-shrink-0"
                    style={{ background: t.color }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-white">{t.name}</div>
                    <div className="mono text-[10px] text-zinc-500">{t.role}</div>
                  </div>
                </div>
                <div className="mono text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 px-2 py-1 rounded-md">{t.result}</div>
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
    { name: 'Découverte', price: { m: 0, a: 0 }, desc: 'Pour découvrir l\'outil', features: ['Analyse express', '3 simulations sauvegardées', 'Export PDF (filigrane)', 'Données marché basiques'], cta: 'Commencer gratuitement', featured: false },
    { name: 'Pro', price: { m: 29, a: 19 }, desc: 'Pour investir sérieusement', features: ['Simulations illimitées', '10 régimes fiscaux', 'Analyse IA avancée', 'Export PDF & Excel pro', 'Comparaison multi-biens', 'Support prioritaire'], cta: 'Essai 14 jours gratuit', featured: true },
    { name: 'Agence', price: { m: 79, a: 59 }, desc: 'Pour les pros de l\'immobilier', features: ['Tout le plan Pro', 'Jusqu\'à 5 sièges', 'Rapports white-label', 'Accès API', 'Onboarding dédié'], cta: 'Contacter l\'équipe', featured: false },
  ]

  return (
    <section id="pricing" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-16 reveal">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-end mb-10">
            <h2 className="text-white" style={{ fontSize: 'clamp(2rem,4vw,3.5rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.02' }}>
              Simple. Honnête. Sans surprise.
            </h2>
            {/* Toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.07] self-end">
              <button onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${!annual ? 'bg-white text-[#09090b]' : 'text-zinc-400 hover:text-white'}`}>
                Mensuel
              </button>
              <button onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-2 transition-all ${annual ? 'bg-white text-[#09090b]' : 'text-zinc-400 hover:text-white'}`}>
                Annuel
                <span className={`mono text-[10px] px-1.5 py-0.5 rounded ${annual ? 'bg-emerald-500/15 text-emerald-700' : 'bg-emerald-500/15 text-emerald-300'}`}>−35%</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 max-w-5xl reveal reveal-d1">
          {plans.map((plan) => {
            const price = annual ? plan.price.a : plan.price.m
            return (
              <div key={plan.name}
                className={`relative rounded-xl p-8 border transition-all duration-300 ${plan.featured ? 'bg-white/[0.03] border-white/[0.16]' : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12]'}`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex px-3 py-1 rounded-full bg-white text-[#09090b] mono text-[10px] font-bold uppercase tracking-wider">
                    Le plus choisi
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-[15px] font-semibold text-white mb-1">{plan.name}</h3>
                  <p className="text-[12.5px] text-zinc-500">{plan.desc}</p>
                </div>
                <div className="mb-6">
                  {price === 0
                    ? <div style={{ fontSize: '44px', fontWeight: 700, letterSpacing: '-0.05em' }} className="text-white">Gratuit</div>
                    : <div className="flex items-baseline gap-1">
                      <span style={{ fontSize: '44px', fontWeight: 700, letterSpacing: '-0.05em' }} className="text-white tabular">{price}</span>
                      <span className="text-zinc-500 text-[14px]">€/mois</span>
                    </div>
                  }
                  {annual && price > 0 && <p className="mono text-[11px] text-zinc-600 mt-1.5">Facturé {price * 12}€/an</p>}
                </div>
                <button onClick={onSignup}
                  className={`w-full text-[13.5px] font-semibold py-2.5 rounded-lg transition-all mb-6 ${plan.featured ? 'bg-white text-[#09090b] hover:bg-zinc-100 hover:shadow-[0_0_30px_-4px_rgba(255,255,255,0.3)]' : 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08]'}`}>
                  {plan.cta}
                </button>
                <div className="space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                      <svg className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
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
        <p className="mono text-[11px] text-zinc-700 mt-10 tracking-wider">Paiement Stripe sécurisé · Résiliable à tout moment · TVA incluse</p>
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
    { q: 'Faut-il être expert en fiscalité immobilière ?', a: 'Non. L\'outil est conçu pour vous donner une réponse claire sans connaissance préalable. L\'IA traduit chaque chiffre en recommandation lisible.' },
    { q: 'D\'où viennent les données de marché ?', a: 'Sources publiques (DVF, MeilleursAgents, Notaires.fr, INSEE) mises à jour mensuellement. 18 villes et 44 quartiers couverts.' },
    { q: 'Mes données sont-elles confidentielles ?', a: 'Oui. Simulations chiffrées AES-256, stockées en Europe (Supabase Frankfurt). Jamais partagées avec des tiers. Conforme RGPD.' },
    { q: "L'analyse tient-elle compte de ma situation personnelle ?", a: 'Oui : TMI, situation matrimoniale, biens existants, autres revenus locatifs. Plus les informations sont précises, plus la recommandation est juste.' },
    { q: 'Puis-je résilier à tout moment ?', a: 'Oui, en un clic depuis votre compte. Sans engagement, sans pénalité. Remboursement au prorata.' },
    { q: "Est-ce que ça remplace mon comptable ?", a: "Non — c'est un outil d'analyse pour décider vite. Pour la déclaration, un expert reste recommandé. IMMORA vous prépare un dossier propre à lui soumettre." },
  ]

  return (
    <section className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-[340px_1fr] gap-16 lg:gap-24">
          <div className="reveal">
            <h2 className="text-white mb-4" style={{ fontSize: 'clamp(1.8rem,3.5vw,3rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.05' }}>
              Questions fréquentes.
            </h2>
            <p className="text-[15px] text-zinc-500 leading-[1.65]">
              Tout ce qu&apos;on nous demande avant de commencer.
            </p>
          </div>

          <div className="space-y-2 reveal reveal-d1">
            {faqs.map((f, i) => (
              <div key={i}
                className={`rounded-xl border transition-all duration-300 ${open === i ? 'acc-open bg-white/[0.03] border-white/[0.1]' : 'bg-white/[0.015] border-white/[0.05] hover:border-white/[0.1]'}`}>
                <button onClick={() => setOpen(open === i ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
                  <span className="text-[14px] font-medium text-white">{f.q}</span>
                  <svg className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="acc-content">
                  <div><p className="px-5 pb-4 text-[13.5px] text-zinc-400 leading-[1.7]">{f.a}</p></div>
                </div>
              </div>
            ))}
          </div>
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
    <section className="relative py-36 lg:py-52 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] pointer-events-none opacity-30 anim-breathe"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.14), transparent)', filter: 'blur(80px)' }} />
      <div className="noise absolute inset-0 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 border-t border-white/[0.06]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 reveal">
        <div className="grid lg:grid-cols-2 gap-12 items-end">
          <h2 className="text-white" style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: '1.0' }}>
            Votre prochain investissement commence ici.
          </h2>
          <div className="flex flex-col gap-8 lg:pb-2">
            <p className="text-[17px] text-zinc-400 leading-[1.65]">
              Analysez un bien en 30 secondes. Gratuit, sans inscription. Sans tableur.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={onPrimary}
                className="group inline-flex items-center gap-2 bg-white text-[#09090b] text-[15px] font-bold px-6 py-3.5 rounded-lg hover:-translate-y-px hover:shadow-[0_0_50px_-4px_rgba(255,255,255,0.4)] transition-all duration-300">
                Commencer maintenant
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
            <p className="mono text-[11px] text-zinc-700 tracking-wider">Aucune carte requise · Résultats en 30 secondes</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════════════════════ */
function FooterMinimal({ onLogin }: { onLogin: () => void }) {
  return (
    <footer className="border-t border-white/[0.06] py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-[5px] bg-emerald-500 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </div>
          <span className="text-[13.5px] font-bold tracking-[-0.04em]">IMMO<span className="text-emerald-400">RA</span></span>
          <span className="mono text-[11px] text-zinc-700 ml-1">© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          {['CGU', 'Confidentialité', 'Contact'].map((l) => (
            <a key={l} href="#" className="text-[12.5px] text-zinc-600 hover:text-zinc-300 transition-colors">{l}</a>
          ))}
          <button onClick={onLogin} className="text-[12.5px] text-zinc-500 hover:text-zinc-200 transition-colors">
            Se connecter
          </button>
        </div>
      </div>
    </footer>
  )
}
