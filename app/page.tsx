'use client'

import { useEffect, useRef, useState, useCallback, RefObject } from 'react'
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
      { threshold: 0.12 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

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

function useScrollY() {
  const [y, setY] = useState(0)
  useEffect(() => {
    const h = () => setY(window.scrollY)
    h()
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
      setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0)
    }
    h()
    window.addEventListener('scroll', h, { passive: true })
    window.addEventListener('resize', h)
    return () => {
      window.removeEventListener('scroll', h)
      window.removeEventListener('resize', h)
    }
  }, [])
  return p
}

function useMouseParallax(intensity = 1) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const h = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth - 0.5) * intensity,
        y: (e.clientY / window.innerHeight - 0.5) * intensity,
      })
    }
    window.addEventListener('mousemove', h, { passive: true })
    return () => window.removeEventListener('mousemove', h)
  }, [intensity])
  return pos
}

function useInView<T extends HTMLElement>(opts: IntersectionObserverInit = { threshold: 0.2 }, once = true) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        if (once) obs.disconnect()
      } else if (!once) {
        setInView(false)
      }
    }, opts)
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [once])
  return [ref, inView] as const
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
    <div className="bg-page text-white overflow-x-hidden selection:bg-emerald-500/30">
      <ScrollProgressBar />
      <Navbar />

      <HeroSection onPrimary={goAnalyse} onSecondary={goLogin} />
      <Divider />
      <StatsStrip />
      <Divider />
      <BentoFeatures />
      <Divider />
      <ComparisonSection />
      <Divider />
      <PersonasSection onCta={goAnalyse} />
      <Divider />
      <ExplicationSection />
      <Divider />
      <TestimonialsSection />
      <Divider />
      <PricingSection onSignup={goAnalyse} />
      <Divider />
      <FaqSection />
      <CtaFinalSection onPrimary={goAnalyse} />
      <FooterMinimal />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   SCROLL PROGRESS BAR
   ────────────────────────────────────────────────────────────────────────── */
function ScrollProgressBar() {
  const p = useScrollProgress()
  return <div className="scroll-progress" style={{ width: `${p * 100}%` }} />
}

/* ──────────────────────────────────────────────────────────────────────────────
   SHARED
   ────────────────────────────────────────────────────────────────────────── */
function Divider() {
  return (
    <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
      <div className="section-divider" />
    </div>
  )
}

function SectionLabel({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div className="section-label">
      <span className="text-emerald-400/80">{num}</span>
      <span>{children}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SECTION — HERO (parallax mouse + scroll, particles, word reveal)
   ══════════════════════════════════════════════════════════════════════════ */
function HeroSection({ onPrimary, onSecondary }: { onPrimary: () => void; onSecondary: () => void }) {
  const m = useMouseParallax(30)
  const scrollY = useScrollY()
  const heroFade = Math.max(0, 1 - scrollY / 700)

  // Headline words with stagger
  const words1 = ['L\'analyse']
  const words2 = ['immobilière,']
  const accentWord = 'redessinée.'

  return (
    <section className="relative pt-36 lg:pt-44 pb-24 lg:pb-32 overflow-hidden">
      {/* Background — mouse parallax + scroll parallax */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: heroFade }}>
        <div
          className="glow-em anim-breathe"
          style={{
            top: '-200px',
            left: '50%',
            transform: `translate3d(calc(-50% + ${m.x}px), ${scrollY * 0.15 + m.y}px, 0)`,
            transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
        <div
          className="glow-indigo"
          style={{
            top: '20%',
            right: '-10%',
            transform: `translate3d(${-m.x * 0.8}px, ${scrollY * 0.25 + -m.y * 0.8}px, 0)`,
            transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
        <div className="specks opacity-60" style={{ transform: `translateY(${scrollY * 0.1}px)` }} />
        <div className="noise" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0b]" />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="particle drift-1" style={{ top: '70%', left: '15%' }} />
          <div className="particle drift-2" style={{ top: '85%', left: '55%' }} />
          <div className="particle drift-3" style={{ top: '78%', left: '75%' }} />
          <div className="particle drift-1" style={{ top: '88%', left: '35%', animationDelay: '4s' }} />
          <div className="particle drift-2" style={{ top: '92%', left: '85%', animationDelay: '7s' }} />
          <div className="particle drift-3" style={{ top: '80%', left: '8%', animationDelay: '9s' }} />
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-20 items-center">
          {/* LEFT — Copy */}
          <div className="space-y-10 lg:max-w-xl">
            <a
              href="#features"
              className="group inline-flex items-center gap-2.5 text-[11.5px] mono uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors anim-fadein"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span>Nouveau · Analyse IA</span>
              <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            <h1 className="display-lg text-[clamp(3rem,6.5vw,5.6rem)]">
              <span className="word-reveal gt-white" style={{ animationDelay: '0ms' }}>L'analyse</span>{' '}
              <br />
              <span className="word-reveal gt-white" style={{ animationDelay: '120ms' }}>immobilière,</span>
              <br />
              <span className="word-reveal serif-italic text-emerald-300/95" style={{ animationDelay: '260ms' }}>
                redessinée.
              </span>
            </h1>

            <p className="text-[17px] lg:text-[18.5px] text-zinc-400 leading-[1.55] max-w-[500px] anim-fadein" style={{ animationDelay: '420ms', animationFillMode: 'both' }}>
              Rentabilité, cashflow, fiscalité optimale.<br className="hidden sm:block" />
              Trois chiffres. Trente secondes. Une décision.
            </p>

            <div className="flex flex-wrap items-center gap-3 anim-fadein" style={{ animationDelay: '540ms', animationFillMode: 'both' }}>
              <button
                onClick={onPrimary}
                className="group relative inline-flex items-center gap-2 bg-white text-zinc-950 text-[14px] font-medium px-5 py-3 rounded-lg transition-all duration-300 hover:shadow-[0_0_42px_-4px_rgba(255,255,255,0.45)] hover:-translate-y-0.5"
              >
                <span className="absolute -inset-px rounded-lg bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
                <span className="relative">Commencer une analyse</span>
                <svg className="relative w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <button
                onClick={onSecondary}
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-white text-[14px] font-medium px-5 py-3 rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.025] transition-all duration-300"
              >
                Se connecter
              </button>
            </div>

            <div className="flex items-center gap-3 pt-1 anim-fadein" style={{ animationDelay: '660ms', animationFillMode: 'both' }}>
              <div className="flex -space-x-1.5">
                {['#10b981', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4'].map((c, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-[#0a0a0b] flex items-center justify-center text-[9px] font-medium text-white"
                    style={{ background: `linear-gradient(135deg, ${c}, ${c}99)` }}
                  >
                    {['A', 'M', 'S', 'T', 'J'][i]}
                  </div>
                ))}
              </div>
              <p className="text-[12.5px] text-zinc-500">
                <span className="text-zinc-300 font-medium">1 200+</span> investisseurs nous font confiance
              </p>
            </div>
          </div>

          {/* RIGHT — Product preview with subtle scroll movement */}
          <div className="relative anim-fadein-slow" style={{ transform: `translateY(${scrollY * -0.05}px)` }}>
            <ProductPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────────
   PRODUCT PREVIEW (live ticker + tilt)
   ────────────────────────────────────────────────────────────────────────── */
function ProductPreview() {
  const wrap = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'analyse' | 'fiscalite' | 'comparer'>('analyse')
  const [prix, setPrix] = useState(245000)
  const [loyer, setLoyer] = useState(1180)
  const [tick, setTick] = useState(0)

  // Live ticker — subtle fluctuation every 4s
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4200)
    return () => clearInterval(id)
  }, [])

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
  // Score with subtle variation
  const baseScore = Math.min(100, Math.max(0, Math.round(rendBrut * 11 + (cf > 0 ? 18 : -5))))
  const score = baseScore + (tick % 3 === 0 ? 1 : tick % 3 === 1 ? -1 : 0)

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!wrap.current) return
    const r = wrap.current.getBoundingClientRect()
    const cx = (e.clientX - r.left) / r.width
    const cy = (e.clientY - r.top) / r.height
    const ry = (cx - 0.5) * 7
    const rx = -(cy - 0.5) * 7
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
      <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/20 via-transparent to-indigo-500/15 rounded-3xl blur-3xl opacity-70 anim-breathe" />

      <div ref={wrap} className="tilt-3d relative">
        <div className="tilt-layer-3 absolute -top-3 -left-3 z-20 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full px-2.5 py-1 mono text-[10px] font-medium text-emerald-300 flex items-center gap-1.5 tracking-[0.15em] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-tick" />
          Live
        </div>

        <div className="relative glass-card rounded-2xl overflow-hidden shadow-[0_50px_120px_-30px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-black/30">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] mono text-[10px] text-zinc-500">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="11" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-2 4-2 4-2-2.9-2-4z" />
                </svg>
                immolyse.app/analyse
              </div>
            </div>
            <div className="w-12" />
          </div>

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

          <div className="tilt-layer-1 p-5 space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/[0.05]">
              <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0L6.343 16.657a8 8 0 1111.314 0z" />
                <circle cx="12" cy="11" r="3" />
              </svg>
              <span className="text-[12.5px] text-zinc-300 truncate flex-1">12 rue Vaubecour, 69002 Lyon</span>
              <span className="mono text-[10px] text-emerald-400">T3 · 68m²</span>
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
              <ResultTile label="Rendement" value={`${rendBrut.toFixed(2)}%`} tone={rendBrut >= 6 ? 'good' : rendBrut >= 4 ? 'neutral' : 'warn'} />
              <ResultTile label="Cashflow" value={`${cf >= 0 ? '+' : ''}${Math.round(cf)}€`} tone={cfNegative ? 'warn' : 'good'} />
              <ResultTile label="Score IA" value={`${score}`} tone={score >= 65 ? 'good' : score >= 45 ? 'neutral' : 'warn'} pulse />
            </div>

            <MiniChart cf={cf} />

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="space-y-0.5">
                <p className="text-[11.5px] font-medium text-emerald-200">Recommandation IA</p>
                <p className="text-[11.5px] text-zinc-400 leading-relaxed">
                  {cfNegative
                    ? 'Cashflow négatif. Passage en LMNP recommandé pour réduire de ~38% l\'imposition.'
                    : 'Investissement équilibré. Régime LMNP optimal pour les 12 premières années.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="tilt-layer-2 absolute -bottom-3 -right-3 z-20 glass-card rounded-xl px-3 py-2 flex items-center gap-2 anim-float">
          <div className="w-7 h-7 rounded-md bg-red-500/15 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[11px] font-medium text-white">rapport.pdf</div>
            <div className="text-[9.5px] text-zinc-500 mono">prêt</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniInput({ label, value, slider }: { label: string; value: string; slider: React.ReactNode }) {
  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <span className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.15em] font-medium">{label}</span>
      <div className="text-[15px] font-medium text-white tabular">{value}</div>
      {slider}
    </div>
  )
}

