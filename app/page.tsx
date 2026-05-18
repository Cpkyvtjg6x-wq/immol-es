'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/landing/Navbar'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'

/* ─── Reveal hook ──────────────────────────────────────────────────────────── */
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

/* ─── Noise texture SVG (inline, no external) ──────────────────────────────── */
const noiseSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`

/* ════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useReveal()
  const router = useRouter()

  return (
    <div className="bg-[#09090b] text-white overflow-x-hidden">
      <Navbar />

      {/* S1 — HERO */}
      <HeroSection onCta={() => router.push('/analyse')} />

      {/* S2 — PROBLEM */}
      <ProblemSection />

      {/* S3 — SOLUTION / PRODUCT PREVIEW */}
      <SolutionSection />

      {/* S4 — LIVE CALCULATOR SHOWCASE */}
      <CalculatorSection onCta={() => router.push('/analyse')} />

      {/* S5 — RESULT PREVIEW */}
      <ResultSection />

      {/* S6 — CTA FINAL */}
      <CtaSection onCta={() => router.push('/analyse')} />

      {/* FOOTER minimal */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-zinc-600 text-sm">Immolyse © 2026</span>
          </div>
          <div className="flex gap-6">
            {['CGU', 'Confidentialité', 'Contact'].map((l) => (
              <a key={l} href="#" className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 1 — HERO
   ══════════════════════════════════════════════════════════════════════════ */
function HeroSection({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-8 text-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full anim-glow pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.14) 0%, transparent 70%)' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)'
        }} />

      <div className="relative max-w-4xl space-y-8 anim-fadein">
        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Analyse en 30 secondes · Gratuit pour commencer
        </div>

        {/* Main headline */}
        <h1 className="text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[1.05] tracking-[-0.04em]">
          <span className="gt-white">Analysez un investissement</span>
          <br />
          <span className="gt-em">immobilier en 30 secondes.</span>
        </h1>

        {/* Sub */}
        <p className="text-[clamp(1rem,2vw,1.25rem)] text-zinc-500 max-w-xl mx-auto leading-relaxed font-light">
          Rendement, cashflow, fiscalité optimale — tout calculé automatiquement.
          <br />
          Sans Excel. Sans expert. Maintenant.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onCta}
            className="group flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-base px-8 py-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            Analyser un bien gratuitement
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <span className="text-sm text-zinc-600">Aucune carte bancaire requise</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-30">
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-zinc-500" />
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 2 — PROBLEM
   ══════════════════════════════════════════════════════════════════════════ */
function ProblemSection() {
  return (
    <section className="relative py-40 px-8 overflow-hidden">
      {/* Subtle side glow */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />

      <div className="max-w-4xl mx-auto">
        <p className="reveal text-sm text-zinc-600 tracking-widest uppercase font-medium mb-12">
          Le problème
        </p>

        <h2 className="reveal text-[clamp(2rem,5vw,3.75rem)] font-black leading-[1.1] tracking-[-0.03em] text-white mb-10">
          Les investisseurs prennent leurs décisions{' '}
          <span style={{ color: '#3f3f46' }}>sur de mauvaises données.</span>
        </h2>

        <div className="reveal reveal-d2 grid md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden">
          {[
            { n: '73%', label: 'des investisseurs calculent à la main ou sur Excel' },
            { n: '2h', label: 'en moyenne pour analyser un seul bien correctement' },
            { n: '1/3', label: 'des projets rentent moins bien que prévu faute d\'analyse fiscale' },
          ].map((s) => (
            <div key={s.n} className="bg-[#0d0d0f] px-8 py-10 space-y-3">
              <div className="text-4xl font-black text-white tracking-tight">{s.n}</div>
              <div className="text-sm text-zinc-500 leading-relaxed">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 3 — SOLUTION / PRODUCT PREVIEW
   ══════════════════════════════════════════════════════════════════════════ */
function SolutionSection() {
  const features = [
    {
      tag: 'Cashflow réel',
      title: 'Chaque euro, au centime près.',
      desc: 'Loyers, charges, mensualités, vacance locative — le cashflow net affiché en temps réel pendant que vous saisissez.',
      preview: <CashflowPreview />,
    },
    {
      tag: 'Fiscalité automatique',
      title: '10 régimes calculés en une seconde.',
      desc: 'Micro-foncier, LMNP Réel, SCI IS, SARL de famille… L\'outil compare tout et recommande le régime qui vous économise le plus.',
      preview: <FiscalPreview />,
    },
    {
      tag: 'Score investissement',
      title: 'Un verdict clair, immédiatement.',
      desc: 'Notre algorithme note le projet de 0 à 100 sur 4 critères : rentabilité, cashflow, fiscalité, marché local.',
      preview: <ScorePreview />,
    },
  ]

  return (
    <section className="py-32 px-8">
      <div className="max-w-6xl mx-auto">
        <div className="reveal mb-24 max-w-2xl">
          <p className="text-sm text-zinc-600 tracking-widest uppercase font-medium mb-6">La solution</p>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-black leading-[1.1] tracking-[-0.03em]">
            <span className="gt-white">Un seul outil.</span>
            <br />
            <span style={{ color: '#3f3f46' }}>Toute l'analyse.</span>
          </h2>
        </div>

        <div className="space-y-32">
          {features.map((f, i) => (
            <div
              key={f.tag}
              className={`reveal grid md:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
            >
              {/* Text */}
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 text-xs text-emerald-400 font-semibold tracking-widest uppercase bg-emerald-500/10 border border-emerald-500/15 rounded-full px-3 py-1">
                  {f.tag}
                </div>
                <h3 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-white">
                  {f.title}
                </h3>
                <p className="text-base text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>

              {/* Preview card */}
              <div className={`reveal reveal-d2 ${i % 2 === 1 ? 'md:order-1' : ''}`}>
                {f.preview}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Mini preview components ──────────────────────────────────────────────── */
