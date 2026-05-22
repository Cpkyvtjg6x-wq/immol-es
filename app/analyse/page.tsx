'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CalculateurForm } from '@/components/app/CalculateurForm'
import { KpiGrid } from '@/components/app/KpiGrid'
import { ScoreCard } from '@/components/app/ScoreCard'
import { AIInsights } from '@/components/app/AIInsights'
import { DetailedResults } from '@/components/app/DetailedResults'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import { InvestmentParams, InvestmentResult, ScoreResult, AIInsight, FiscalRegime } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations } from '@/lib/hooks/useSimulations'
import { SaveModal } from '@/components/app/SaveModal'
import { AppShell } from '@/components/app/AppShell'
import { ExportButtons } from '@/components/app/ExportButtons'
import { ScenarioPanel } from '@/components/app/ScenarioPanel'
import { MarketContextBlock } from '@/components/app/MarketContextBlock'
import type { LocalMarketData } from '@/lib/types'

const LS_KEY = 'immolyse_last_params'

function runCalculation(params: InvestmentParams) {
  const res = calculateInvestment(params)
  const fiscalResult = calculateFiscal(
    {
      tmi: params.tmi,
      prixAchat: params.prixAchat,
      travaux: params.travaux ?? 0,
      prixRevient: res.prixRevient,
      locType: params.locType,
      lmpEnabled: params.lmpEnabled,
      sciIS: params.sciIS,
      sarlFamille: params.sarlFamille,
    },
    res
  )
  const enabledRegimes = fiscalResult.regimes.filter((r) => !r.disabled)
  const best = [...enabledRegimes].sort((a, b) => b.rendNetNet - a.rendNetNet)[0]
  const sc = calculateScore(res, fiscalResult, null)
  return { res, fiscalResult, best, sc }
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">{children}</p>
  )
}

// ─── Chip paramètre compact (barre résumé) ────────────────────────────────────

function ParamChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2 py-1">
      <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-bold text-zinc-300 tabular-nums">{value}</span>
    </div>
  )
}