function ResultTile({ label, value, tone, pulse = false }: { label: string; value: string; tone: 'good' | 'neutral' | 'warn'; pulse?: boolean }) {
  const colors = {
    good: 'text-emerald-300 bg-emerald-500/[0.04] border-emerald-500/15',
    neutral: 'text-amber-300 bg-amber-500/[0.04] border-amber-500/15',
    warn: 'text-red-300 bg-red-500/[0.04] border-red-500/15',
  }[tone]
  return (
    <div className={`p-2.5 rounded-lg border ${colors} relative overflow-hidden`}>
      {pulse && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-60 live-tick" />
      )}
      <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.15em] font-medium mb-1">{label}</div>
      <div className="text-[15px] font-medium tabular">{value}</div>
    </div>
  )
}

function MiniChart({ cf }: { cf: number }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 })
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
    <div ref={ref} className="px-2.5 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.15em] font-medium">Patrimoine · 20 ans</span>
        <span className="mono text-[11px] text-emerald-300 font-medium">+{(max / 1000).toFixed(0)}k €</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-12">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#chart-fill)" className={`chart-fill ${inView ? 'in-view' : ''}`} />
        <path d={d} fill="none" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={`chart-draw ${inView ? 'in-view' : ''}`} />
      </svg>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATS STRIP
   ══════════════════════════════════════════════════════════════════════════ */
function StatsStrip() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 })
  const v1 = useCountUp(12547, 1800, inView)
  const v2 = useCountUp(34, 1500, inView)
  const v3 = useCountUp(49, 1500, inView)
  const v4 = useCountUp(98, 1500, inView)

  return (
    <section ref={ref} className="relative py-20 lg:py-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 space-y-10">
        {/* 4 chiffres clés */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-8">
          <Stat value={`${v1.toLocaleString('fr-FR')}`} suffix="" label="Biens analysés" />
          <Stat value={`${v2}`} suffix=" M€" label="Économies fiscales détectées" />
          <Stat value={`${(v3 / 10).toFixed(1)}`} suffix="/5" label="Note utilisateurs" />
          <Stat value={`${v4}`} suffix="%" label="Décisions plus rapides" />
        </div>

        {/* Live activity panel */}
        <LiveActivityPanel inView={inView} />
      </div>
    </section>
  )
}

function Stat({ value, suffix, label }: { value: string; suffix: string; label: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="display text-[clamp(2rem,3.5vw,2.8rem)] tabular gt-white">
        {value}<span className="serif-italic text-emerald-300 ml-0.5">{suffix}</span>
      </div>
      <div className="mono text-[10.5px] text-zinc-500 mt-2 uppercase tracking-[0.18em]">{label}</div>
    </div>
  )
}