function CashflowPreview() {
  return (
    <div className="glass rounded-2xl p-6 space-y-4 anim-float">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-600 font-medium">Cashflow mensuel</span>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Temps réel</span>
      </div>
      <div className="text-5xl font-black text-emerald-400 tracking-tight">+320 €</div>
      <div className="text-xs text-zinc-600">par mois · après crédit et charges</div>
      <div className="h-px bg-white/[0.05]" />
      {[
        { label: 'Loyers encaissés', val: '+1 050 €', c: 'text-white' },
        { label: 'Charges annualisées', val: '-280 €', c: 'text-zinc-500' },
        { label: 'Mensualité crédit', val: '-450 €', c: 'text-zinc-500' },
      ].map((r) => (
        <div key={r.label} className="flex justify-between text-sm">
          <span className="text-zinc-600">{r.label}</span>
          <span className={`font-semibold ${r.c}`}>{r.val}</span>
        </div>
      ))}
    </div>
  )
}

function FiscalPreview() {
  const regimes = [
    { name: 'LMNP Réel', rend: '4.2%', badge: 'Recommandé', em: true },
    { name: 'Micro-BIC', rend: '2.8%', badge: null, em: false },
    { name: 'Réel foncier', rend: '3.1%', badge: null, em: false },
    { name: 'Micro-foncier', rend: '2.1%', badge: null, em: false },
  ]
  return (
    <div className="glass rounded-2xl p-6 space-y-3 anim-float2">
      <div className="text-xs text-zinc-600 font-medium mb-4">Comparaison des régimes fiscaux</div>
      {regimes.map((r) => (
        <div key={r.name} className={`flex items-center justify-between px-4 py-3 rounded-xl ${r.em ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.03]'}`}>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold ${r.em ? 'text-white' : 'text-zinc-500'}`}>{r.name}</span>
            {r.badge && <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">{r.badge}</span>}
          </div>
          <span className={`text-sm font-bold ${r.em ? 'text-emerald-400' : 'text-zinc-600'}`}>{r.rend}</span>
        </div>
      ))}
    </div>
  )
}

function ScorePreview() {
  return (
    <div className="glass rounded-2xl p-6 anim-float">
      <div className="text-xs text-zinc-600 font-medium mb-6">Score d'opportunité</div>
      <div className="flex items-center gap-5 mb-6">
        <div>
          <span className="text-6xl font-black text-emerald-400">78</span>
          <span className="text-zinc-600 text-xl">/100</span>
        </div>
        <div>
          <div className="text-white font-semibold">Bon projet</div>
          <div className="text-zinc-600 text-xs mt-1">Analyse multi-critères</div>
        </div>
      </div>
      {[
        { label: 'Rentabilité', v: 80 },
        { label: 'Cashflow', v: 70 },
        { label: 'Fiscalité', v: 85 },
        { label: 'Marché', v: 75 },
      ].map((s) => (
        <div key={s.label} className="flex items-center gap-3 mb-2.5">
          <span className="text-xs text-zinc-600 w-20">{s.label}</span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.v}%` }} />
          </div>
          <span className="text-xs text-zinc-500 w-7 text-right">{s.v}</span>
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 4 — CALCULATOR SHOWCASE (interactif)
   ══════════════════════════════════════════════════════════════════════════ */
function CalculatorSection({ onCta }: { onCta: () => void }) {
  const [prix, setPrix] = useState(220000)
  const [loyer, setLoyer] = useState(980)

  const result = calculateInvestment({
    ...DEFAULT_PARAMS,
    prixAchat: prix,
    loyerNu: loyer,
    loyerMeuble: Math.round(loyer * 1.1),
  })

  const cfColor = result.cashflowMensuel >= 0 ? '#10b981' : '#ef4444'
  const brutColor = result.rendBrut >= 7 ? '#10b981' : result.rendBrut >= 5 ? '#f59e0b' : '#ef4444'

  return (
    <section className="relative py-32 px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.05) 0%, transparent 65%)' }} />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="reveal text-center mb-20">
          <p className="text-sm text-zinc-600 tracking-widest uppercase font-medium mb-6">Le produit</p>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-black leading-tight tracking-[-0.03em]">
            <span className="gt-white">Essayez maintenant.</span>
          </h2>
          <p className="text-zinc-600 mt-4 text-lg">Bougez les sliders — les résultats s'adaptent en temps réel.</p>
        </div>

        <div className="reveal reveal-d1 glass rounded-3xl overflow-hidden">
          <div className="grid md:grid-cols-[1fr_1.4fr]">
            {/* Left — inputs */}
            <div className="p-8 border-r border-white/[0.05] space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs text-zinc-600 uppercase tracking-widest font-medium">Prix d'achat</label>
                  <span className="text-white font-bold text-sm">{formatCurrency(prix)}</span>
                </div>
                <input type="range" min={50000} max={800000} step={5000} value={prix}
                  onChange={(e) => setPrix(+e.target.value)} />
                <div className="flex justify-between mt-2 text-xs text-zinc-700">
                  <span>50k</span><span>800k</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs text-zinc-600 uppercase tracking-widest font-medium">Loyer mensuel</label>
                  <span className="text-white font-bold text-sm">{loyer} €</span>
                </div>
                <input type="range" min={300} max={4000} step={50} value={loyer}
                  onChange={(e) => setLoyer(+e.target.value)} />
                <div className="flex justify-between mt-2 text-xs text-zinc-700">
                  <span>300€</span><span>4 000€</span>
                </div>
              </div>

              <div className="text-xs text-zinc-700 pt-4 border-t border-white/[0.04]">
                Apport 10% · Taux 3.8% · 20 ans · Lyon
              </div>

              <button onClick={onCta}
                className="w-full bg-white text-zinc-950 font-bold text-sm py-3.5 rounded-xl hover:bg-zinc-100 transition-all hover:scale-[1.01] active:scale-[0.99]">
                Analyse complète gratuite →
              </button>
            </div>

            {/* Right — results */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Rendement brut', val: `${result.rendBrut.toFixed(1)}%`, color: brutColor },
                  { label: 'Rendement net', val: `${result.rendNet.toFixed(1)}%`, color: brutColor },
                  {
                    label: 'Cashflow mensuel',
                    val: `${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`,
                    color: cfColor
                  },
                  { label: 'Prix de revient', val: formatCurrency(result.prixRevient), color: '#fff' },
                ].map((k) => (
                  <div key={k.label} className="bg-white/[0.03] rounded-2xl p-5">
                    <div className="text-xs text-zinc-600 mb-2">{k.label}</div>
                    <div className="text-2xl font-black" style={{ color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Bar visualization */}
              <div className="bg-white/[0.03] rounded-2xl p-5 space-y-3">
                <div className="text-xs text-zinc-600 mb-4">Décomposition mensuelle</div>
                {[
                  { label: 'Loyers', val: loyer, max: loyer, color: '#10b981' },
                  { label: 'Mensualité crédit', val: result.mensualiteCredit, max: loyer, color: '#6366f1' },
                  { label: 'Charges', val: result.totalCharges / 12, max: loyer, color: '#f59e0b' },
                ].map((b) => (
                  <div key={b.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">{b.label}</span>
                      <span className="text-zinc-400 font-medium">{Math.round(b.val)} €</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (b.val / b.max) * 100)}%`, background: b.color }} />
                    </div>
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

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 5 — RESULT PREVIEW
   ══════════════════════════════════════════════════════════════════════════ */
function ResultSection() {
  return (
    <section className="py-32 px-8 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div className="reveal text-center mb-20">
          <p className="text-sm text-zinc-600 tracking-widest uppercase font-medium mb-6">Le résultat</p>
          <h2 className="text-[clamp(2rem,4.5vw,3.5rem)] font-black leading-tight tracking-[-0.03em]">
            <span className="gt-white">Une décision éclairée.</span>
            <br />
            <span style={{ color: '#3f3f46' }}>En moins d'une minute.</span>
          </h2>
        </div>

        <div className="reveal grid md:grid-cols-3 gap-5">
          {/* Score card */}
          <div className="glass rounded-2xl p-7 space-y-5 anim-float">
            <div className="text-xs text-zinc-600 uppercase tracking-widest">Score</div>
            <div className="flex items-end gap-2">
              <span className="text-7xl font-black text-emerald-400 leading-none">82</span>
              <span className="text-zinc-600 text-2xl pb-2">/100</span>
            </div>
            <div className="text-white font-semibold">Excellent projet</div>
            <div className="h-px bg-white/[0.05]" />
            <p className="text-xs text-zinc-600 leading-relaxed">
              Avec un rendement brut de 7.1% et un cashflow positif, ce projet présente d'excellentes performances pour Lyon.
            </p>
          </div>

          {/* AI insights */}
          <div className="glass rounded-2xl p-7 space-y-4 anim-float2">
            <div className="flex items-center gap-2 text-xs text-zinc-600 uppercase tracking-widest">
              <span className="text-emerald-400">✦</span> Analyse IA
            </div>
            {[
              { type: 'Opportunité', text: 'LMNP Réel efface l\'imposition via l\'amortissement. +1.3% de rendement vs Micro-BIC.', em: true },
              { type: 'Risque', text: 'Vacance locative sous-estimée pour un T2. Prévoir 15 jours/an minimum.', em: false },
              { type: 'Optimisation', text: 'Renégociez le prix à 205 000€ pour atteindre un cashflow de +180€/mois.', em: false },
            ].map((i) => (
              <div key={i.type} className={`rounded-xl p-3.5 space-y-1 ${i.em ? 'bg-emerald-500/10 border border-emerald-500/15' : 'bg-white/[0.03]'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-widest ${i.em ? 'text-emerald-400' : 'text-zinc-600'}`}>{i.type}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{i.text}</p>
              </div>
            ))}
          </div>

          {/* KPIs */}
          <div className="glass rounded-2xl p-7 space-y-4 anim-float">
            <div className="text-xs text-zinc-600 uppercase tracking-widest">Indicateurs clés</div>
            {[
              { label: 'Rendement brut', val: '7.1%', good: true },
              { label: 'Rendement net', val: '5.3%', good: true },
              { label: 'Nette-nette', val: '4.2%', good: true },
              { label: 'Cashflow', val: '+312 €/mois', good: true },
              { label: 'ROI apport', val: '18.7%', good: true },
              { label: 'Point mort', val: '660 €/mois', good: null },
            ].map((k) => (
              <div key={k.label} className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">{k.label}</span>
                <span className={`text-sm font-bold ${k.good === true ? 'text-emerald-400' : 'text-white'}`}>{k.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
   SECTION 6 — CTA FINAL
   ══════════════════════════════════════════════════════════════════════════ */
function CtaSection({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative py-40 px-8 overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full anim-glow pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)' }} />

      <div className="relative max-w-3xl mx-auto text-center space-y-8">
        <div className="reveal">
          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-black leading-[1.05] tracking-[-0.04em]">
            <span className="gt-white">Tester un bien</span>
            <br />
            <span className="gt-em">maintenant.</span>
          </h2>
        </div>

        <p className="reveal reveal-d1 text-lg text-zinc-600 font-light">
          Gratuit. Sans compte. Résultat en 30 secondes.
        </p>

        <div className="reveal reveal-d2">
          <button
            onClick={onCta}
            className="group inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-lg px-10 py-5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-emerald-500/20"
          >
            Analyser un investissement
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        <p className="reveal reveal-d3 text-xs text-zinc-700">
          Aucune carte bancaire · Résiliation à tout moment · Données sécurisées
        </p>
      </div>
    </section>
  )
}