export default function AnalysePage() {
  const router = useRouter()

  const [formKey, setFormKey] = useState(0)   // force remount du form lors d'un apply scénario
  const [initialParams, setInitialParams] = useState<InvestmentParams>(() => {
    if (typeof window === 'undefined') return DEFAULT_PARAMS
    const sp = new URLSearchParams(window.location.search)
    const urlPrix    = sp.get('prix')
    const urlSurface = sp.get('surface')
    const urlVille   = sp.get('ville')
    const urlDpe     = sp.get('dpe')
    const urlLocType = sp.get('locType')
    const urlLoyer   = sp.get('loyer')
    const urlApport  = sp.get('apport')
    const urlTmi     = sp.get('tmi')
    const urlSource  = sp.get('source')

    const urlTravaux  = sp.get('travaux')
    const urlCharges  = sp.get('charges')
    const urlTaxe     = sp.get('taxe')
    const urlPieces   = sp.get('pieces')

    if (urlSource === 'extension' && urlPrix) {
      const prix    = parseInt(urlPrix, 10)
      const surface = urlSurface ? parseInt(urlSurface, 10) : DEFAULT_PARAMS.surface
      const loyer   = urlLoyer   ? parseInt(urlLoyer, 10)   : Math.round(prix * 0.05 / 12)
      const apport  = urlApport  ? parseInt(urlApport, 10)  : Math.round(prix * 0.20)
      const locType = (urlLocType === 'nu' || urlLocType === 'meuble') ? urlLocType : 'meuble'
      // Use API-estimated charges/taxe if available, otherwise fall back to rough estimates
      const chargesCopro = urlCharges  ? parseInt(urlCharges, 10)  : Math.round(surface * 30)
      const taxeFonciere = urlTaxe     ? parseInt(urlTaxe, 10)     : Math.round(prix * 0.005)
      const travaux      = urlTravaux  ? parseInt(urlTravaux, 10)  : 0
      const nbPieces     = urlPieces   ? parseInt(urlPieces, 10)   : DEFAULT_PARAMS.nbChambres
      return {
        ...DEFAULT_PARAMS,
        prixAchat: prix, surface,
        ville:     urlVille ?? DEFAULT_PARAMS.ville,
        dpe:       (urlDpe as InvestmentParams['dpe']) ?? DEFAULT_PARAMS.dpe,
        locType, apport,
        fraisNotaire: Math.round(prix * 0.08),
        fraisNotaireAuto: false,
        loyerMeuble:  locType === 'meuble' ? loyer : DEFAULT_PARAMS.loyerMeuble,
        loyerNu:      locType === 'nu'     ? loyer : DEFAULT_PARAMS.loyerNu,
        tmi:          urlTmi ? parseInt(urlTmi, 10) : DEFAULT_PARAMS.tmi,
        chargesCopro,
        taxeFonciere,
        travaux,
        nbChambres:   nbPieces > 0 ? nbPieces : DEFAULT_PARAMS.nbChambres,
        assurancePno: Math.round(prix * 0.001),
        cfe:          locType === 'meuble' ? 500 : 0,
      }
    }
    try {
      const raw = localStorage.getItem(LS_KEY)
      return raw ? { ...DEFAULT_PARAMS, ...JSON.parse(raw) } : DEFAULT_PARAMS
    } catch { return DEFAULT_PARAMS }
  })

  const [result, setResult]               = useState<InvestmentResult | null>(null)
  const [score, setScore]                 = useState<ScoreResult | null>(null)
  const [insights, setInsights]           = useState<AIInsight[] | null>(null)
  const [fiscalResults, setFiscalResults] = useState<FiscalRegime[] | null>(null)
  const [bestFiscal, setBestFiscal]       = useState<{ yield: number; regime: string } | null>(null)
  const [loading, setLoading]             = useState(false)
  const [liveUpdating, setLiveUpdating]   = useState(false)
  const [aiLoading, setAiLoading]         = useState(false)
  const [lastParams, setLastParams]       = useState<InvestmentParams | null>(null)
  const [marketData, setMarketData]       = useState<LocalMarketData | null>(null)
  const [marketLoading, setMarketLoading] = useState(false)
  const [showResults, setShowResults]     = useState(false)
  const [resultsVisible, setResultsVisible] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  // Panel persistant — ouvert par défaut
  const [panelOpen, setPanelOpen] = useState(true)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { user } = useAuth()
  const { saveSimulation } = useSimulations(user?.id ?? null)

  useEffect(() => {
    if (showResults) {
      const t = setTimeout(() => setResultsVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [showResults])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (sp.get('source') === 'extension' && sp.get('prix')) {
      setTimeout(() => applyCalculation(initialParams, false), 400)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMarketData = useCallback(async (params: InvestmentParams) => {
    const hasLoc = !!(params.ville?.trim() || params.adresse?.trim())
    if (!hasLoc) return
    setMarketLoading(true)
    try {
      const sp = new URLSearchParams({
        ville:     params.ville ?? '',
        cp:        params.codeInsee ?? '',
        surface:   String(params.surface || 50),
        typeBien:  params.typeBien ?? 'Appartement',
        locType:   params.locType ?? 'meuble',
        prixAchat: String(params.prixAchat || 0),
      })
      if (params.lat)     sp.set('lat', String(params.lat))
      if (params.lng)     sp.set('lng', String(params.lng))
      if (params.adresse) sp.set('adresse', params.adresse)
      if (params.quartier) sp.set('quartier', params.quartier)
      const res = await fetch(`/api/market-analysis?${sp.toString()}`)
      if (res.ok) {
        const data: LocalMarketData = await res.json()
        setMarketData(data)
      }
    } catch { /* silently ignore */ }
    finally { setMarketLoading(false) }
  }, [])

  const applyCalculation = useCallback((params: InvestmentParams, isLive = false) => {
    if (params.prixAchat <= 0) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(params)) } catch {}
    setLastParams(params)
    if (!isLive) { setInsights(null); setResultsVisible(false) }
    const { res, fiscalResult, best, sc } = runCalculation(params)
    setResult(res)
    setScore(sc)
    setFiscalResults(fiscalResult.regimes)
    setBestFiscal(best ? { yield: best.rendNetNet, regime: best.name } : null)
    setShowResults(true)
    if (!isLive) setResultsVisible(true)
    setLiveUpdating(false)
    // Fetch market data (debounced — only when localisation changes)
    if (!isLive || params.ville !== lastParams?.ville || params.lat !== lastParams?.lat) {
      fetchMarketData(params)
    }
  }, [fetchMarketData, lastParams?.ville, lastParams?.lat])

  const handleChange = useCallback((params: InvestmentParams) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (params.prixAchat <= 0) return
    setLiveUpdating(true)
    debounceRef.current = setTimeout(() => applyCalculation(params, true), 700)
  }, [applyCalculation])

  const handleCalculate = useCallback(async (params: InvestmentParams) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    await new Promise((r) => setTimeout(r, 300))
    applyCalculation(params, false)
    setLoading(false)
  }, [applyCalculation])

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
    } catch { console.error('AI analyse failed') }
    finally { setAiLoading(false) }
  }, [lastParams, result])

  const handleSave = useCallback(() => setSaveModalOpen(true), [])
  const handleDoSave = useCallback(async (name: string) => {
    if (!result || !score || !lastParams) return { error: 'Aucun résultat à sauvegarder' }
    return saveSimulation({ name, params: lastParams as Partial<InvestmentParams>, results: result, score })
  }, [result, score, lastParams, saveSimulation])

  // Loyer affiché dans la barre résumé
  const displayLoyer = lastParams
    ? lastParams.locType === 'meuble' || lastParams.locType === 'saisonnier'
      ? lastParams.loyerMeuble
      : lastParams.locType === 'coloc'
      ? lastParams.loyerParChambre * lastParams.nbChambres
      : lastParams.loyerNu
    : 0

  return (
    <AppShell>
      <div className="bg-[#09090b] text-white flex flex-col" style={{ height: '100dvh' }}>

        <SaveModal
          isOpen={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          isLoggedIn={!!user}
          result={result}
          score={score}
          params={lastParams}
          onSave={handleDoSave}
        />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="shrink-0 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.05] h-14 flex items-center justify-between px-5 gap-4">

          {/* Gauche : toggle panel + breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              title={panelOpen ? 'Réduire le panneau' : 'Ouvrir le panneau'}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                panelOpen
                  ? 'bg-white/[0.08] text-white'
                  : 'bg-white/[0.04] text-zinc-500 hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {panelOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                }
              </svg>
            </button>

            {result ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] text-zinc-500 font-medium shrink-0">Analyser</span>
                <svg className="w-3.5 h-3.5 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[13px] text-zinc-300 truncate">
                  {result.ville} · {formatCurrency(result.prixRevient)}
                </span>
              </div>
            ) : (
              <span className="text-[13px] font-semibold text-white">Analyser un bien</span>
            )}
          </div>

          {/* Droite : statut + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {showResults && (
              <div className="flex items-center gap-1.5 mr-1">
                {liveUpdating ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[11px] text-zinc-600 hidden sm:block">Mise à jour…</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-zinc-600 hidden sm:block">Calculé</span>
                  </>
                )}
              </div>
            )}

            {result && (
              <>
                <ExportButtons
                  result={result}
                  fiscalResults={fiscalResults}
                  params={lastParams}
                  score={score}
                  simName={`${result.ville} — ${new Date().toLocaleDateString('fr-FR')}`}
                />
                <button
                  onClick={() => router.push('/rapport-bancaire')}
                  className="hidden md:flex items-center gap-1.5 text-[12px] font-semibold text-zinc-300 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-lg hover:bg-white/[0.09] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Dossier bancaire
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/[0.18] transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Sauvegarder
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Corps split-view ─────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Panel formulaire ─────────────────────────────────────────── */}
          <aside
            className="shrink-0 border-r border-white/[0.05] flex flex-col bg-[#0c0c0e] overflow-hidden"
            style={{
              width: panelOpen ? '560px' : '44px',
              transition: 'width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {panelOpen ? (
              /* ── Panel ouvert ── */
              <>
                {/* En-tête du panel */}
                <div className="shrink-0 h-9 px-4 border-b border-white/[0.05] flex items-center justify-between bg-[#0c0c0e]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                      Paramètres du bien
                    </p>
                  </div>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
                    title="Réduire"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                    </svg>
                  </button>
                </div>

                {/* Formulaire — scroll interne géré par le composant */}
                <div className="flex-1 overflow-hidden">
                  <CalculateurForm
                    key={formKey}
                    onCalculate={handleCalculate}
                    onChange={handleChange}
                    loading={loading}
                    initialParams={initialParams}
                    result={result}
                  />
                </div>
              </>
            ) : (
              /* ── Panel réduit — strip vertical ── */
              <div
                className="flex-1 flex flex-col items-center pt-3 pb-4 gap-3 cursor-pointer hover:bg-white/[0.015] transition-colors"
                onClick={() => setPanelOpen(true)}
                title="Ouvrir les paramètres"
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p
                  className="text-[9px] font-semibold text-zinc-700 uppercase tracking-widest select-none"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  Paramètres
                </p>
              </div>
            )}
          </aside>

          {/* ── Zone résultats ──────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 overflow-y-auto bg-[#09090b]">

            {/* Barre résumé des paramètres (panel fermé + résultats présents) */}
            {!panelOpen && lastParams && showResults && (
              <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-[#09090b]/95 backdrop-blur-sm px-6 py-2 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {lastParams.prixAchat > 0 && (
                    <ParamChip
                      label="Prix"
                      value={
                        lastParams.prixAchat >= 1_000_000
                          ? `${(lastParams.prixAchat / 1_000_000).toFixed(2)} M€`
                          : `${Math.round(lastParams.prixAchat / 1_000)} k€`
                      }
                    />
                  )}
                  {displayLoyer > 0 && <ParamChip label="Loyer" value={`${displayLoyer} €/m`} />}
                  {lastParams.apport > 0 && (
                    <ParamChip
                      label="Apport"
                      value={`${Math.round((lastParams.apport / lastParams.prixAchat) * 100)}%`}
                    />
                  )}
                  <ParamChip label="Taux" value={`${lastParams.taux}% · ${lastParams.duree} ans`} />
                  <ParamChip
                    label="Régime"
                    value={
                      lastParams.locType === 'nu' ? 'Nu' :
                      lastParams.locType === 'meuble' ? 'Meublé' :
                      lastParams.locType === 'coloc' ? 'Coloc' : 'Saisonnier'
                    }
                  />
                </div>
                <button
                  onClick={() => setPanelOpen(true)}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Modifier
                </button>
              </div>
            )}

            {/* ── État vide ── */}
            {!showResults && !loading && (
              <div className="flex flex-col items-center justify-center min-h-full py-24 text-center px-8 relative">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.035) 0%, transparent 70%)' }}
                  />
                </div>
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl border border-white/[0.07] bg-white/[0.02] flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-7 h-7 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
                    Analyse complète
                  </h2>
                  <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-5">
                    Saisissez les paramètres dans le panneau gauche. Rendement, fiscalité et TRI s'affichent ici.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {['PTZ', 'GLI', 'LMNP Réel', 'SCI IS', 'TRI', 'Plus-value', 'Projection 20 ans'].map((tag) => (
                      <span key={tag} className="text-[11px] text-zinc-700 bg-white/[0.03] border border-white/[0.05] px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Chargement ── */}
            {loading && (
              <div className="flex flex-col items-center justify-center min-h-full py-24 gap-4">
                <div className="relative w-9 h-9">
                  <div className="w-9 h-9 border border-white/[0.06] rounded-full" />
                  <div className="absolute inset-0 w-9 h-9 border-t border-emerald-500 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-zinc-600">Calcul des régimes fiscaux & TRI…</p>
              </div>
            )}

            {/* ── Résultats ── */}
            {showResults && result && score && !loading && (
              <div
                className="transition-all duration-500"
                style={{
                  opacity: resultsVisible ? 1 : 0,
                  transform: resultsVisible ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                {/* Header résultats */}
                <div className="border-b border-white/[0.05] px-7 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-[15px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>
                        Analyse complète
                      </h2>
                      {fiscalResults && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Fiscal inclus
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-zinc-500">
                      {result.ville} · {formatCurrency(result.prixRevient)}
                    </p>
                  </div>
                </div>

                {/* Contenu */}
                <div className="px-7 py-7 space-y-8 max-w-4xl">
                  <ScoreCard score={score} />

                  <div>
                    <SectionLabel>Indicateurs clés</SectionLabel>
                    <KpiGrid
                      result={result}
                      netNetYield={bestFiscal?.yield}
                      netNetRegime={bestFiscal?.regime}
                    />
                  </div>

                  {(marketData || marketLoading) && (
                    <div>
                      <SectionLabel>Marché local</SectionLabel>
                      {marketLoading && !marketData ? (
                        <MarketContextBlock
                          data={{} as LocalMarketData}
                          surface={lastParams?.surface ?? 50}
                          prixAchat={lastParams?.prixAchat ?? 0}
                          loading
                        />
                      ) : marketData ? (
                        <MarketContextBlock
                          data={marketData}
                          surface={lastParams?.surface ?? 50}
                          prixAchat={lastParams?.prixAchat ?? 0}
                        />
                      ) : null}
                    </div>
                  )}

                  <div>
                    <SectionLabel>Analyse IA</SectionLabel>
                    <AIInsights
                      insights={insights}
                      loading={aiLoading}
                      onGenerate={handleGenerateAI}
                      isPro={false}
                    />
                  </div>

                  {lastParams && (
                    <div>
                      <SectionLabel>Scénarios & équilibre</SectionLabel>
                      <ScenarioPanel
                        baseParams={lastParams}
                        baseResult={result}
                        onApplyScenario={(params) => {
                          setInitialParams(params)
                          setFormKey(k => k + 1)
                          applyCalculation(params, false)
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <SectionLabel>Détails, fiscalité & projections</SectionLabel>
                    <DetailedResults
                      result={result}
                      fiscalResults={fiscalResults}
                      params={lastParams}
                      onApplyRenovationScenario={(travaux, prixAchat) => {
                        const updated = { ...lastParams!, travaux, prixAchat }
                        setInitialParams(updated)
                        setFormKey(k => k + 1)
                        applyCalculation(updated, false)
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </AppShell>
  )
}