function LiveActivityPanel({ inView }: { inView: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => setTick((t) => t + 1), 2400)
    return () => clearInterval(id)
  }, [inView])

  // Rotating list of recent analyses
  const analyses = [
    { city: 'Lyon 2ᵉ', price: '245 k€', score: 87, tone: 'good' as const },
    { city: 'Paris 11ᵉ', price: '480 k€', score: 62, tone: 'neutral' as const },
    { city: 'Marseille', price: '180 k€', score: 91, tone: 'good' as const },
    { city: 'Bordeaux', price: '320 k€', score: 54, tone: 'neutral' as const },
    { city: 'Nantes', price: '215 k€', score: 78, tone: 'good' as const },
    { city: 'Toulouse', price: '195 k€', score: 84, tone: 'good' as const },
    { city: 'Lille', price: '165 k€', score: 89, tone: 'good' as const },
  ]
  const visible = Array.from({ length: 4 }, (_, i) => analyses[(tick + i) % analyses.length])

  // Sparkline data — synthetic "today's activity"
  const sparkPoints = Array.from({ length: 24 }, (_, i) => {
    return 30 + Math.sin(i * 0.6 + tick * 0.3) * 10 + Math.cos(i * 0.3) * 6 + (i / 24) * 20
  })
  const sparkW = 600
  const sparkH = 60
  const max = Math.max(...sparkPoints)
  const min = Math.min(...sparkPoints)
  const sparkD = sparkPoints
    .map((p, i) => {
      const x = (i / (sparkPoints.length - 1)) * sparkW
      const y = sparkH - ((p - min) / (max - min || 1)) * sparkH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div className="reveal reveal-d2 grid lg:grid-cols-[1.4fr_1fr] gap-3 rounded-2xl bg-gradient-to-b from-white/[0.02] to-white/[0.005] border border-white/[0.05] overflow-hidden">
      {/* Left: Sparkline — Activity today */}
      <div className="relative p-6 lg:p-7 border-b lg:border-b-0 lg:border-r border-white/[0.05]">
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-1">
            <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Activité aujourd'hui</div>
            <div className="flex items-baseline gap-2">
              <span className="display text-[28px] text-white tabular">847</span>
              <span className="serif-italic text-emerald-300 text-sm">analyses</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-tick" />
            <span className="mono text-[10px] text-emerald-300 uppercase tracking-wider">en ligne</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" className="w-full h-16">
          <defs>
            <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${sparkD} L ${sparkW} ${sparkH} L 0 ${sparkH} Z`} fill="url(#spark-fill)" className={`chart-fill ${inView ? 'in-view' : ''}`} />
          <path d={sparkD} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" className={`chart-draw ${inView ? 'in-view' : ''}`} />
        </svg>

        <div className="flex justify-between mt-2 mono text-[9.5px] text-zinc-600 tracking-wider">
          <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>maintenant</span>
        </div>
      </div>

      {/* Right: Live feed of analyses */}
      <div className="p-6 lg:p-7">
        <div className="flex items-center justify-between mb-4">
          <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Dernières analyses</div>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          {visible.map((a, i) => (
            <div
              key={`${a.city}-${tick}-${i}`}
              className="flex items-center gap-3 px-2.5 py-2 rounded-md bg-white/[0.02] border border-white/[0.04]"
              style={{
                animation: `fade-in 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                opacity: 1 - i * 0.18,
              }}
            >
              <span className="mono text-[10px] text-zinc-600 w-4">{i === 0 ? '●' : ''}</span>
              <span className="text-[12px] text-zinc-200 flex-1">{a.city}</span>
              <span className="mono text-[10.5px] text-zinc-500 tabular">{a.price}</span>
              <span className={`mono text-[10.5px] tabular font-medium ${
                a.tone === 'good' ? 'text-emerald-300' : 'text-amber-300'
              }`}>
                {a.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   BENTO FEATURES
   ══════════════════════════════════════════════════════════════════════════ */
function BentoFeatures() {
  return (
    <section id="features" className="relative py-32 lg:py-40">
      <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-20 reveal">
          <SectionLabel num="01">Fonctionnalités</SectionLabel>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Une boîte à outils complète,<br />
            <span className="serif-italic text-zinc-400">pensée comme un produit.</span>
          </h2>
          <p className="text-[15.5px] text-zinc-500 leading-[1.6] mt-6 max-w-lg">
            Tout ce dont un investisseur immobilier a besoin — sans tableur, sans approximation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 reveal reveal-d1">
          <BentoCell className="md:col-span-2 md:row-span-2 min-h-[440px]">
            <div className="flex flex-col h-full justify-between">
              <div>
                <Eyebrow>Score IA · GPT-4</Eyebrow>
                <h3 className="display text-[clamp(1.5rem,2.4vw,2.2rem)] gt-white mt-4 max-w-md">
                  Un score d'opportunité de 0 à 100, <span className="serif-italic text-zinc-400">expliqué en une phrase.</span>
                </h3>
                <p className="text-[13.5px] text-zinc-500 mt-3 max-w-md leading-[1.6]">
                  L'IA pondère rendement, cashflow, fiscalité et marché local. Une réponse claire : foncez ou passez votre tour.
                </p>
              </div>
              <BentoScoreDial />
            </div>
          </BentoCell>

          <BentoCell className="md:row-span-2 min-h-[440px]">
            <Eyebrow>Fiscalité</Eyebrow>
            <h3 className="display text-[19px] gt-white mt-4">
              10 régimes <span className="serif-italic text-zinc-400">comparés.</span>
            </h3>
            <p className="text-[12.5px] text-zinc-500 mt-2 leading-[1.55]">
              LMNP, LMP, SCI IS/IR, micro-foncier, réel, SARL de famille, indivision...
            </p>
            <BentoFiscalList />
          </BentoCell>

          <BentoCell>
            <Eyebrow>Marché</Eyebrow>
            <h3 className="display text-[17px] gt-white mt-3">
              18 villes, 44 <span className="serif-italic text-zinc-400">quartiers.</span>
            </h3>
            <BentoCityList />
          </BentoCell>

          <BentoCell>
            <Eyebrow>Export</Eyebrow>
            <h3 className="display text-[17px] gt-white mt-3">
              PDF banque, <span className="serif-italic text-zinc-400">Excel détaillé.</span>
            </h3>
            <BentoExportPreview />
          </BentoCell>

          <BentoCell className="md:col-span-3 min-h-[200px]">
            <div className="flex flex-col md:flex-row justify-between gap-8 h-full">
              <div className="max-w-sm">
                <Eyebrow>Multi-scénarios</Eyebrow>
                <h3 className="display text-[clamp(1.4rem,2.2vw,1.9rem)] gt-white mt-4">
                  Nu, meublé, coloc, saisonnier — <span className="serif-italic text-zinc-400">comparés en un écran.</span>
                </h3>
                <p className="text-[13px] text-zinc-500 mt-2.5 max-w-sm leading-[1.6]">
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
    <div className={`spotlight relative rounded-xl p-7 bg-gradient-to-b from-white/[0.025] to-white/[0.005] border border-white/[0.05] hover:border-white/[0.12] transition-all duration-500 ${className}`}>
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mono text-[10px] text-emerald-300/80 uppercase tracking-[0.22em] font-medium">
      <span className="w-1 h-1 rounded-full bg-emerald-400/80" />
      {children}
    </div>
  )
}

function BentoScoreDial() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.4 })
  const score = useCountUp(87, 1800, inView)
  const v1 = useCountUp(92, 1400, inView)
  const v2 = useCountUp(88, 1400, inView)
  const v3 = useCountUp(81, 1400, inView)
  const v4 = useCountUp(86, 1400, inView)

  const circ = 2 * Math.PI * 70
  const offset = circ - (score / 100) * circ

  const subs = [
    { l: 'Rendement', v: v1 },
    { l: 'Cashflow', v: v2 },
    { l: 'Fiscalité', v: v3 },
    { l: 'Marché', v: v4 },
  ]

  return (
    <div ref={ref} className="flex items-center gap-6 mt-8">
      <div className="relative w-40 h-40 flex-shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.06)" strokeWidth="5" fill="none" />
          <circle
            cx="80" cy="80" r="70"
            stroke="url(#dial-grad)"
            strokeWidth="5" fill="none" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
          <defs>
            <linearGradient id="dial-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="display-lg text-[44px] text-white tabular leading-none">{score}</div>
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.2em] mt-1">/100</div>
        </div>
      </div>
      <div className="space-y-2 flex-1">
        {subs.map((s) => (
          <div key={s.l} className="space-y-1">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-zinc-400">{s.l}</span>
              <span className="mono text-zinc-300 tabular">{s.v}</span>
            </div>
            <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400/80 to-emerald-300 rounded-full"
                style={{ width: `${s.v}%`, transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)' }}
              />
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
    { name: 'SARL famille', cf: '+180' },
    { name: 'Réel foncier', cf: '−480' },
    { name: 'Micro-foncier', cf: '−1 240' },
  ]
  return (
    <div className="mt-5 space-y-1.5">
      {items.map((i) => {
        const pos = !i.cf.startsWith('−')
        return (
          <div
            key={i.name}
            className={`flex items-center justify-between px-2.5 py-2 rounded-md text-[12px] ${
              i.best ? 'bg-emerald-500/[0.08] border border-emerald-500/20' : 'bg-white/[0.02] border border-white/[0.04]'
            }`}
          >
            <span className="text-zinc-200 flex items-center gap-1.5">
              {i.best && <span className="mono text-[8.5px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">OPTI</span>}
              {i.name}
            </span>
            <span className={`mono tabular text-[11px] ${pos ? 'text-emerald-300' : 'text-red-300'}`}>{i.cf}€/m</span>
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
    <div className="mt-5 space-y-1">
      {cities.map((c) => (
        <div key={c.c} className="flex items-center justify-between text-[11.5px] px-2 py-1.5 rounded-md hover:bg-white/[0.03] transition-colors">
          <span className="text-zinc-300">{c.c}</span>
          <div className="flex items-center gap-3 mono">
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
    <div className="mt-5 space-y-1.5">
      {[
        { name: 'rapport.pdf', icon: 'pdf' },
        { name: 'amortissement.xlsx', icon: 'xls' },
      ].map((f) => (
        <div key={f.name} className="flex items-center gap-2.5 p-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${f.icon === 'pdf' ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
            </svg>
          </div>
          <span className="text-[11.5px] text-zinc-300 flex-1">{f.name}</span>
          <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1 max-w-2xl">
      {sc.map((s) => (
        <div
          key={s.name}
          className={`p-3 rounded-lg border text-center ${
            s.best ? 'bg-emerald-500/[0.06] border-emerald-500/25' : 'bg-white/[0.02] border-white/[0.05]'
          }`}
        >
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em] mb-1.5">{s.name}</div>
          <div className="display text-[19px] tabular text-white">{s.rd}%</div>
          <div className={`mono text-[10.5px] mt-1 tabular ${s.neg ? 'text-red-300' : 'text-emerald-300'}`}>{s.cf}€/m</div>
        </div>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPARISON (auto-animate position on view)
   ══════════════════════════════════════════════════════════════════════════ */
function ComparisonSection() {
  const [pos, setPos] = useState(5)
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.35 })
  const dragging = useRef(false)
  const userControlled = useRef(false)

  // Animate from 5 to 50 on entry
  useEffect(() => {
    if (!inView || userControlled.current) return
    const start = performance.now()
    const from = 5
    const to = 50
    const dur = 1800
    let raf: number
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setPos(from + (to - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView])

  const onDown = () => { dragging.current = true; userControlled.current = true }
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
    <section className="relative py-32 lg:py-40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14 reveal">
          <div className="inline-block">
            <SectionLabel num="02">Avant / Après</SectionLabel>
          </div>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Du tableur infernal,<br />
            <span className="serif-italic gradient-text">à la décision claire.</span>
          </h2>
          <p className="text-[14px] text-zinc-500 mt-5">Glissez le curseur pour voir la différence.</p>
        </div>

        <div
          ref={ref}
          onMouseMove={onMove}
          onTouchMove={onMove}
          className="relative aspect-[16/9] w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-white/[0.08] glass-card cursor-ew-resize reveal reveal-d1 select-none"
        >
          <ImmolyseScreenshot inView={inView} />
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <ExcelScreenshot />
          </div>
          <div className="absolute top-0 bottom-0 w-px bg-white/40" style={{ left: `${pos}%` }}>
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
          <div className="absolute top-4 left-4 px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/25 mono text-[10px] text-red-300 uppercase tracking-[0.15em]">
            Excel · 47 min
          </div>
          <div className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 mono text-[10px] text-emerald-300 uppercase tracking-[0.15em]">
            Immolyse · 30 sec
          </div>
        </div>
      </div>
    </section>
  )
}

function ExcelScreenshot() {
  const rows = Array.from({ length: 14 }, (_, i) => i)
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  return (
    <div className="absolute inset-0 bg-[#1c1c1f]">
      <div className="absolute top-0 left-0 right-0 h-6 bg-[#252528] border-b border-black/40 flex items-center px-2 gap-1">
        <span className="mono text-[10px] text-zinc-400">Calculs_Rentabilité_V12_FINAL_FINAL2.xlsx</span>
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

function ImmolyseScreenshot({ inView }: { inView: boolean }) {
  const score = useCountUp(87, 1800, inView)
  const circ = 2 * Math.PI * 40
  const offset = circ - (score / 100) * circ

  return (
    <div className="absolute inset-0 bg-[#0a0a0b]">
      <div className="absolute inset-0 specks opacity-50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.2), transparent 60%)', filter: 'blur(80px)' }} />

      <div className="relative absolute inset-0 p-8 grid grid-cols-12 grid-rows-6 gap-3">
        <div className="col-span-12 row-span-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-emerald-500" />
            <span className="text-[13px] font-medium text-white">Analyse · Lyon 2ᵉ</span>
          </div>
          <div className="flex gap-1.5">
            <div className="px-2 py-0.5 mono text-[9.5px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded">SCORE {score}</div>
          </div>
        </div>

        <div className="col-span-6 row-span-2 glass-card rounded-xl p-4 flex flex-col justify-center">
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em]">Rendement net</div>
          <div className="display-lg text-[42px] text-white tabular leading-none mt-1">5.78%</div>
          <div className="mono text-[10.5px] text-emerald-300 mt-2">+1.4 vs marché Lyon</div>
        </div>
        <div className="col-span-3 row-span-2 glass-card rounded-xl p-4 flex flex-col justify-center">
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em]">Cashflow</div>
          <div className="display text-[24px] text-emerald-300 tabular mt-1">+128€</div>
        </div>
        <div className="col-span-3 row-span-2 glass-card rounded-xl p-4 flex flex-col justify-center">
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em]">Régime</div>
          <div className="text-[16px] font-medium text-white mt-1">LMNP réel</div>
          <div className="mono text-[9.5px] text-emerald-400 mt-1">★ Optimal</div>
        </div>

        <div className="col-span-8 row-span-3 glass-card rounded-xl p-4">
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em] mb-2">Patrimoine · 20 ans</div>
          <svg viewBox="0 0 200 80" className="w-full h-full">
            <defs>
              <linearGradient id="im-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 0 70 Q 50 60 100 40 T 200 8 L 200 80 L 0 80 Z" fill="url(#im-grad)" className={`chart-fill ${inView ? 'in-view' : ''}`} />
            <path d="M 0 70 Q 50 60 100 40 T 200 8" fill="none" stroke="#34d399" strokeWidth="1.5" className={`chart-draw ${inView ? 'in-view' : ''}`} />
          </svg>
        </div>

        <div className="col-span-4 row-span-3 glass-card rounded-xl p-4 flex flex-col items-center justify-center">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
              <circle
                cx="50" cy="50" r="40"
                stroke="#34d399"
                strokeWidth="4"
                fill="none" strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1.8s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center display-lg text-[28px] tabular text-white">{score}</div>
          </div>
          <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.18em] mt-2">Score IA</div>
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
      title: 'Votre premier bien',
      desc: 'On vous dit ce qui est rentable, ce qui ne l\'est pas, et pourquoi. Aucune connaissance fiscale requise.',
      points: ['Score clair', 'Recommandation IA', 'Glossaire intégré'],
      icon: '01',
      visual: <PersonaVisualBeginner />,
    },
    {
      tag: 'Multi-bien',
      title: '3 biens ou plus',
      desc: 'Comparez vos investissements, identifiez ceux qui sous-performent, optimisez votre fiscalité globale.',
      points: ['Comparaison multi-biens', 'Optimisation fiscale', 'Bibliothèque centralisée'],
      icon: '02',
      visual: <PersonaVisualMulti />,
    },
    {
      tag: 'Pro',
      title: 'CGP, agent, courtier',
      desc: 'Présentez à vos clients des analyses complètes en quelques secondes, avec votre logo en PDF.',
      points: ['Rapports white-label', 'Accès API', 'Multi-comptes équipe'],
      icon: '03',
      visual: <PersonaVisualPro />,
    },
  ]

  return (
    <section className="relative py-32 lg:py-40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-16 reveal">
          <SectionLabel num="03">Pour qui</SectionLabel>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Conçu pour vous,<br />
            <span className="serif-italic text-zinc-400">quel que soit votre niveau.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-3 reveal reveal-d1">
          {personas.map((p) => (
            <div key={p.tag} className="spotlight relative rounded-xl p-7 bg-gradient-to-b from-white/[0.025] to-white/[0.005] border border-white/[0.05] hover:border-white/[0.12] transition-all duration-500 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="mono text-[9.5px] text-emerald-300/80 uppercase tracking-[0.22em]">{p.tag}</div>
                <div className="mono text-[28px] text-zinc-700 leading-none">{p.icon}</div>
              </div>
              <h3 className="display text-[22px] gt-white mb-3">{p.title}</h3>
              <p className="text-[13.5px] text-zinc-500 leading-[1.65] mb-5">{p.desc}</p>

              {/* Mini calculateur visual */}
              <div className="mb-5">{p.visual}</div>

              <div className="space-y-2 mb-5">
                {p.points.map((pt) => (
                  <div key={pt} className="flex items-center gap-2 text-[12.5px] text-zinc-300">
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {pt}
                  </div>
                ))}
              </div>
              <button onClick={onCta} className="mt-auto text-[12.5px] text-emerald-300 hover:text-emerald-200 font-medium inline-flex items-center gap-1.5 group self-start">
                Essayer pour ce profil
                <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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

/* Mini visuels calculateur pour chaque persona ───────────────────────────── */
function PersonaVisualBeginner() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 })
  const score = useCountUp(87, 1600, inView)
  const circ = 2 * Math.PI * 32
  const offset = circ - (score / 100) * circ

  return (
    <div ref={ref} className="relative rounded-lg bg-black/30 border border-white/[0.05] p-3.5 overflow-hidden">
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2), transparent 60%)', filter: 'blur(20px)' }} />

      <div className="relative flex items-center gap-4">
        {/* Score dial */}
        <div className="relative w-[72px] h-[72px] flex-shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
            <circle cx="40" cy="40" r="32" stroke="#34d399" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1)' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="display text-[22px] text-white tabular leading-none">{score}</div>
            <div className="mono text-[8px] text-zinc-500 uppercase tracking-wider">/100</div>
          </div>
        </div>

        {/* Verdict */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-tick" />
            <span className="mono text-[9px] text-emerald-300 uppercase tracking-wider">Verdict IA</span>
          </div>
          <p className="serif text-[14px] text-white leading-[1.3]">
            <span className="serif-italic text-emerald-300">Bon investissement.</span>
          </p>
          <p className="text-[10.5px] text-zinc-500 leading-[1.4] mt-1">Procédez en LMNP réel.</p>
        </div>
      </div>
    </div>
  )
}

function PersonaVisualMulti() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.3 })
  const properties = [
    { name: 'Lyon T3', rd: '5.8', best: true },
    { name: 'Paris T2', rd: '3.4' },
    { name: 'Nice T4', rd: '4.2' },
  ]
  return (
    <div ref={ref} className="relative rounded-lg bg-black/30 border border-white/[0.05] p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="mono text-[9px] text-zinc-500 uppercase tracking-wider">Vos 3 biens</span>
        <span className="mono text-[9px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-1.5 py-0.5">classés</span>
      </div>
      <div className="space-y-1.5">
        {properties.map((p, i) => (
          <div
            key={p.name}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border ${
              p.best ? 'bg-emerald-500/[0.08] border-emerald-500/25' : 'bg-white/[0.02] border-white/[0.04]'
            }`}
            style={{ animation: inView ? `fade-in 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 120}ms both` : 'none' }}
          >
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${p.best ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span className="text-[11.5px] text-zinc-200">{p.name}</span>
              {p.best && <span className="mono text-[8px] text-emerald-300 bg-emerald-500/15 px-1 py-0.5 rounded">TOP</span>}
            </div>
            <span className={`mono text-[11px] tabular font-medium ${p.best ? 'text-emerald-300' : 'text-zinc-400'}`}>{p.rd}%</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
        <span className="mono text-[9px] text-zinc-600 uppercase tracking-wider">Δ vs marché</span>
        <span className="mono text-[10px] text-emerald-300 tabular font-medium">+0.7 pts</span>
      </div>
    </div>
  )
}

function PersonaVisualPro() {
  return (
    <div className="relative rounded-lg bg-black/30 border border-white/[0.05] p-3.5">
      <div className="flex items-center justify-between mb-3">
        <span className="mono text-[9px] text-zinc-500 uppercase tracking-wider">rapport-client.pdf</span>
        <span className="mono text-[9px] text-pink-300 bg-pink-500/10 border border-pink-500/20 rounded-full px-1.5 py-0.5">white-label</span>
      </div>
      <div className="rounded-md bg-white/[0.025] border border-white/[0.05] p-3 space-y-2">
        {/* Faux header avec logo placeholder */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-pink-400 to-indigo-400" />
            <span className="text-[10px] font-medium text-white">Votre Cabinet</span>
          </div>
          <span className="mono text-[8.5px] text-zinc-500">M. Dupont</span>
        </div>

        {/* Faux contenu */}
        <div className="space-y-1">
          <div className="h-1 rounded bg-white/[0.08] w-3/4" />
          <div className="h-1 rounded bg-white/[0.04] w-full" />
          <div className="h-1 rounded bg-white/[0.04] w-5/6" />
        </div>

        {/* Mini stat row */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[
            { l: 'Rendt', v: '5.8%' },
            { l: 'CF', v: '+128€' },
            { l: 'Score', v: '87' },
          ].map((s) => (
            <div key={s.l} className="p-1.5 rounded bg-emerald-500/[0.06] border border-emerald-500/15 text-center">
              <div className="mono text-[7.5px] text-zinc-500 uppercase tracking-wider">{s.l}</div>
              <div className="text-[10px] font-medium text-emerald-300 tabular">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Faux export button row */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <div className="flex-1 px-2 py-1 rounded border border-white/[0.06] text-center mono text-[9px] text-zinc-400 bg-white/[0.02]">
          Exporter
        </div>
        <div className="px-2 py-1 rounded bg-emerald-500/15 border border-emerald-500/30 mono text-[9px] text-emerald-300">
          ↓ PDF
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPLICATION — Sticky scroll style Linear
   ══════════════════════════════════════════════════════════════════════════ */
function ExplicationSection() {
  const [active, setActive] = useState(0)
  const refs: RefObject<HTMLDivElement>[] = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = parseInt(e.target.getAttribute('data-i') || '0', 10)
            setActive(idx)
          }
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    refs.forEach((r) => r.current && obs.observe(r.current))
    return () => obs.disconnect()
  }, [])

  const steps = [
    { num: '01', title: 'Analyser', accent: 'un bien.', description: 'Prix d\'achat, loyer estimé, ville. Immolyse calcule instantanément le rendement brut, net, et nette-nette avec des données de marché actualisées.', visual: <ZoomVisualAnalyse /> },
    { num: '02', title: 'Comparer', accent: 'les régimes fiscaux.', description: 'L\'outil simule 10 régimes (LMNP, LMP, SCI IS/IR, micro-foncier, réel...) et recommande celui qui optimise votre cashflow net après impôt.', visual: <ZoomVisualFiscal /> },
    { num: '03', title: 'Exporter', accent: 'en un clic.', description: 'Rapport de présentation bancaire en PDF, tableau d\'amortissement complet en Excel. Les documents que votre courtier attend, en 5 secondes.', visual: <ZoomVisualExport /> },
  ]

  return (
    <section id="produit" className="relative py-32 lg:py-40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="max-w-2xl mb-16 reveal">
          <SectionLabel num="04">Comment ça marche</SectionLabel>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Du bien à la décision,<br />
            <span className="serif-italic text-zinc-400">en trois étapes.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 relative">
          {/* LEFT — Scrolling steps */}
          <div>
            {steps.map((s, i) => (
              <div
                key={i}
                ref={refs[i]}
                data-i={i}
                className="lg:min-h-[80vh] flex items-center py-10 lg:py-0"
              >
                <div className={`space-y-5 transition-all duration-700 ${active === i ? 'lg:opacity-100' : 'lg:opacity-30'}`}>
                  {/* Step indicator */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-500 ${
                      active === i ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-white/[0.03] border-white/10 text-zinc-500'
                    }`}>
                      <span className="mono text-[10px] font-medium">{s.num}</span>
                    </div>
                    <div className={`h-px flex-1 max-w-[80px] transition-all duration-500 ${active === i ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                  </div>

                  <h3 className="display text-[clamp(1.8rem,3.5vw,2.8rem)] gt-white">
                    {s.title} <span className="serif-italic text-zinc-400">{s.accent}</span>
                  </h3>
                  <p className="text-[15px] text-zinc-400 leading-[1.7] max-w-md">{s.description}</p>

                  {/* Mobile visual */}
                  <div className="lg:hidden mt-8">{s.visual}</div>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — Sticky visual that crossfades */}
          <div className="hidden lg:block">
            <div className="sticky top-32 h-[70vh] flex items-center justify-center">
              <div className="relative w-full" style={{ height: 'min(560px, 70vh)' }}>
                {steps.map((s, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 flex items-center transition-all duration-700 ${
                      active === i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                    }`}
                  >
                    <div className="w-full">{s.visual}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ZoomVisualAnalyse() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-br from-emerald-500/15 to-transparent rounded-3xl blur-2xl" />
      <div className="relative glass-card rounded-xl p-5 space-y-3.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="mono text-[10px] text-zinc-500 uppercase tracking-[0.18em]">Analyse express</div>
          <div className="mono text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2 py-0.5 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400 live-tick" />
            en direct
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { l: 'Adresse', v: 'Lyon 2ᵉ' },
            { l: 'Surface', v: '68 m²' },
            { l: 'Prix', v: '245 000 €' },
            { l: 'Loyer', v: '1 180 €' },
          ].map((f) => (
            <div key={f.l} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
              <div className="mono text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-0.5">{f.l}</div>
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
              <span className="mono font-medium text-emerald-300 tabular">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ZoomVisualFiscal() {
  const rows = [
    { name: 'LMNP réel', net: 1540, pct: 100, tone: 'good', best: true },
    { name: 'LMP réel', net: 1180, pct: 76, tone: 'good' },
    { name: 'LMNP micro-BIC', net: 620, pct: 40, tone: 'good' },
    { name: 'SCI à l\'IS', net: 340, pct: 22, tone: 'good' },
    { name: 'SARL famille', net: 180, pct: 12, tone: 'good' },
    { name: 'Indivision', net: 80, pct: 5, tone: 'good' },
    { name: 'Réel foncier', net: -480, pct: 31, tone: 'bad' },
    { name: 'Micro-foncier', net: -1240, pct: 80, tone: 'bad' },
  ]
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-tl from-indigo-500/20 via-emerald-500/8 to-transparent rounded-3xl blur-3xl" />
      <div className="relative glass-card rounded-2xl shadow-2xl overflow-hidden">
        {/* Header bar with window controls */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.05] bg-black/30">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-700" />
            <span className="w-2 h-2 rounded-full bg-zinc-700" />
            <span className="w-2 h-2 rounded-full bg-zinc-700" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/[0.04] mono text-[10px] text-zinc-500">
              immolyse.app/analyse/fiscalite
            </div>
          </div>
          <div className="w-10" />
        </div>

        <div className="p-5 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 live-tick" />
              <div className="mono text-[10.5px] text-zinc-400 uppercase tracking-[0.18em]">Comparateur fiscal</div>
            </div>
            <div className="mono text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">10 régimes</div>
          </div>

          {/* Régimes list with bars */}
          <div className="space-y-1.5">
            {rows.map((r, i) => {
              const pos = r.tone === 'good'
              const barColor = pos ? 'bg-gradient-to-r from-emerald-500/60 to-emerald-400/30' : 'bg-gradient-to-r from-red-500/60 to-red-400/20'
              return (
                <div
                  key={r.name}
                  className={`relative flex items-center justify-between px-3 py-2 rounded-lg text-[12px] ${
                    r.best ? 'bg-emerald-500/[0.10] border border-emerald-500/30' : 'bg-white/[0.02] border border-white/[0.04]'
                  }`}
                  style={{ animation: `fade-in 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both` }}
                >
                  {/* Background bar showing relative weight */}
                  <div
                    className={`absolute inset-y-0 left-0 ${barColor} opacity-30 rounded-lg`}
                    style={{ width: `${r.pct}%`, animation: `bar-grow-anim 1s cubic-bezier(0.16,1,0.3,1) ${i * 60 + 200}ms both` }}
                  />
                  <span className="relative flex items-center gap-2 text-zinc-100">
                    {r.best && <span className="mono text-[8.5px] text-emerald-200 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">★ OPTI</span>}
                    {r.name}
                  </span>
                  <span className={`relative mono font-semibold tabular text-[12.5px] ${pos ? 'text-emerald-200' : 'text-red-200'}`}>
                    {r.net >= 0 ? '+' : '−'}{Math.abs(r.net).toLocaleString('fr-FR')} €
                  </span>
                </div>
              )
            })}
          </div>

          {/* Économie callout */}
          <div className="relative overflow-hidden flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-500/[0.10] via-emerald-500/[0.04] to-transparent border border-emerald-500/25">
            <div className="w-9 h-9 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.15em]">Économie annuelle</div>
              <div className="text-[11.5px] text-emerald-200 font-medium">avec LMNP réel vs micro-foncier</div>
            </div>
            <div className="text-right">
              <div className="display text-[22px] text-emerald-300 tabular leading-none">+14 040</div>
              <div className="mono text-[10px] text-emerald-400/80 tabular">€ / an</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ZoomVisualExport() {
  return (
    <div className="relative">
      <div className="absolute -inset-8 bg-gradient-to-br from-amber-500/15 via-red-500/8 to-transparent rounded-3xl blur-3xl" />

      <div className="relative">
        {/* Stacked PDF pages (back layers, transparent) */}
        <div
          className="absolute top-8 -right-3 w-[92%] h-[88%] glass-card rounded-xl opacity-25"
          style={{ transform: 'rotate(4deg)' }}
        />
        <div
          className="absolute top-4 -right-1 w-[96%] h-[94%] glass-card rounded-xl opacity-50"
          style={{ transform: 'rotate(2deg)' }}
        />

        {/* Main PDF preview (front) */}
        <div className="relative glass-card rounded-xl shadow-2xl overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-black/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
                </svg>
              </div>
              <span className="text-[12px] font-medium text-white">rapport-banque.pdf</span>
              <span className="mono text-[9.5px] text-zinc-500">· 12 pages</span>
            </div>
            <span className="mono text-[9.5px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/15 rounded-full px-2 py-0.5">prêt</span>
          </div>

          {/* PDF "page" content preview */}
          <div className="p-5 space-y-4 bg-gradient-to-b from-white/[0.01] to-white/[0.005]">
            {/* Cover */}
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.05]">
              <div>
                <div className="mono text-[9px] text-zinc-500 uppercase tracking-[0.18em] mb-1">Analyse d'investissement</div>
                <div className="text-[14px] font-medium text-white">12 rue Vaubecour</div>
                <div className="text-[11px] text-zinc-500">69002 Lyon · T3 · 68 m²</div>
              </div>
              <div className="text-right">
                <div className="mono text-[9px] text-zinc-500">Édité le</div>
                <div className="text-[11px] text-zinc-400">19 mai 2026</div>
              </div>
            </div>

            {/* Mini chart preview */}
            <div className="rounded-lg bg-white/[0.025] border border-white/[0.05] p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="mono text-[9.5px] text-zinc-500 uppercase tracking-[0.15em]">Patrimoine projeté · 20 ans</div>
                <span className="mono text-[10px] text-emerald-300 tabular">+248 k€</span>
              </div>
              <svg viewBox="0 0 240 50" preserveAspectRatio="none" className="w-full h-10">
                <defs>
                  <linearGradient id="export-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0 42 Q 50 38 100 26 T 200 8 L 240 4 L 240 50 L 0 50 Z" fill="url(#export-grad)" />
                <path d="M 0 42 Q 50 38 100 26 T 200 8 L 240 4" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Rendt brut', v: '5.78%', c: 'emerald' },
                { l: 'Cashflow', v: '+128€', c: 'emerald' },
                { l: 'Régime', v: 'LMNP', c: 'indigo' },
                { l: 'Score', v: '87', c: 'emerald' },
              ].map((s) => (
                <div
                  key={s.l}
                  className={`p-2 rounded-md text-center ${
                    s.c === 'emerald' ? 'bg-emerald-500/[0.06] border border-emerald-500/15' : 'bg-indigo-500/[0.06] border border-indigo-500/15'
                  }`}
                >
                  <div className="mono text-[8.5px] text-zinc-500 uppercase tracking-wider">{s.l}</div>
                  <div className={`mono text-[12px] font-semibold tabular mt-0.5 ${s.c === 'emerald' ? 'text-emerald-300' : 'text-indigo-300'}`}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Verdict block */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gradient-to-r from-emerald-500/[0.06] to-transparent border border-emerald-500/20">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-medium text-emerald-200">Verdict bancaire</div>
                <div className="text-[10.5px] text-zinc-400 leading-relaxed">Dossier solide · Endettement maîtrisé · Cashflow positif dès le 1ᵉʳ mois.</div>
              </div>
            </div>

            {/* Footer fake content */}
            <div className="space-y-1.5">
              <div className="h-1 rounded bg-white/[0.06] w-3/4" />
              <div className="h-1 rounded bg-white/[0.04] w-full" />
              <div className="h-1 rounded bg-white/[0.04] w-5/6" />
            </div>
          </div>

          {/* Action footer */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/[0.05] bg-black/20">
            <span className="mono text-[9.5px] text-zinc-500 flex-1">Page 1 / 12</span>
            <div className="flex items-center gap-1.5">
              <div className="px-2 py-1 rounded-md border border-white/[0.06] bg-white/[0.02] mono text-[9.5px] text-zinc-400">Excel</div>
              <div className="px-2 py-1 rounded-md bg-white text-zinc-950 mono text-[9.5px] font-medium flex items-center gap-1">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                Télécharger PDF
              </div>
            </div>
          </div>
        </div>

        {/* Floating XLSX chip below */}
        <div className="absolute -bottom-4 -left-3 z-20 glass-card rounded-lg px-2.5 py-1.5 flex items-center gap-2 anim-float-slow" style={{ animationDelay: '1.5s' }}>
          <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[10.5px] font-medium text-white">amortissement.xlsx</div>
            <div className="mono text-[9px] text-zinc-500">186 Ko · 240 lignes</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   TESTIMONIALS
   ══════════════════════════════════════════════════════════════════════════ */
function TestimonialsSection() {
  const items = [
    { name: 'Antoine M.', role: 'Investisseur · 7 biens', quote: 'J\'ai économisé 14 000€/an en basculant en LMNP, alors que mon comptable me jurait que le micro-foncier était optimal. Immolyse a vu juste en 30 secondes.', result: '+14 000 €/an', avatar: 'A', color: '#10b981' },
    { name: 'Sophie T.', role: 'Première acquisition', quote: 'J\'allais signer un T2 à Bordeaux que je pensais rentable. L\'outil m\'a montré un cashflow réel de −230€/mois. J\'ai évité une catastrophe.', result: 'Décision évitée', avatar: 'S', color: '#6366f1' },
    { name: 'Mehdi R.', role: 'CGP indépendant', quote: 'Je fais 3 analyses par jour pour mes clients. Avant : 1h chacune sur Excel. Maintenant : 30 secondes avec un PDF white-label. Imbattable.', result: '×120 plus rapide', avatar: 'M', color: '#ec4899' },
    { name: 'Julie B.', role: 'Investisseuse · 3 biens', quote: 'Le score IA m\'a fait découvrir qu\'un de mes biens sous-performait à cause de la fiscalité. 4 800€/an récupérés.', result: '+4 800 €/an', avatar: 'J', color: '#f59e0b' },
    { name: 'Thomas L.', role: 'Agent immobilier', quote: 'Je l\'utilise en RDV avec mes acheteurs. Ça crée une confiance immédiate. Mon taux de transformation a doublé.', result: '×2 conversion', avatar: 'T', color: '#06b6d4' },
  ]
  const marqueeItems = [...items, ...items]

  return (
    <section className="relative py-32 lg:py-40 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 mb-14">
        <div className="max-w-2xl reveal">
          <SectionLabel num="05">Témoignages</SectionLabel>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Des décisions, <span className="serif-italic text-zinc-400">pas des promesses.</span>
          </h2>
          <p className="text-[15px] text-zinc-500 leading-[1.6] mt-5 max-w-lg">
            Ce que disent celles et ceux qui utilisent Immolyse au quotidien.
          </p>
        </div>
      </div>

      <div className="marquee reveal">
        <div className="marquee-track">
          {marqueeItems.map((t, i) => (
            <div key={i} className="w-[360px] flex-shrink-0 spotlight relative rounded-xl p-6 bg-gradient-to-b from-white/[0.025] to-white/[0.005] border border-white/[0.05] hover:border-white/[0.14] transition-all duration-500">
              <p className="serif text-[19px] text-zinc-100 leading-[1.45] mb-6 min-h-[120px]">
                <span className="serif-italic text-zinc-400">« </span>{t.quote}<span className="serif-italic text-zinc-400"> »</span>
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium text-white border border-white/10" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-medium text-white">{t.name}</div>
                    <div className="mono text-[10px] text-zinc-500 tracking-wider">{t.role}</div>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 mono text-[10px] text-emerald-300">{t.result}</div>
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
    { name: 'Découverte', price: { monthly: 0, annual: 0 }, desc: 'Pour tester l\'outil', features: ['Analyse express', '3 simulations sauvegardées', 'Export PDF (filigrane)', 'Données marché basiques'], cta: 'Commencer gratuitement', featured: false },
    { name: 'Pro', price: { monthly: 29, annual: 19 }, desc: 'L\'essentiel pour investir sérieusement', features: ['Simulations illimitées', '10 régimes fiscaux', 'Analyse IA (GPT-4)', 'Export PDF & Excel pro', 'Comparaison multi-biens', 'Support prioritaire'], cta: 'Essai 14 jours', featured: true },
    { name: 'Agence', price: { monthly: 79, annual: 59 }, desc: 'Pour les pros de l\'immobilier', features: ['Tout le plan Pro', 'Jusqu\'à 5 sièges', 'Rapports white-label', 'Accès API', 'Onboarding dédié'], cta: 'Contacter l\'équipe', featured: false },
  ]

  return (
    <section id="pricing" className="relative py-32 lg:py-40">
      <div className="max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-center max-w-2xl mx-auto mb-14 reveal">
          <div className="inline-block">
            <SectionLabel num="06">Tarifs</SectionLabel>
          </div>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Simple. <span className="serif-italic text-zinc-400">Honnête.</span><br />
            Sans surprise.
          </h2>
          <div className="inline-flex items-center gap-1 p-1 mt-8 rounded-full bg-white/[0.04] border border-white/[0.07]">
            <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all ${!annual ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Mensuel</button>
            <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>
              Annuel
              <span className={`mono text-[9.5px] px-1.5 py-0.5 rounded ${annual ? 'bg-emerald-500/15 text-emerald-700' : 'bg-emerald-500/15 text-emerald-300'}`}>−35%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3 max-w-5xl mx-auto reveal reveal-d1">
          {plans.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly
            return (
              <div key={plan.name} className={`relative rounded-xl p-8 transition-all duration-300 ${plan.featured ? 'bg-gradient-to-b from-emerald-500/[0.06] to-transparent border border-emerald-500/30 shadow-[0_0_60px_-15px_rgba(16,185,129,0.25)]' : 'bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12]'}`}>
                {plan.featured && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-zinc-950 mono text-[10px] font-medium uppercase tracking-wider">
                    Le plus choisi
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-[15px] font-medium text-white mb-1">{plan.name}</h3>
                  <p className="text-[12.5px] text-zinc-500">{plan.desc}</p>
                </div>
                <div className="mb-6">
                  {price === 0 ? (
                    <div className="display-lg text-[44px] text-white">Gratuit</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="display-lg text-[44px] text-white tabular">{price}</span>
                      <span className="serif-italic text-zinc-500 text-sm">€/mois</span>
                    </div>
                  )}
                  {annual && price > 0 && <p className="mono text-[11px] text-zinc-600 mt-1.5">Facturé {price * 12}€/an</p>}
                </div>
                <button onClick={onSignup} className={`w-full text-[13.5px] font-medium py-2.5 rounded-lg transition-all duration-200 mb-6 ${plan.featured ? 'bg-white text-zinc-950 hover:bg-zinc-100 hover:shadow-[0_0_30px_-4px_rgba(255,255,255,0.4)]' : 'bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08]'}`}>
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
        <p className="text-center mono text-[11px] text-zinc-600 mt-10 tracking-wider">
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
    { q: 'D\'où viennent les données de marché ?', a: 'Les prix au m² et rendements moyens sont issus de sources publiques (DVF, MeilleursAgents, Notaires.fr, INSEE) et mises à jour mensuellement. 18 villes et 44 quartiers sont couverts.' },
    { q: 'Mes données sont-elles confidentielles ?', a: 'Oui. Toutes les simulations sont chiffrées (AES-256), stockées en Europe (Supabase Frankfurt), et ne sont jamais partagées avec des tiers. Conforme RGPD.' },
    { q: 'L\'analyse tient-elle compte de ma situation personnelle ?', a: 'Oui : tranche marginale d\'imposition, situation matrimoniale, biens existants, autres revenus locatifs. Plus les informations sont précises, plus la recommandation est juste.' },
    { q: 'Puis-je résilier à tout moment ?', a: 'Oui, en un clic depuis votre compte, sans engagement, sans pénalité. Remboursement au prorata.' },
    { q: 'Est-ce que ça remplace mon comptable ?', a: 'Non — c\'est un outil d\'analyse pour décider vite. Pour la déclaration fiscale, un expert reste recommandé. Immolyse vous prépare un dossier propre à lui soumettre.' },
  ]
  return (
    <section className="relative py-32 lg:py-40">
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <div className="mb-14 reveal text-center">
          <div className="inline-block">
            <SectionLabel num="07">Questions fréquentes</SectionLabel>
          </div>
          <h2 className="display text-[clamp(2.2rem,4.5vw,3.6rem)] gt-white mt-6">
            Tout ce qu'on vous <span className="serif-italic text-zinc-400">demande.</span>
          </h2>
        </div>
        <div className="space-y-2 reveal reveal-d1">
          {faqs.map((f, i) => (
            <div key={i} className={`rounded-xl border border-white/[0.05] hover:border-white/[0.12] transition-all bg-white/[0.015] ${open === i ? 'acc-open bg-white/[0.03] border-white/[0.1]' : ''}`}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4">
                <span className="text-[14.5px] font-medium text-white">{f.q}</span>
                <svg className={`w-4 h-4 text-zinc-500 flex-shrink-0 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="acc-content">
                <div>
                  <p className="px-5 pb-4 text-[13.5px] text-zinc-400 leading-[1.7]">{f.a}</p>
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
   CTA FINAL — orbe pulsant
   ══════════════════════════════════════════════════════════════════════════ */
function CtaFinalSection({ onPrimary }: { onPrimary: () => void }) {
  return (
    <section className="relative py-36 lg:py-48 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="glow-em anim-breathe" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        <div className="specks opacity-50" />
        <div className="noise" />

        {/* Orbe rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="orb-ring orb-ring-1 w-[280px] h-[280px] -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 absolute" />
          <div className="orb-ring orb-ring-2 w-[440px] h-[440px] -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 absolute" />
          <div className="orb-ring orb-ring-3 w-[620px] h-[620px] -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 absolute" />
        </div>

        {/* Floating UI chips */}
        <div className="hidden md:block">
          {/* Top-left : Score chip */}
          <div className="absolute top-[18%] left-[8%] anim-float-slow" style={{ animationDelay: '0s' }}>
            <FloatingChip>
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8">
                  <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                    <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" fill="none" />
                    <circle cx="16" cy="16" r="12" stroke="#34d399" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 12} strokeDashoffset={2 * Math.PI * 12 * 0.13} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center mono text-[9px] text-white">87</div>
                </div>
                <div className="leading-tight">
                  <div className="mono text-[8.5px] text-zinc-500 uppercase tracking-wider">Score IA</div>
                  <div className="text-[10px] text-emerald-300 font-medium">Excellent</div>
                </div>
              </div>
            </FloatingChip>
          </div>

          {/* Top-right : Cashflow chip */}
          <div className="absolute top-[14%] right-[10%] anim-float-slow" style={{ animationDelay: '1.5s' }}>
            <FloatingChip>
              <div>
                <div className="mono text-[8.5px] text-zinc-500 uppercase tracking-wider mb-0.5">Cashflow/mois</div>
                <div className="display text-[18px] text-emerald-300 tabular">+128 €</div>
              </div>
            </FloatingChip>
          </div>

          {/* Bottom-left : Régime chip */}
          <div className="absolute bottom-[18%] left-[12%] anim-float-slow" style={{ animationDelay: '3s' }}>
            <FloatingChip>
              <div className="flex items-center gap-2">
                <span className="mono text-[8.5px] text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded">★ OPTI</span>
                <span className="text-[11px] font-medium text-white">LMNP réel</span>
              </div>
              <div className="mono text-[8.5px] text-zinc-500 mt-1 uppercase tracking-wider">Régime recommandé</div>
            </FloatingChip>
          </div>

          {/* Bottom-right : Sparkline chip */}
          <div className="absolute bottom-[20%] right-[8%] anim-float-slow" style={{ animationDelay: '4.5s' }}>
            <FloatingChip>
              <div className="mono text-[8.5px] text-zinc-500 uppercase tracking-wider mb-1.5">Patrimoine · 20 ans</div>
              <svg viewBox="0 0 80 24" preserveAspectRatio="none" className="w-20 h-6">
                <path d="M 0 22 Q 20 18 40 10 T 80 2" fill="none" stroke="#34d399" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <div className="mono text-[9px] text-emerald-300 mt-1">+248k €</div>
            </FloatingChip>
          </div>

          {/* Mid-left : PDF chip */}
          <div className="absolute top-[50%] left-[5%] anim-float-slow" style={{ animationDelay: '2.2s' }}>
            <FloatingChip>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-red-500/15 flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 7v13a1 1 0 001 1h12a1 1 0 001-1V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0013.586 3H6a1 1 0 00-1 1v3z" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <div className="text-[10px] font-medium text-white">rapport.pdf</div>
                  <div className="mono text-[8.5px] text-zinc-500">420 Ko</div>
                </div>
              </div>
            </FloatingChip>
          </div>

          {/* Mid-right : Rendement chip */}
          <div className="absolute top-[55%] right-[6%] anim-float-slow" style={{ animationDelay: '3.7s' }}>
            <FloatingChip>
              <div className="mono text-[8.5px] text-zinc-500 uppercase tracking-wider mb-0.5">Rendement net</div>
              <div className="display text-[18px] text-white tabular">5.78%</div>
            </FloatingChip>
          </div>
        </div>
      </div>

      <div className="relative max-w-3xl mx-auto px-6 lg:px-10 text-center space-y-9 reveal">
        <h2 className="display-lg text-[clamp(2.8rem,6vw,5rem)] gt-white">
          Votre prochain investissement<br />
          <span className="serif-italic gradient-text">commence ici.</span>
        </h2>
        <p className="text-[17px] text-zinc-400 leading-[1.55] max-w-xl mx-auto">
          Analysez un bien en 30 secondes. Gratuit, sans inscription.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button onClick={onPrimary} className="group relative inline-flex items-center gap-2 bg-white text-zinc-950 text-[15px] font-medium px-6 py-3.5 rounded-lg transition-all duration-300 hover:shadow-[0_0_56px_-4px_rgba(255,255,255,0.5)] hover:-translate-y-0.5">
            <span className="absolute -inset-px rounded-lg bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
            <span className="relative">Commencer maintenant</span>
            <svg className="relative w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        <p className="mono text-[11px] text-zinc-600 pt-2 tracking-wider">
          Aucune carte requise · Résultats en 30 secondes
        </p>
      </div>
    </section>
  )
}

function FloatingChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl px-3 py-2.5 shadow-2xl backdrop-blur-xl">
      {children}
    </div>
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
          <span className="mono text-[11px] text-zinc-500 tracking-wider">Immolyse © {new Date().getFullYear()}</span>
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
