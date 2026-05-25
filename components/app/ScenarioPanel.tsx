'use client'

import { useState, useEffect, useCallback } from 'react'
import { InvestmentParams, InvestmentResult } from '@/lib/types'
import { calculateInvestment } from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'
import { IconCheckCircle, IconExclamationTriangle, IconBolt } from '@/components/ui/icons'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScenarioPanelProps {
  baseParams: InvestmentParams
  baseResult: InvestmentResult
  onApplyScenario: (params: InvestmentParams) => void
}

interface ScenarioState {
  prixAchat: number
  loyer: number        // loyer mensuel de référence (adapté au locType)
  taux: number         // %
  apportPct: number    // % du prix d'achat
  duree: number        // années
  travaux: number      // €
}

// ─── URL state helpers ────────────────────────────────────────────────────────

const URL_KEYS = ['sp', 'sl', 'st', 'sa', 'sd', 'sw'] as const

function encodeScenario(s: ScenarioState): string {
  const p = new URLSearchParams()
  p.set('sp', String(s.prixAchat))
  p.set('sl', String(s.loyer))
  p.set('st', String(s.taux))
  p.set('sa', String(s.apportPct))
  p.set('sd', String(s.duree))
  p.set('sw', String(s.travaux))
  return p.toString()
}

function readScenarioFromUrl(): Partial<ScenarioState> | null {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search)
  if (!URL_KEYS.some(k => p.has(k))) return null
  const out: Partial<ScenarioState> = {}
  if (p.has('sp')) out.prixAchat = Number(p.get('sp'))
  if (p.has('sl')) out.loyer    = Number(p.get('sl'))
  if (p.has('st')) out.taux     = Number(p.get('st'))
  if (p.has('sa')) out.apportPct = Number(p.get('sa'))
  if (p.has('sd')) out.duree    = Number(p.get('sd'))
  if (p.has('sw')) out.travaux  = Number(p.get('sw'))
  return out
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function getLoyerBase(p: InvestmentParams): number {
  if (p.locType === 'nu') return p.loyerNu
  if (p.locType === 'coloc') return p.loyerParChambre * p.nbChambres
  if (p.locType === 'saisonnier') return Math.round((p.prixNuit * (p.tauxOccupation / 100) * 365) / 12)
  return p.loyerMeuble
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step
}

function buildScenarioParams(base: InvestmentParams, s: ScenarioState): InvestmentParams {
  const apport = Math.round(s.prixAchat * s.apportPct / 100)
  const fraisNotaire = base.fraisNotaireAuto
    ? Math.round(s.prixAchat * (base.etat === 'neuf' ? 0.03 : 0.08))
    : base.fraisNotaire

  const updated: InvestmentParams = {
    ...base,
    prixAchat: s.prixAchat,
    taux: s.taux,
    apport,
    duree: s.duree,
    travaux: s.travaux,
    fraisNotaire,
  }

  // Mise à jour du loyer selon locType
  if (base.locType === 'nu') updated.loyerNu = s.loyer
  else if (base.locType === 'coloc') {
    const nb = Math.max(1, base.nbChambres)
    updated.loyerParChambre = Math.round(s.loyer / nb)
  } else if (base.locType === 'saisonnier') {
    // Pour saisonnier : loyer slider = revenu mensuel cible → ajuster prixNuit
    const nuitesAn = Math.round(365 * (base.tauxOccupation / 100))
    updated.prixNuit = nuitesAn > 0 ? Math.round((s.loyer * 12) / nuitesAn) : base.prixNuit
  } else {
    updated.loyerMeuble = s.loyer
  }

  return updated
}

// ─── Sous-composant : Slider ──────────────────────────────────────────────────

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
  changed: boolean
}

function SliderRow({ label, value, min, max, step, display, onChange, changed }: SliderRowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider">{label}</span>
        <span className={`text-[13px] font-bold tabular-nums transition-colors ${changed ? 'text-amber-400' : 'text-th-text-1'}`}>
          {display}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="scenario-slider w-full"
        />
      </div>
    </div>
  )
}

// ─── Sous-composant : Métrique avec delta ─────────────────────────────────────

interface MetricDeltaProps {
  label: string
  value: string
  delta: number
  deltaFmt: (n: number) => string
  color: string
}

