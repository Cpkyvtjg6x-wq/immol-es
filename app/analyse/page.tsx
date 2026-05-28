'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CalculateurForm } from '@/components/app/CalculateurForm'
import { ResultTabs } from '@/components/app/ResultTabs'
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
import type { LocalMarketData } from '@/lib/types'


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

// ─── Chip paramètre compact (barre résumé) ────────────────────────────────────

function ParamChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-th-surface2 border border-th-border rounded-lg px-2 py-1">
      <span className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider">{label}</span>
      <span className="text-[11px] font-bold text-th-text-1 tabular-nums">{value}</span>
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
    // Simulation chargée depuis le dashboard (one-shot via sessionStorage)
    try {
      const raw = sessionStorage.getItem('immolyse_load_params')
      if (raw) {
        sessionStorage.removeItem('immolyse_load_params')
        return { ...DEFAULT_PARAMS, ...JSON.parse(raw) }
      }
    } catch { /* ignore */ }
    return DEFAULT_PARAMS
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
    // Sauvegarde session uniquement (pour revente / rapport-bancaire dans le même onglet)
    try { sessionStorage.setItem('immolyse_last_params', JSON.stringify(params)) } catch {}
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

  const handleFormReset = useCallback(() => {
    setResult(null)
    setScore(null)
    setInsights(null)
    setFiscalResults(null)
    setBestFiscal(null)
    setLastParams(null)
    setShowResults(false)
    setResultsVisible(false)
    setMarketData(null)
  }, [])

  // ─── Fork — duplique les params actuels dans le formulaire pour créer un scénario alternatif
  const handleForkScenario = useCallback(() => {
    if (!lastParams) return
    // Remettre les params actuels dans le formulaire (sans résultats)
    setInitialParams(lastParams)
    setFormKey(k => k + 1)
    setResult(null)
    setScore(null)
    setInsights(null)
    setFiscalResults(null)
    setBestFiscal(null)
    setShowResults(false)
    setResultsVisible(false)
    // Ouvrir le panneau si fermé
    setPanelOpen(true)
  }, [lastParams])

  // ─── Raccourcis clavier ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const meta = isMac ? e.metaKey : e.ctrlKey
      if (!meta) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!loading && lastParams && lastParams.prixAchat > 0) {
          handleCalculate(lastParams)
        }
      } else if (e.key === 's') {
        e.preventDefault()
        if (result) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loading, lastParams, result, handleCalculate, handleSave])

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
      <div className="bg-th-bg text-th-text-1 flex flex-col" style={{ height: '100dvh' }}>

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
        <header className="shrink-0 z-40 bg-th-bg backdrop-blur-xl border-b border-th-border h-14 flex items-center justify-between px-5 gap-4">

          {/* Gauche : toggle panel + breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              title={panelOpen ? 'Réduire le panneau' : 'Ouvrir le panneau'}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                panelOpen
                  ? 'bg-th-surface3 text-th-text-1'
                  : 'bg-th-surface2 text-th-text-2 hover:text-th-text-1 hover:bg-th-surface3'
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
                <span className="text-[13px] text-th-text-2 font-medium shrink-0">Analyser</span>
                <svg className="w-3.5 h-3.5 text-th-text-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-[13px] text-th-text-1 truncate">
                  {result.ville} · {formatCurrency(result.prixRevient)}
                </span>
              </div>
            ) : (
              <span className="text-[13px] font-semibold text-th-text-1">Analyser un bien</span>
            )}
          </div>

          {/* Droite : statut + actions */}
          <div className="flex items-center gap-2 shrink-0">
            {showResults && (
              <div className="flex items-center gap-1.5 mr-1">
                {liveUpdating ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[11px] text-th-text-3 hidden sm:block">Mise à jour…</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-th-text-3 hidden sm:block">Calculé</span>
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
                  className="hidden md:flex items-center gap-1.5 text-[12px] font-semibold text-th-text-1 bg-th-surface2 border border-th-border px-3 py-1.5 rounded-lg hover:bg-th-surface3 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Dossier bancaire
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/[0.14] border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/[0.18] transition-colors"
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
            className="shrink-0 border-r border-th-border flex flex-col bg-th-surface2 overflow-hidden"
            style={{
              width: panelOpen ? '560px' : '44px',
              transition: 'width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {panelOpen ? (
              /* ── Panel ouvert ── */
              <>
                {/* En-tête du panel */}
                <div className="shrink-0 h-9 px-4 border-b border-th-border flex items-center justify-between bg-th-surface2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                    <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-widest">
                      Paramètres du bien
                    </p>
                  </div>
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-th-text-3 hover:text-th-text-1 hover:bg-th-surface3 transition-all"
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
                    onReset={handleFormReset}
                    loading={loading}
                    initialParams={initialParams}
                    result={result}
                    marketData={marketData}
                  />
                </div>
              </>
            ) : (
              /* ── Panel réduit — strip vertical ── */
              <div
                className="flex-1 flex flex-col items-center pt-3 pb-4 gap-3 cursor-pointer hover:bg-th-surface transition-colors"
                onClick={() => setPanelOpen(true)}
                title="Ouvrir les paramètres"
              >
                <div className="w-7 h-7 rounded-lg bg-th-surface3 border border-th-border flex items-center justify-center text-th-text-2 hover:text-th-text-1 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p
                  className="text-[9px] font-semibold text-th-text-3 uppercase tracking-widest select-none"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  Paramètres
                </p>
              </div>
            )}
          </aside>

          {/* ── Zone résultats ──────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 overflow-y-auto bg-th-bg">

            {/* Barre résumé des paramètres (panel fermé + résultats présents) */}
            {!panelOpen && lastParams && showResults && (
              <div className="sticky top-0 z-10 border-b border-th-border bg-th-bg backdrop-blur-sm px-6 py-2 flex items-center gap-2 flex-wrap">
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


            {/* ── État vide — ghost preview ── */}
            {!showResults && !loading && (
              <div className="p-6 space-y-5 select-none pointer-events-none" style={{ opacity: 0.45 }}>

                {/* Prompt */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  <span className="text-[11px] text-th-text-3 italic pointer-events-auto" style={{ opacity: 1 }}>
                    Remplissez le formulaire — vos résultats apparaîtront ici
                  </span>
                </div>

                {/* Faux onglets */}
                <div className="flex gap-1 border-b border-th-border pb-0">
                  {['Synthèse', 'Fiscalité', 'Financement', 'Projection'].map((tab, i) => (
                    <div key={tab} className={`px-3 py-2 text-[12px] font-semibold rounded-t-lg border border-b-0 ${i === 0 ? 'border-th-border bg-th-surface2 text-th-text-2' : 'border-transparent text-th-text-3'}`}>
                      {tab}
                    </div>
                  ))}
                </div>

                {/* Score + KPIs */}
                <div className="flex gap-4 items-start">
                  {/* Score gauge */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-full skeleton" />
                    <div className="skeleton h-3 w-14 rounded-full" />
                  </div>
                  {/* KPI grid */}
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Rendement brut', w: 'w-16' },
                      { label: 'Cashflow / mois', w: 'w-14' },
                      { label: 'TRI sur 10 ans', w: 'w-12' },
                      { label: 'Effort mensuel', w: 'w-16' },
                    ].map(({ label, w }) => (
                      <div key={label} className="bg-th-surface2 border border-th-border rounded-xl p-3 space-y-2">
                        <div className="skeleton h-2.5 w-20 rounded-full" />
                        <div className={`skeleton h-6 ${w} rounded-md`} />
                        <div className="skeleton h-2 w-12 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Régimes fiscaux */}
                <div>
                  <div className="skeleton h-2.5 w-32 rounded-full mb-3" />
                  <div className="space-y-2">
                    {[{ w: 'w-24' }, { w: 'w-20' }, { w: 'w-28' }].map(({ w }, i) => (
                      <div key={i} className="bg-th-surface2 border border-th-border rounded-xl p-3 flex items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className={`skeleton h-3 ${w} rounded-full`} />
                          <div className="skeleton h-2 w-40 rounded-full" />
                        </div>
                        <div className="skeleton h-8 w-16 rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Graphique */}
                <div className="bg-th-surface2 border border-th-border rounded-xl p-4 space-y-3">
                  <div className="skeleton h-2.5 w-28 rounded-full" />
                  <div className="flex items-end gap-1 h-20">
                    {[40, 55, 48, 62, 70, 58, 75, 80, 68, 85, 78, 90].map((h, i) => (
                      <div key={i} className="flex-1 skeleton rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ── Chargement ── */}
            {loading && (
              <div className="flex flex-col items-center justify-center min-h-full py-24 gap-4">
                <div className="relative w-9 h-9">
                  <div className="w-9 h-9 border border-th-border rounded-full" />
                  <div className="absolute inset-0 w-9 h-9 border-t border-emerald-500 rounded-full animate-spin" />
                </div>
                <p className="text-sm text-th-text-3">Calcul des régimes fiscaux & TRI…</p>
              </div>
            )}

            {/* ── Résultats ── */}
            {showResults && result && score && lastParams && !loading && (
              <div
                className="transition-all duration-500"
                style={{
                  opacity: resultsVisible ? 1 : 0,
                  transform: resultsVisible ? 'translateY(0)' : 'translateY(10px)',
                }}
              >
                <ResultTabs
                  result={result}
                  fiscalResults={fiscalResults}
                  params={lastParams}
                  score={score}
                  bestFiscal={bestFiscal}
                  marketData={marketData}
                  marketLoading={marketLoading}
                  insights={insights}
                  aiLoading={aiLoading}
                  isPro={false}
                  onGenerateAI={handleGenerateAI}
                  onApplyScenario={(params) => {
                    setInitialParams(params)
                    setFormKey(k => k + 1)
                    applyCalculation(params, false)
                  }}
                  onApplyRenovationScenario={(travaux, prixAchat) => {
                    const updated = { ...lastParams!, travaux, prixAchat }
                    setInitialParams(updated)
                    setFormKey(k => k + 1)
                    applyCalculation(updated, false)
                  }}
                />

                {/* ── Scénario alternatif ── */}
                <div className="px-6 pb-6 pt-2">
                  <div className="rounded-xl border border-th-border bg-th-surface2/60 px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-th-text-1">Tester un scénario alternatif</p>
                      <p className="text-[11px] text-th-text-3 mt-0.5">Duplique ces paramètres dans le formulaire pour modifier et comparer</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleForkScenario}
                      className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-th-text-2 hover:text-th-text-1 bg-th-surface border border-th-border hover:border-th-border-med px-3 py-1.5 rounded-lg transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Dupliquer & modifier
                    </button>
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
