'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { formatCurrency, formatPct } from '@/lib/utils'
import { VILLES } from '@/lib/market-data'

export function Hero() {
  const router = useRouter()
  const [params, setParams] = useState({
    prixAchat: 200000,
    loyerMensuel: 950,
    ville: 'Lyon',
  })
  const [result, setResult] = useState<ReturnType<typeof calculateInvestment> | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = () => {
    setLoading(true)
    setTimeout(() => {
      const res = calculateInvestment({
        ...DEFAULT_PARAMS,
        prixAchat: params.prixAchat,
        loyerNu: params.loyerMensuel,
        loyerMeuble: params.loyerMensuel,
        ville: params.ville,
      })
      setResult(res)
      setLoading(false)
    }, 400)
  }

  const villes = Object.keys(VILLES)

  const scoreColor = result
    ? result.rendBrut >= 8 ? 'text-emerald-400' : result.rendBrut >= 5 ? 'text-amber-400' : 'text-red-400'
    : ''

  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center w-full">
        {/* Left: Copy */}
        <div className="space-y-8">
          <div className="space-y-4">
            <Badge variant="emerald" className="text-sm px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Analyse IA incluse · Gratuit pour commencer
            </Badge>

            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              Analysez un investissement{' '}
              <span className="gradient-text">en 30 secondes</span>
            </h1>

            <p className="text-xl text-zinc-400 leading-relaxed">
              Rendement, cashflow, fiscalité optimale et score d'opportunité.
              Tout ce dont un investisseur immobilier a besoin — sans Excel.
            </p>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {['A', 'M', 'S', 'T', 'J'].map((l, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-500 border-2 border-zinc-950 flex items-center justify-center text-xs font-bold text-white"
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-zinc-400">
              <span className="text-white font-semibold">+1 200 investisseurs</span>{' '}
              font confiance à Immolyse
            </p>
          </div>

          {/* Feature bullets */}
          <div className="grid grid-cols-2 gap-3">
            {[
              'Rendement brut, net, nette-nette',
              '10 régimes fiscaux analysés',
              'Score IA d\'opportunité',
              'Export PDF & Excel',
              'Simulation multi-scénarios',
              'Données marché locales',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-zinc-400">
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {feat}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button size="xl" onClick={() => router.push('/analyse')}>
              Analyser gratuitement
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button size="xl" variant="ghost" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              Voir les fonctionnalités
            </Button>
          </div>
        </div>

        {/* Right: Mini calculator */}
        <div className="relative">
          <div className="glass-card rounded-3xl p-6 border border-zinc-800/60">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-white">Analyse express</h3>
              <Badge variant="emerald">Gratuit</Badge>
            </div>

            <div className="space-y-4">
              {/* Prix d'achat */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Prix d'achat</label>
                <div className="relative">
                  <input
                    type="range"
                    min={50000}
                    max={1000000}
                    step={5000}
                    value={params.prixAchat}
                    onChange={(e) => setParams(p => ({ ...p, prixAchat: +e.target.value }))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-zinc-500">50k</span>
                    <span className="text-sm font-semibold text-emerald-400">{formatCurrency(params.prixAchat)}</span>
                    <span className="text-xs text-zinc-500">1M</span>
                  </div>
                </div>
              </div>

              {/* Loyer */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Loyer mensuel estimé</label>
                <div className="relative">
                  <input
                    type="range"
                    min={200}
                    max={5000}
                    step={50}
                    value={params.loyerMensuel}
                    onChange={(e) => setParams(p => ({ ...p, loyerMensuel: +e.target.value }))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-zinc-500">200€</span>
                    <span className="text-sm font-semibold text-emerald-400">{params.loyerMensuel} €/mois</span>
                    <span className="text-xs text-zinc-500">5 000€</span>
                  </div>
                </div>
              </div>

              {/* Ville */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Ville</label>
                <select
                  value={params.ville}
                  onChange={(e) => setParams(p => ({ ...p, ville: e.target.value }))}
                  className="w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                >
                  {villes.map((v) => (
                    <option key={v} value={v} className="bg-zinc-900">{v}</option>
                  ))}
                </select>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCalculate}
                loading={loading}
              >
                Calculer le rendement
              </Button>
            </div>

            {/* Result */}
            {result && (
              <div className="mt-5 pt-5 border-t border-zinc-800 space-y-3 animate-fade-in">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
                    <div className={`text-xl font-bold ${scoreColor}`}>
                      {formatPct(result.rendBrut)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">Brut</div>
                  </div>
                  <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
                    <div className={`text-xl font-bold ${scoreColor}`}>
                      {formatPct(result.rendNet)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">Net</div>
                  </div>
                  <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
                    <div className={`text-xl font-bold ${result.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {result.cashflowMensuel >= 0 ? '+' : ''}{Math.round(result.cashflowMensuel)} €
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">CF/mois</div>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  size="md"
                  onClick={() => router.push('/analyse')}
                >
                  Analyse complète gratuite →
                </Button>
              </div>
            )}
          </div>

          {/* Floating badge */}
          <div className="absolute -top-4 -right-4 bg-emerald-500 text-zinc-950 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 rotate-3">
            IA incluse
          </div>
        </div>
      </div>
    </section>
  )
}