function MetricDelta({ label, value, delta, deltaFmt, color }: MetricDeltaProps) {
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-th-text-3'
  const deltaSign = delta > 0 ? '+' : ''

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">{label}</p>
      <p className={`text-[22px] font-black tabular-nums leading-none ${color}`} style={{ letterSpacing: '-0.03em' }}>
        {value}
      </p>
      <p className={`text-[11px] font-bold tabular-nums ${deltaColor}`}>
        {delta === 0 ? <span className="text-th-text-3">base</span> : `${deltaSign}${deltaFmt(delta)}`}
      </p>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ScenarioPanel({ baseParams, baseResult, onApplyScenario }: ScenarioPanelProps) {
  const [showSliders, setShowSliders] = useState(false)
  const [showEquilibre, setShowEquilibre] = useState(false)
  const [copied, setCopied] = useState(false)

  // Loyer de base selon locType
  const loyerBase = getLoyerBase(baseParams)
  const isImmeuble = baseParams.locType === 'immeuble'

  // Plages dynamiques centrées sur les valeurs de base
  const prixMin = roundTo(baseParams.prixAchat * 0.65, 5000)
  const prixMax = roundTo(baseParams.prixAchat * 1.45, 5000)
  const loyerMin = Math.max(200, roundTo(loyerBase * 0.5, 50))
  const loyerMax = roundTo(loyerBase * 1.8, 50)
  const travauxMax = Math.max(50000, roundTo(baseParams.travaux * 3, 5000))
  const apportBase = baseParams.prixAchat > 0
    ? Math.round((baseParams.apport / baseParams.prixAchat) * 100)
    : 20

  const defaultState: ScenarioState = {
    prixAchat: baseParams.prixAchat,
    loyer: loyerBase,
    taux: baseParams.taux,
    apportPct: apportBase,
    duree: baseParams.duree,
    travaux: baseParams.travaux,
  }

  // État des sliders — initialisé depuis l'URL si présente, sinon depuis les params de base
  const [s, setS] = useState<ScenarioState>(() => {
    const fromUrl = readScenarioFromUrl()
    return fromUrl ? { ...defaultState, ...fromUrl } : defaultState
  })

  // Recalcul synchrone à chaque changement slider
  const scenarioParams = buildScenarioParams(baseParams, s)
  const scenarioResult = calculateInvestment(scenarioParams)

  // Horizon de revente pour l'affichage
  const horizon = baseParams.horizonRevente ?? 10

  // Deltas vs base
  const dRendNet    = Math.round((scenarioResult.rendementNet - baseResult.rendementNet) * 10) / 10
  const dCashflow   = Math.round(scenarioResult.cashflowMensuel - baseResult.cashflowMensuel)
  const dPatrimoine = Math.round(scenarioResult.patrimoineNetRevente - baseResult.patrimoineNetRevente)

  // Détection changement par rapport à la base (calculé tôt pour le useEffect)
  const isModified =
    s.prixAchat !== baseParams.prixAchat ||
    s.loyer !== loyerBase ||
    s.taux !== baseParams.taux ||
    s.apportPct !== apportBase ||
    s.duree !== baseParams.duree ||
    s.travaux !== baseParams.travaux

  // Mise à jour URL quand le scénario change (replaceState — sans historique)
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!isModified) {
      URL_KEYS.forEach(k => url.searchParams.delete(k))
    } else {
      new URLSearchParams(encodeScenario(s)).forEach((v, k) => url.searchParams.set(k, v))
    }
    window.history.replaceState(null, '', url.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  // Couleurs dynamiques selon valeurs scénario
  const rendColor = scenarioResult.rendementNet >= 5 ? 'text-emerald-400' : scenarioResult.rendementNet >= 3 ? 'text-amber-400' : 'text-red-400'
  const cfColor = scenarioResult.cashflowMensuel >= 0 ? 'text-emerald-400' : scenarioResult.cashflowMensuel >= -100 ? 'text-amber-400' : 'text-red-400'
  const patriColor = scenarioResult.patrimoineNetRevente > 0 ? 'text-emerald-400' : 'text-red-400'

  // Alias pour la lisibilité (déjà calculé plus haut)
  const hasChanged = isModified

  // "Faire fonctionner ce bien" — décomposition du point mort
  const pointMort = scenarioResult.pointMort
  const loyerActuel = s.loyer
  const ecart = loyerActuel - pointMort
  const loyerSuggeré = pointMort

  // Décomposition des composantes du point mort
  const compMensualite = Math.round(scenarioResult.mensualiteTotale)
  const compCopro = Math.round((baseParams.locType === 'immeuble' ? 0 : baseParams.chargesCopro) / 12)
  const compTaxe = Math.round(baseParams.taxeFonciere / 12)
  const compPno = Math.round((baseParams.locType === 'immeuble' ? 0 : baseParams.assurancePno) / 12)
  const compCfe = Math.round((baseParams.locType === 'immeuble' ? 0 : baseParams.cfe) / 12)
  const compGestionVacance = pointMort - compMensualite - compCopro - compTaxe - compPno - compCfe

  // Impact travaux sur mensualité
  const travauxDelta = s.travaux - baseParams.travaux
  const mensualiteDeltaTravaux = travauxDelta > 0
    ? Math.round(scenarioResult.mensualiteTotale - baseResult.mensualiteTotale)
    : 0

  const handleReset = useCallback(() => {
    setS(defaultState)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleApply = () => {
    onApplyScenario(scenarioParams)
  }

  const formatPrix = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} M€` : `${Math.round(n / 1000)} k€`

  return (
    <>
      {/* Styles slider injectés en global via style tag */}
      <style>{`
        .scenario-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          background: rgba(255,255,255,0.08);
          border-radius: 99px;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        .scenario-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10b981;
          border: 2.5px solid #09090b;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        .scenario-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 4px rgba(16,185,129,0.15);
        }
        .scenario-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10b981;
          border: 2.5px solid #09090b;
          cursor: pointer;
        }
      `}</style>

      <div className="rounded-2xl border border-th-border bg-th-surface2 overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowSliders(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-th-border bg-white/[0.015] hover:bg-white/[0.025] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-2 h-2 rounded-full transition-colors ${hasChanged ? 'bg-amber-400' : 'bg-emerald-500/50'}`} />
            <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider">
              Et si… — simulateur de scénarios
            </p>
            {hasChanged && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                Modifié
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showSliders && (
              <span className="text-[10px] text-th-text-3 hidden sm:block">Modifier les paramètres</span>
            )}
            <svg
              className={`w-4 h-4 text-th-text-3 transition-transform duration-250 shrink-0 ${showSliders ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* ── Résultats temps réel ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-0 border-b border-th-border">
          <div className="px-5 py-4 border-r border-th-border">
            <MetricDelta
              label="Rendement net"
              value={`${scenarioResult.rendementNet.toFixed(1)} %`}
              delta={dRendNet}
              deltaFmt={n => `${Math.abs(n).toFixed(1)} %`}
              color={rendColor}
            />
          </div>
          <div className="px-5 py-4 border-r border-th-border">
            <MetricDelta
              label="Cashflow / mois"
              value={`${scenarioResult.cashflowMensuel >= 0 ? '+' : ''}${Math.round(scenarioResult.cashflowMensuel)} €`}
              delta={dCashflow}
              deltaFmt={n => `${Math.abs(n)} €/mois`}
              color={cfColor}
            />
          </div>
          <div className="px-5 py-4">
            <MetricDelta
              label={`Patrimoine à ${horizon} ans`}
              value={scenarioResult.patrimoineNetRevente > 0 ? formatCurrency(scenarioResult.patrimoineNetRevente) : '—'}
              delta={dPatrimoine}
              deltaFmt={n => formatCurrency(Math.abs(n))}
              color={patriColor}
            />
          </div>
        </div>

        {/* ── Sliders (pliables) ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateRows: showSliders ? '1fr' : '0fr',
            transition: 'grid-template-rows 300ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
        <div className="overflow-hidden">
        <div className="px-5 py-5 space-y-5 border-b border-th-border">
          <SliderRow
            label="Prix d'achat"
            value={s.prixAchat}
            min={prixMin}
            max={prixMax}
            step={5000}
            display={formatPrix(s.prixAchat)}
            onChange={v => setS(p => ({ ...p, prixAchat: v }))}
            changed={s.prixAchat !== baseParams.prixAchat}
          />

          {!isImmeuble && (
            <SliderRow
              label={baseParams.locType === 'nu' ? 'Loyer mensuel (nu)' : baseParams.locType === 'coloc' ? 'Loyer total coloc' : baseParams.locType === 'saisonnier' ? 'Revenu mensuel moyen' : 'Loyer mensuel (meublé)'}
              value={s.loyer}
              min={loyerMin}
              max={loyerMax}
              step={10}
              display={`${s.loyer} €/mois`}
              onChange={v => setS(p => ({ ...p, loyer: v }))}
              changed={s.loyer !== loyerBase}
            />
          )}

          <SliderRow
            label="Taux d'intérêt"
            value={s.taux}
            min={1.5}
            max={6.0}
            step={0.05}
            display={`${s.taux.toFixed(2)} %`}
            onChange={v => setS(p => ({ ...p, taux: v }))}
            changed={s.taux !== baseParams.taux}
          />

          <SliderRow
            label="Apport"
            value={s.apportPct}
            min={0}
            max={40}
            step={1}
            display={`${s.apportPct} % — ${formatPrix(Math.round(s.prixAchat * s.apportPct / 100))}`}
            onChange={v => setS(p => ({ ...p, apportPct: v }))}
            changed={s.apportPct !== apportBase}
          />

          <SliderRow
            label="Durée du crédit"
            value={s.duree}
            min={10}
            max={25}
            step={1}
            display={`${s.duree} ans`}
            onChange={v => setS(p => ({ ...p, duree: v }))}
            changed={s.duree !== baseParams.duree}
          />

          <SliderRow
            label="Budget travaux"
            value={s.travaux}
            min={0}
            max={travauxMax}
            step={2500}
            display={s.travaux === 0 ? 'Aucun' : formatCurrency(s.travaux)}
            onChange={v => setS(p => ({ ...p, travaux: v }))}
            changed={s.travaux !== baseParams.travaux}
          />

          {/* Impact travaux si modifié */}
          {travauxDelta > 0 && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04]">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px] text-amber-400/80 leading-relaxed">
                {formatCurrency(travauxDelta)} de travaux supplémentaires → +{mensualiteDeltaTravaux} €/mois de mensualité.{' '}
                <span className="text-amber-400/60">L'impact fiscal (déficit foncier, amortissement LMNP) est calculé dans l'analyse complète.</span>
              </p>
            </div>
          )}
        </div>{/* end sliders inner */}
        </div>{/* end overflow-hidden */}
        </div>{/* end grid collapsible */}

        {/* ── "Faire fonctionner ce bien" ────────────────────────────────── */}
        <div className="border-t border-th-border">
          <button
            onClick={() => setShowEquilibre(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-th-surface transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-1.5 h-1.5 rounded-full ${ecart >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`} />
              <span className="text-[11px] font-semibold text-th-text-2 group-hover:text-th-text-1 transition-colors uppercase tracking-wider">
                Faire fonctionner ce bien
              </span>
              {/* Badge résumé */}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                ecart >= 0
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-red-400 bg-red-500/10 border-red-500/20'
              }`}>
                {ecart >= 0
                  ? `+${Math.abs(Math.round(ecart))} €/mois au-dessus`
                  : `${Math.round(ecart)} €/mois manquants`}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-th-text-3 transition-transform duration-200 ${showEquilibre ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showEquilibre && (
            <div className="px-5 pb-5 space-y-5">

              {/* ── Verdict principal ── */}
              <div className={`rounded-xl px-4 py-3.5 border flex items-start gap-3 ${
                ecart >= 0
                  ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
                  : 'border-red-500/20 bg-red-500/[0.04]'
              }`}>
                {ecart >= 0
                  ? <IconCheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  : <IconExclamationTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                }
                <p className="text-[13px] text-th-text-1 leading-relaxed">
                  {ecart >= 0 ? (
                    <>Votre loyer de <span className="text-emerald-400 font-bold">{loyerActuel} €/mois</span> couvre toutes les charges.
                    Marge de <span className="text-emerald-400 font-bold">+{Math.round(ecart)} €/mois</span> après mensualité, copro, taxe foncière et provisions.</>
                  ) : (
                    <>Le loyer actuel ne suffit pas. Il faudrait atteindre{' '}
                    <span className="text-red-400 font-bold">{loyerSuggeré} €/mois</span> pour couvrir toutes les charges.
                    Écart : <span className="text-red-400 font-bold">{Math.abs(Math.round(ecart))} €/mois</span>.</>
                  )}
                </p>
              </div>

              {/* ── Décomposition du point mort ── */}
              <div className="rounded-xl border border-th-border bg-th-surface p-4 space-y-3">
                <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">
                  Décomposition — {scenarioResult.pointMort} €/mois
                </p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Crédit + assurance', value: compMensualite, pct: compMensualite / pointMort, color: '#6366f1' },
                    { label: 'Charges copro', value: compCopro, pct: compCopro / pointMort, color: '#f59e0b' },
                    { label: 'Taxe foncière', value: compTaxe, pct: compTaxe / pointMort, color: '#f59e0b' },
                    { label: 'Assurance PNO', value: compPno, pct: compPno / pointMort, color: '#8b5cf6' },
                    { label: 'CFE', value: compCfe, pct: compCfe / pointMort, color: '#8b5cf6' },
                    { label: 'Gestion · vacance · provision', value: Math.max(0, compGestionVacance), pct: Math.max(0, compGestionVacance) / pointMort, color: '#10b981' },
                  ].filter(r => r.value > 0).map(row => (
                    <div key={row.label} className="grid items-center gap-2" style={{ gridTemplateColumns: '130px 1fr 60px' }}>
                      <span className="text-[11px] text-th-text-2 truncate">{row.label}</span>
                      <div className="h-1.5 bg-th-surface2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, row.pct * 100).toFixed(1)}%`, background: row.color }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-th-text-2 tabular-nums text-right">
                        {row.value} €
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Leviers pour rééquilibrer (si déficit) ── */}
              {ecart < 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Leviers pour rééquilibrer</p>
                  </div>

                  <div className="space-y-2">
                    {/* Levier loyer */}
                    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-black text-amber-400">1</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold text-amber-300">Augmenter le loyer</p>
                        <p className="text-[11px] text-amber-400/70 mt-0.5">
                          Cible : <span className="font-bold text-amber-300">{loyerSuggeré} €/mois</span>
                          {' '}(+{Math.abs(Math.round(ecart))} € vs loyer actuel — à vérifier avec le marché local)
                        </p>
                      </div>
                    </div>

                    {/* Levier durée */}
                    {s.duree < 25 && (() => {
                      const durCible = Math.min(25, s.duree + 2)
                      const pTest = buildScenarioParams(baseParams, { ...s, duree: durCible })
                      const rTest = calculateInvestment(pTest)
                      const gain = Math.round(scenarioResult.mensualiteTotale - rTest.mensualiteTotale)
                      return gain > 0 ? (
                        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-black text-amber-400">2</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-amber-300">Allonger la durée à {durCible} ans</p>
                            <p className="text-[11px] text-amber-400/70 mt-0.5">
                              Réduit la mensualité de <span className="font-bold text-amber-300">−{gain} €/mois</span>
                              {gain >= Math.abs(ecart) ? ' — suffit à rééquilibrer ✓' : ` — comble ${Math.round(gain / Math.abs(ecart) * 100)}% de l'écart`}
                            </p>
                          </div>
                        </div>
                      ) : null
                    })()}

                    {/* Levier prix si écart raisonnable */}
                    {Math.abs(ecart) <= loyerActuel * 0.20 && (() => {
                      const remisePct = Math.ceil(Math.abs(ecart) / loyerActuel / 7 * 100)
                      const prixCible = Math.round(s.prixAchat * (1 - remisePct / 100))
                      return (
                        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
                          <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-black text-amber-400">3</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-amber-300">Négocier le prix d'achat</p>
                            <p className="text-[11px] text-amber-400/70 mt-0.5">
                              Viser <span className="font-bold text-amber-300">{formatCurrency(prixCible)}</span>
                              {' '}(−{remisePct}% sur le prix affiché)
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ── Avertissement marge faible (si positif mais juste) ── */}
              {ecart >= 0 && ecart < loyerActuel * 0.06 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
                  <IconBolt className="w-4 h-4 shrink-0 text-amber-400" />
                  <p className="text-[11px] text-amber-400/80 leading-relaxed">
                    Marge de sécurité faible ({Math.round(ecart)} €/mois). Un mois de vacance locative ou une hausse des charges suffit à passer en déficit. Prévoyez une réserve de trésorerie.
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* ── Actions — visibles uniquement quand sliders ouverts ─────────── */}
        {showSliders && <div className="border-t border-th-border px-5 py-3 flex items-center justify-between gap-3 bg-th-surface">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={!hasChanged}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-th-text-2 hover:text-th-text-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Réinitialiser
            </button>

            {/* Copier le lien — visible seulement si scénario modifié */}
            {hasChanged && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className={`flex items-center gap-1.5 text-[11px] font-semibold transition-all px-2.5 py-1.5 rounded-lg border ${
                  copied
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                    : 'text-th-text-2 border-th-border hover:text-th-text-1 hover:border-th-border-med'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Lien copié !
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Copier le lien
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[10px] text-th-text-3 hidden sm:block">
              Appliquer pour recalculer la fiscalité complète
            </p>
            <button
              onClick={handleApply}
              disabled={!hasChanged}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500/[0.18] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Appliquer ce scénario
            </button>
          </div>
        </div>}
      </div>
    </>
  )
}
