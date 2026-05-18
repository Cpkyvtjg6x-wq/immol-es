'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ExpressForm } from '@/components/app/ExpressForm'
import { AdvancedForm } from '@/components/app/AdvancedForm'
import { KpiGrid } from '@/components/app/KpiGrid'
import { ScoreCard } from '@/components/app/ScoreCard'
import { AIInsights } from '@/components/app/AIInsights'
import { DetailedResults } from '@/components/app/DetailedResults'
import { calculateInvestment } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import { InvestmentParams, InvestmentResult, ScoreResult, AIInsight, FiscalRegime } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations } from '@/lib/hooks/useSimulations'
import { SaveModal } from '@/components/app/SaveModal'

type Mode = 'express' | 'advanced'

export default function AnalysePage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('express')
  const [result, setResult] = useState<InvestmentResult | null>(null)
  const [score, setScore] = useState<ScoreResult | null>(null)
  const [insights, setInsights] = useState<AIInsight[] | null>(null)
  const [fiscalResults, setFiscalResults] = useState<FiscalRegime[] | null>(null)
  const [bestFiscal, setBestFiscal] = useState<{ yield: number; regime: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [lastParams, setLastParams] = useState<Partial<InvestmentParams> | null>(null)
  const [lastTmi, setLastTmi] = useState<number>(30)
  const [showResults, setShowResults] = useState(false)
  const [resultsVisible, setResultsVisible] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  const { user } = useAuth()
  const { saveSimulation } = useSimulations(user?.id ?? null)

  useEffect(() => {
    if (showResults) {
      const t = setTimeout(() => setResultsVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [showResults])

  // Express mode (no TMI)
  const handleCalculateExpress = useCallback(async (params: Partial<InvestmentParams>) => {
    setLoading(true)
    setLastParams(params)
    setLastTmi(30)
    setInsights(null)
    setResultsVisible(false)
    setFiscalResults(null)
    setBestFiscal(null)

    await new Promise((r) => setTimeout(r, 400))

    const res = calculateInvestment(params as InvestmentParams)
    const sc = calculateScore(res, null, null)

    setResult(res)
    setScore(sc)
    setShowResults(true)
    setLoading(false)
  }, [])

  // Advanced mode (with TMI → full fiscal)
  const handleCalculateAdvanced = useCallback(async (params: Partial<InvestmentParams>, tmi: number) => {
    setLoading(true)
    setLastParams(params)
    setLastTmi(tmi)
    setInsights(null)
    setResultsVisible(false)

    await new Promise((r) => setTimeout(r, 500))

    const res = calculateInvestment(params as InvestmentParams)

    // Compute full fiscal analysis
    const fiscalResult = calculateFiscal(
      {
        tmi,
        prixAchat: (params as InvestmentParams).prixAchat,
        travaux: (params as InvestmentParams).travaux ?? 0,
        prixRevient: res.prixRevient,
        locType: (params as InvestmentParams).locType,
        lmpEnabled: false,
        sciIS: false,
        sarlFamille: false,
      },
      res
    )

    const enabledRegimes = fiscalResult.regimes.filter((r) => !r.disabled)
    const sortedRegimes = [...enabledRegimes].sort((a, b) => b.rendNetNet - a.rendNetNet)
    const best = sortedRegimes[0]

    const sc = calculateScore(res, fiscalResult, null)

    setResult(res)
    setScore(sc)
    setFiscalResults(fiscalResult.regimes)
    setBestFiscal(best ? { yield: best.rendNetNet, regime: best.name } : null)
    setShowResults(true)
    setLoading(false)
  }, [])

  const handleGenerateAI = useCallback(async () => {
    if (!lastParams || !result) return
    setAiLoading(true)

    try {
      const res = await fetch('/api/ai-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: lastParams, result }),
      })
      const data = await res.json()
      if (data.insights) setInsights(data.insights)
    } catch {
      console.error('AI analyse failed')
    } finally {
      setAiLoading(false)
    }
  }, [lastParams, result])

  const handleSave = useCallback(() => {
    setSaveModalOpen(true)
  }, [])

  const handleDoSave = useCallback(async (name: string) => {
    if (!result || !score || !lastParams) return { error: 'Aucun résultat à sauvegarder' }
    return saveSimulation({ name, params: lastParams, results: result, score })
  }, [result, score, lastParams, saveSimulation])

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <SaveModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        isLoggedIn={!!user}
        result={result}
        score={score}
        params={lastParams}
        onSave={handleDoSave}
      />
      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center transition-transform group-hover:scale-105">
                <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-white tracking-tight">Immolyse</span>
            </button>
            <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[13px] text-zinc-400 font-medium">Analyser</span>
            {result && (
              <>
                <svg className="w-4 h-4 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[13px] text-zinc-500">{result.ville} · {formatCurrency(result.prixRevient)}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Sauvegarder
              </button>
            )}
            <button
              onClick={() => router.push('/auth/login')}
              className="text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Connexion
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-[13px] font-semibold bg-white text-zinc-950 px-3.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Commencer gratuitement
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="pt-14 flex min-h-screen">
        {/* ── Left panel: Form ── */}
        <aside className="w-[360px] shrink-0 border-r border-white/[0.05] flex flex-col">
          <div className="sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
            <div className="p-6">
              {/* Mode toggle */}
              <div className="mb-6 flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                {(['express', 'advanced'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                      mode === m
                        ? 'bg-white text-zinc-950 shadow-sm'
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {m === 'express' ? '⚡ Express' : '🔬 Avancé'}
                  </button>
                ))}
              </div>

              {mode === 'express' ? (
                <ExpressForm onCalculate={handleCalculateExpress} loading={loading} />
              ) : (
                <AdvancedForm onCalculate={handleCalculateAdvanced} loading={loading} />
              )}
            </div>
          </div>
        </aside>

        {/* ── Right panel: Results ── */}
        <main className="flex-1 min-w-0 overflow-auto">
          {/* Empty state */}
          {!showResults && !loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-56px)] text-center px-8 relative">
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full anim-glow"
                  style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)' }}
                />
              </div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-6 mx-auto">
                  <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                  {mode === 'express' ? 'Analyse rapide' : 'Analyse complète'}
                </h2>
                <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
                  {mode === 'express'
                    ? 'Renseignez les paramètres à gauche et obtenez votre score en 30 secondes.'
                    : 'Le mode Avancé calcule les 10 régimes fiscaux et la comparaison nette-nette.'}
                </p>
                {mode === 'advanced' && (
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    {['PTZ', 'GLI', 'CFE', 'LMNP Réel', 'SCI IS', 'Projection 20 ans'].map((tag) => (
                      <span key={tag} className="text-[11px] text-zinc-600 bg-white/[0.04] border border-white/[0.07] px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-56px)] gap-4">
              <div className="relative w-10 h-10">
                <div className="w-10 h-10 border border-white/[0.08] rounded-full" />
                <div className="absolute inset-0 w-10 h-10 border-t border-emerald-500 rounded-full animate-spin" />
              </div>
              <p className="text-sm text-zinc-500">
                {mode === 'advanced' ? 'Calcul des 10 régimes fiscaux…' : 'Analyse en cours…'}
              </p>
            </div>
          )}

          {/* Results */}
          {showResults && result && score && !loading && (
            <div
              className="transition-all duration-700"
              style={{
                opacity: resultsVisible ? 1 : 0,
                transform: resultsVisible ? 'translateY(0)' : 'translateY(16px)',
              }}
            >
              {/* Results header */}
              <div className="border-b border-white/[0.05] px-8 py-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-0.5">
                    <h2 className="text-base font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>
                      Analyse {mode === 'advanced' ? 'complète' : 'rapide'}
                    </h2>
                    {mode === 'advanced' && fiscalResults && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Fiscal inclus
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{result.ville} · {formatCurrency(result.prixRevient)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-zinc-500">Calculé</span>
                  </div>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Sauvegarder
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 py-8 space-y-8 max-w-5xl">
                {/* Score */}
                <ScoreCard score={score} />

                {/* KPIs — avec nette-nette si mode avancé */}
                <div>
                  <SectionLabel>Indicateurs clés</SectionLabel>
                  <KpiGrid
                    result={result}
                    netNetYield={bestFiscal?.yield}
                    netNetRegime={bestFiscal?.regime}
                  />
                </div>

                {/* AI */}
                <div>
                  <SectionLabel>Analyse IA</SectionLabel>
                  <AIInsights
                    insights={insights}
                    loading={aiLoading}
                    onGenerate={handleGenerateAI}
                    isPro={false}
                  />
                </div>

                {/* Detailed tabs */}
                <div>
                  <SectionLabel>Détails, fiscalité & projections</SectionLabel>
                  <DetailedResults result={result} fiscalResults={fiscalResults} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">{children}</p>
  )
}
