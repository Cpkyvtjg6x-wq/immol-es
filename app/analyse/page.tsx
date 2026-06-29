'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CalculateurForm } from '@/components/app/CalculateurForm'
import { ResultTabs } from '@/components/app/ResultTabs'
import { calculateInvestment, DEFAULT_PARAMS } from '@/lib/calculator'
import { calculateFiscal } from '@/lib/fiscal'
import { calculateScore } from '@/lib/score'
import { InvestmentParams, InvestmentResult, ScoreResult, AIInsight, FiscalRegime, FiscalResult, MarketData } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEntitlements } from '@/lib/hooks/useEntitlements'
import { useUpgrade } from '@/lib/upgrade-context'
import { useSimulations } from '@/lib/hooks/useSimulations'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { SaveModal } from '@/components/app/SaveModal'
import { AppShell } from '@/components/app/AppShell'
import { ExportButtons } from '@/components/app/ExportButtons'
import { QuickAnalyse } from '@/components/app/QuickAnalyse'
import { readLocalSettings } from '@/lib/settings'
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
      structure: params.structure,
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
  // true si l'écran est ouvert depuis une simulation sauvegardée → on force le mode Expert
  const loadedFromSimRef = useRef(false)
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

    // Valeurs par défaut personnelles de l'utilisateur (Paramètres → Calculateur)
    const userDefaults = readLocalSettings().calculatorDefaults
    const base: InvestmentParams = { ...DEFAULT_PARAMS, ...userDefaults }

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
        ...base,
        prixAchat: prix, surface,
        ville:     urlVille ?? DEFAULT_PARAMS.ville,
        dpe:       (urlDpe as InvestmentParams['dpe']) ?? DEFAULT_PARAMS.dpe,
        locType, apport,
        fraisNotaire: Math.round(prix * 0.08),
        fraisNotaireAuto: false,
        loyerMeuble:  locType === 'meuble' ? loyer : DEFAULT_PARAMS.loyerMeuble,
        loyerNu:      locType === 'nu'     ? loyer : DEFAULT_PARAMS.loyerNu,
        tmi:          urlTmi ? parseInt(urlTmi, 10) : base.tmi,
        chargesCopro,
        taxeFonciere,
        travaux,
        nbChambres:   nbPieces > 0 ? nbPieces : DEFAULT_PARAMS.nbChambres,
        assurancePno: Math.round(prix * 0.001),
        cfe:          locType === 'meuble' ? 500 : 0,
      }
    }
    // Simulation chargée depuis le dashboard / bibliothèque / portfolio (one-shot via sessionStorage)
    try {
      const raw = sessionStorage.getItem('immora_load_params')
      if (raw) {
        // On NE supprime PAS ici (l'initialiseur peut être invoqué 2× en StrictMode) ;
        // le nettoyage se fait dans un useEffect après le montage.
        loadedFromSimRef.current = true
        return { ...DEFAULT_PARAMS, ...JSON.parse(raw) }
      }
    } catch { /* ignore */ }
    return base
  })

  const [result, setResult]               = useState<InvestmentResult | null>(null)
  const [score, setScore]                 = useState<ScoreResult | null>(null)
  const [insights, setInsights]           = useState<AIInsight[] | null>(null)
  const [fiscalResults, setFiscalResults] = useState<FiscalRegime[] | null>(null)
  const [bestFiscal, setBestFiscal]       = useState<{ yield: number; regime: string } | null>(null)
  const [liveUpdating, setLiveUpdating]   = useState(false)
  const [aiLoading, setAiLoading]         = useState(false)
  const [lastParams, setLastParams]       = useState<InvestmentParams | null>(null)
  const [marketData, setMarketData]       = useState<LocalMarketData | null>(null)
  const [marketLoading, setMarketLoading] = useState(false)
  const [showResults, setShowResults]     = useState(false)
  const [resultsVisible, setResultsVisible] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)

  // Mode Express / Expert
  const [mode, setMode] = useState<'express' | 'expert'>(() => {
    if (typeof window === 'undefined') return 'express'
    const sp = new URLSearchParams(window.location.search)
    // Ouverture depuis une simulation sauvegardée ou l'extension → Expert (tout pré-rempli)
    if (loadedFromSimRef.current || sp.get('source') === 'extension') return 'expert'
    // Sinon : mode préféré de l'utilisateur (Paramètres → Préférences)
    return readLocalSettings().preferences.defaultAnalysisMode ?? 'express'
  })

  // Panel persistant — ouvert par défaut
  const [panelOpen, setPanelOpen] = useState(true)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Dernière FiscalResult complète — utilisée pour recalculer le score quand market data arrive
  const lastFiscalRef = useRef<FiscalResult | null>(null)
  const lastResultRef = useRef<InvestmentResult | null>(null)
  const { user } = useAuth()
  const { simulations } = useSimulations(user?.id ?? null)
  const { canUseAI, canSaveMore, simulationLimit, remainingSimulations, isFree } = useEntitlements(simulations.length)
  const { prompt: promptUpgrade } = useUpgrade()

  // Nettoyage de la clé de chargement (one-shot) après le montage —
  // robuste au double-rendu StrictMode (l'initialiseur l'a déjà lue).
  useEffect(() => {
    try { sessionStorage.removeItem('immora_load_params') } catch {}
  }, [])

  useEffect(() => {
    if (showResults) {
      const t = setTimeout(() => setResultsVisible(true), 50)
      return () => clearTimeout(t)
    }
  }, [showResults])

  // Recalcul du score quand les données marché arrivent
  useEffect(() => {
    if (!marketData || !lastResultRef.current || !lastFiscalRef.current) return
    // Mapper LocalMarketData → MarketData (format attendu par calculateScore)
    const liquScore = marketData.liquidite === 'forte' ? 75 : marketData.liquidite === 'faible' ? 35 : 55
    const marketForScore: MarketData = {
      region: marketData.ville,
      prixM2: marketData.prixM2Median,
      loyerM2: marketData.loyerEstimeM2,
      tensionLoc: marketData.tensionScore,
      attractRevente: liquScore,
      dynEco: marketData.tensionScore > 70 ? 75 : marketData.tensionScore > 40 ? 55 : 35,
      score: '', scoreClass: '', insight: '', conseils: '',
    }
    const updatedScore = calculateScore(lastResultRef.current, lastFiscalRef.current, marketForScore)
    setScore(updatedScore)
  }, [marketData])

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
    try { sessionStorage.setItem('immora_last_params', JSON.stringify(params)) } catch {}
    setLastParams(params)
    if (!isLive) { setInsights(null); setResultsVisible(false) }
    const { res, fiscalResult, best, sc } = runCalculation(params)
    setResult(res)
    setScore(sc)
    setFiscalResults(fiscalResult.regimes)
    // Stocker les références pour recalcul du score quand marketData arrive
    lastFiscalRef.current = fiscalResult
    lastResultRef.current = res
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

  const handleCalculate = useCallback((params: InvestmentParams) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    applyCalculation(params, false)
  }, [applyCalculation])

  const handleGenerateAI = useCallback(async () => {
    if (!lastParams || !result) return
    // Gating client (le serveur a aussi sa garde — défense en profondeur)
    if (!canUseAI) { promptUpgrade('ai_insights'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai-analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: lastParams, result }),
      })
      // 402 = Payment Required → l'utilisateur n'a pas le bon tier
      if (res.status === 402) {
        promptUpgrade('ai_insights')
        return
      }
      const data = await res.json()
      if (data.insights) setInsights(data.insights)
    } catch { console.error('AI analyse failed') }
    finally { setAiLoading(false) }
  }, [lastParams, result, canUseAI, promptUpgrade])

  const handleSave = useCallback(() => {
    // Gating quota de sauvegardes (Free = 3 max)
    if (!canSaveMore()) { promptUpgrade('save_limit'); return }
    setSaveModalOpen(true)
  }, [canSaveMore, promptUpgrade])

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
        if (lastParams && lastParams.prixAchat > 0) {
          handleCalculate(lastParams)
        }
      } else if (e.key === 's') {
        e.preventDefault()
        if (result) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lastParams, result, handleCalculate, handleSave])

  const handleDoSave = useCallback(async (name: string) => {
    if (!result || !score || !lastParams) return { error: 'Aucun résultat à sauvegarder' }
    if (!user?.id) return { error: 'Non connecté' }
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.from('simulations').insert({
        user_id: user.id,
        name,
        params: lastParams as Partial<InvestmentParams>,
        results: result,
        score: score.global,
        tags: [],
      })
      return { error: error?.message || null }
    } catch {
      return { error: 'Erreur lors de la sauvegarde' }
    }
  }, [result, score, lastParams, user?.id])

  // ─── Mode Express → Expert: bascule avec transfert des params ───────────────
  const handleSwitchToExpert = useCallback((params: InvestmentParams) => {
    setInitialParams(params)
    setFormKey(k => k + 1)
    setMode('expert')
    setPanelOpen(true)
  }, [])

  // ─── Résultat live condensé pour QuickAnalyse ─────────────────────────────
  const liveResultForQuick = result && score ? {
    rendBrut: result.rendBrut,
    cashflowMensuel: result.cashflowMensuel,
    rendNetNet: bestFiscal?.yield ?? 0,
    score: score.global,
  } : null

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
            className="shrink-0 border-r border-th-border flex flex-col bg-black overflow-hidden"
            style={{
              width: panelOpen ? '560px' : '44px',
              transition: 'width 280ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {panelOpen ? (
              /* ── Panel ouvert ── */
              <div className="flex-1 overflow-hidden flex flex-col">

                {/* ── Mode toggle pill ── */}
                <div className="shrink-0 px-4 pt-3 pb-3 border-b border-th-border bg-black">
                  <div className="flex bg-th-surface2 rounded-xl p-1 gap-0.5">
                    <button
                      onClick={() => setMode('express')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                        mode === 'express'
                          ? 'bg-th-surface3 text-th-text-1 shadow-sm'
                          : 'text-th-text-3 hover:text-th-text-2 hover:bg-th-surface2/60'
                      }`}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Express
                    </button>
                    <button
                      onClick={() => setMode('expert')}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 ${
                        mode === 'expert'
                          ? 'bg-th-surface3 text-th-text-1 shadow-sm'
                          : 'text-th-text-3 hover:text-th-text-2 hover:bg-th-surface2/60'
                      }`}
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Expert
                    </button>
                  </div>
                </div>

                {/* ── Contenu selon le mode ── */}
                <div className="flex-1 overflow-hidden">
                  <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="h-full">
                  {mode === 'express' ? (
                    <QuickAnalyse
                      onChange={handleChange}
                      onSwitchExpert={handleSwitchToExpert}
                      initialParams={initialParams}
                      liveResult={liveResultForQuick}
                      liveUpdating={liveUpdating}
                    />
                  ) : (
                    <CalculateurForm
                      key={formKey}
                      onCalculate={handleCalculate}
                      onChange={handleChange}
                      onReset={handleFormReset}
                      onCollapse={() => setPanelOpen(false)}
                      initialParams={initialParams}
                      result={result}
                      marketData={marketData}
                    />
                  )}
                  </motion.div>
                </div>

              </div>
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
            {!showResults && (
              <div className="p-6 space-y-5 select-none pointer-events-none" style={{ opacity: 0.45 }}>

                {/* Prompt */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  <span className="text-[11px] text-th-text-3 italic pointer-events-auto" style={{ opacity: 1 }}>
                    {mode === 'express'
                      ? 'Saisissez prix + loyer en mode Express — les résultats s\'affichent instantanément'
                      : 'Remplissez le formulaire — vos résultats apparaîtront ici'}
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

            {/* ── Résultats ── */}
            {showResults && result && score && lastParams && (
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
                  isPro={!isFree}
                  onGenerateAI={handleGenerateAI}
                  onApplyScenario={(params) => {
                    setInitialParams(params)
                    setFormKey(k => k + 1)
                    applyCalculation(params, false)
                  }}
                />

                {/* ── Scénario alternatif ── */}
                <div className="px-6 pb-6 pt-2">
                  <div className="rounded-xl border border-th-border bg-th-surface2/60 px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-th-text-1">Tester une variante</p>
                      <p className="text-[11px] text-th-text-3 mt-0.5">Recharge ces paramètres dans le formulaire pour les modifier</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleForkScenario}
                      className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-th-text-2 hover:text-th-text-1 bg-th-surface border border-th-border hover:border-th-border-med px-3 py-1.5 rounded-lg transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifier les paramètres
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
