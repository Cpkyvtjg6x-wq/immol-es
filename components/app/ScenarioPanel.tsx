'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { InvestmentParams, InvestmentResult } from '@/lib/types'
import { calculateInvestment } from '@/lib/calculator'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioPanelProps {
  baseParams: InvestmentParams
  baseResult: InvestmentResult
  onApplyScenario: (params: InvestmentParams) => void
}

interface ScenarioState {
  prixAchat: number
  loyer: number
  taux: number
  apportPct: number
  duree: number
  travaux: number
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

const URL_KEYS = ['sp', 'sl', 'st', 'sa', 'sd', 'sw'] as const

function encodeScenario(s: ScenarioState): string {
  const p = new URLSearchParams()
  p.set('sp', String(s.prixAchat)); p.set('sl', String(s.loyer))
  p.set('st', String(s.taux));      p.set('sa', String(s.apportPct))
  p.set('sd', String(s.duree));     p.set('sw', String(s.travaux))
  return p.toString()
}

function readScenarioFromUrl(): Partial<ScenarioState> | null {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search)
  if (!URL_KEYS.some(k => p.has(k))) return null
  const out: Partial<ScenarioState> = {}
  if (p.has('sp')) out.prixAchat  = Number(p.get('sp'))
  if (p.has('sl')) out.loyer      = Number(p.get('sl'))
  if (p.has('st')) out.taux       = Number(p.get('st'))
  if (p.has('sa')) out.apportPct  = Number(p.get('sa'))
  if (p.has('sd')) out.duree      = Number(p.get('sd'))
  if (p.has('sw')) out.travaux    = Number(p.get('sw'))
  return out
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function getLoyerBase(p: InvestmentParams): number {
  if (p.locType === 'nu')        return p.loyerNu
  if (p.locType === 'coloc')     return p.loyerParChambre * p.nbChambres
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
  const updated: InvestmentParams = { ...base, prixAchat: s.prixAchat, taux: s.taux, apport, duree: s.duree, travaux: s.travaux, fraisNotaire }
  if (base.locType === 'nu')          updated.loyerNu          = s.loyer
  else if (base.locType === 'coloc')  updated.loyerParChambre  = Math.round(s.loyer / Math.max(1, base.nbChambres))
  else if (base.locType === 'saisonnier') {
    const nuitesAn = Math.round(365 * (base.tauxOccupation / 100))
    updated.prixNuit = nuitesAn > 0 ? Math.round((s.loyer * 12) / nuitesAn) : base.prixNuit
  } else updated.loyerMeuble = s.loyer
  return updated
}

/** Recherche binaire — trouve le prix d'achat qui rend cashflow ≥ 0 */
function findBreakEvenPrice(base: InvestmentParams, s: ScenarioState): number | null {
  // Si le cashflow est déjà positif à prix bas, pas de sens
  const testLow = buildScenarioParams(base, { ...s, prixAchat: s.prixAchat * 0.50 })
  if (calculateInvestment(testLow).cashflowMensuel < 0) return null // même à -50% c'est négatif
  let lo = s.prixAchat * 0.50
  let hi = s.prixAchat
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const res = calculateInvestment(buildScenarioParams(base, { ...s, prixAchat: mid }))
    if (res.cashflowMensuel >= 0) lo = mid
    else hi = mid
  }
  const target = Math.round((lo + hi) / 2 / 1000) * 1000
  // N'afficher que si la remise est ≤ 30%
  return target < s.prixAchat * 0.70 ? null : target
}

/** Trouve la durée (arrondie à l'année) qui rend cashflow ≥ 0 */
function findBreakEvenDuration(base: InvestmentParams, s: ScenarioState): number | null {
  for (let d = s.duree + 1; d <= 30; d++) {
    const res = calculateInvestment(buildScenarioParams(base, { ...s, duree: d }))
    if (res.cashflowMensuel >= 0) return d
  }
  return null
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiChip({ label, value, delta, deltaFmt, color }: {
  label: string; value: string; delta: number
  deltaFmt: (n: number) => string; color: string
}) {
  const deltaColor = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-th-text-3'
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-xl bg-th-surface border border-th-border min-w-0">
      <span className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider truncate">{label}</span>
      <span className={`text-[16px] font-black tabular-nums leading-none ${color}`} style={{ letterSpacing: '-0.02em' }}>
        {value}
      </span>
      <span className={`text-[10px] font-semibold tabular-nums ${deltaColor}`}>
        {delta === 0
          ? <span className="text-th-text-3">—</span>
          : `${delta > 0 ? '+' : ''}${deltaFmt(delta)}`}
      </span>
    </div>
  )
}

function SliderRow({ label, value, min, max, step, display, onChange, changed }: {
  label: string; value: number; min: number; max: number; step: number
  display: string; onChange: (v: number) => void; changed: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-th-text-2 truncate">{label}</span>
        <span className={`text-[12px] font-bold tabular-nums shrink-0 transition-colors ${changed ? 'text-amber-400' : 'text-th-text-1'}`}>
          {display}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="scenario-slider w-full"
      />
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ScenarioPanel({ baseParams, baseResult, onApplyScenario }: ScenarioPanelProps) {
  const [copied, setCopied] = useState(false)

  const loyerBase   = getLoyerBase(baseParams)
  const isImmeuble  = baseParams.locType === 'immeuble'
  const apportBase  = baseParams.prixAchat > 0 ? Math.round((baseParams.apport / baseParams.prixAchat) * 100) : 20

  // Plages dynamiques centrées sur les valeurs de base
  const prixMin    = roundTo(baseParams.prixAchat * 0.60, 5000)
  const prixMax    = roundTo(baseParams.prixAchat * 1.50, 5000)
  const loyerMin   = Math.max(200, roundTo(loyerBase * 0.50, 50))
  const loyerMax   = roundTo(loyerBase * 2.0, 50)
  const travauxMax = Math.max(80000, roundTo((baseParams.travaux || 0) * 4, 5000))

  const defaultState: ScenarioState = {
    prixAchat: baseParams.prixAchat,
    loyer:     loyerBase,
    taux:      baseParams.taux,
    apportPct: apportBase,
    duree:     baseParams.duree,
    travaux:   baseParams.travaux || 0,
  }

  const [s, setS] = useState<ScenarioState>(() => {
    const fromUrl = readScenarioFromUrl()
    return fromUrl ? { ...defaultState, ...fromUrl } : defaultState
  })

  // Recalcul synchrone
  const scenarioParams = buildScenarioParams(baseParams, s)
  const scenarioResult = calculateInvestment(scenarioParams)

  const horizon = baseParams.horizonRevente ?? 10

  // Deltas
  const dRendNet    = Math.round((scenarioResult.rendementNet - baseResult.rendementNet) * 10) / 10
  const dCashflow   = Math.round(scenarioResult.cashflowMensuel - baseResult.cashflowMensuel)
  const dPatrimoine = Math.round(scenarioResult.patrimoineNetRevente - baseResult.patrimoineNetRevente)

  const isModified =
    s.prixAchat !== baseParams.prixAchat || s.loyer !== loyerBase ||
    s.taux !== baseParams.taux || s.apportPct !== apportBase ||
    s.duree !== baseParams.duree || s.travaux !== (baseParams.travaux || 0)

  // URL sync
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!isModified) URL_KEYS.forEach(k => url.searchParams.delete(k))
    else new URLSearchParams(encodeScenario(s)).forEach((v, k) => url.searchParams.set(k, v))
    window.history.replaceState(null, '', url.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s])

  // Couleurs KPI scénario
  const rendColor = scenarioResult.rendementNet >= 6 ? 'text-emerald-400' : scenarioResult.rendementNet >= 4 ? 'text-amber-400' : 'text-red-400'
  const cfColor   = scenarioResult.cashflowMensuel >= 0 ? 'text-emerald-400' : scenarioResult.cashflowMensuel >= -150 ? 'text-amber-400' : 'text-red-400'
  const patriColor = scenarioResult.patrimoineNetRevente > 0 ? 'text-emerald-400' : 'text-red-400'

  // Point mort
  const pointMort   = scenarioResult.pointMort
  const loyerActuel = s.loyer
  const ecart       = loyerActuel - pointMort

  // Décomposition point mort
  const compMensualite = Math.round(scenarioResult.mensualiteTotale)
  const compCopro      = isImmeuble ? 0 : Math.round(baseParams.chargesCopro / 12)
  const compTaxe       = Math.round(baseParams.taxeFonciere / 12)
  const compPno        = isImmeuble ? 0 : Math.round(baseParams.assurancePno / 12)
  const compCfe        = isImmeuble ? 0 : Math.round((baseParams.cfe || 0) / 12)
  const compAutres     = Math.max(0, pointMort - compMensualite - compCopro - compTaxe - compPno - compCfe)

  const decomposition = [
    { label: 'Crédit + assurance', value: compMensualite, color: '#6366f1' },
    { label: 'Charges copro',      value: compCopro,      color: '#f59e0b' },
    { label: 'Taxe foncière',      value: compTaxe,       color: '#f59e0b' },
    { label: 'Assurance PNO',      value: compPno,        color: '#8b5cf6' },
    { label: 'CFE',                value: compCfe,        color: '#8b5cf6' },
    { label: 'Gestion + vacance',  value: compAutres,     color: '#10b981' },
  ].filter(r => r.value > 0)

  // Leviers calculés proprement
  const prixCible   = useMemo(() => ecart < 0 ? findBreakEvenPrice(baseParams, s) : null, [ecart, s, baseParams])
  const dureeCible  = useMemo(() => ecart < 0 ? findBreakEvenDuration(baseParams, s) : null, [ecart, s, baseParams])

  const handleReset  = useCallback(() => setS(defaultState), []) // eslint-disable-line react-hooks/exhaustive-deps
  const handleApply  = () => onApplyScenario(scenarioParams)

  const formatPrix = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} M€` : `${Math.round(n / 1000)} k€`

  const loyerLabel = baseParams.locType === 'nu' ? 'Loyer mensuel (nu)'
    : baseParams.locType === 'coloc'      ? 'Loyer total coloc'
    : baseParams.locType === 'saisonnier' ? 'Revenu mensuel moyen'
    : 'Loyer mensuel (meublé)'

  return (
    <>
      <style>{`
        .scenario-slider { -webkit-appearance: none; appearance: none; height: 3px;
          background: rgba(255,255,255,0.08); border-radius: 99px; outline: none; cursor: pointer; width: 100%; }
        .scenario-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: #10b981; border: 2px solid var(--th-bg, #09090b);
          cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; }
        .scenario-slider::-webkit-slider-thumb:hover { transform: scale(1.25); box-shadow: 0 0 0 4px rgba(16,185,129,0.18); }
        .scenario-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%;
          background: #10b981; border: 2px solid var(--th-bg, #09090b); cursor: pointer; }
      `}</style>

      <div className="rounded-2xl border border-th-border bg-th-surface2 overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-th-border">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider">Et si…</span>
            {isModified && (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                Modifié
              </span>
            )}
          </div>
          <button
            onClick={handleReset}
            disabled={!isModified}
            className="text-[11px] font-semibold text-th-text-3 hover:text-th-text-1 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Réinitialiser
          </button>
        </div>

        {/* ── KPIs temps réel ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 px-4 pt-4 pb-3">
          <KpiChip
            label="Rdt net"
            value={`${scenarioResult.rendementNet.toFixed(1)}%`}
            delta={dRendNet}
            deltaFmt={n => `${Math.abs(n).toFixed(1)}%`}
            color={rendColor}
          />
          <KpiChip
            label="Cashflow"
            value={`${scenarioResult.cashflowMensuel >= 0 ? '+' : ''}${Math.round(scenarioResult.cashflowMensuel)}€`}
            delta={dCashflow}
            deltaFmt={n => `${Math.abs(n)}€/m`}
            color={cfColor}
          />
          <KpiChip
            label={`Patrim. ${horizon}a`}
            value={scenarioResult.patrimoineNetRevente > 0 ? formatPrix(scenarioResult.patrimoineNetRevente) : '—'}
            delta={dPatrimoine}
            deltaFmt={n => formatPrix(Math.abs(n))}
            color={patriColor}
          />
        </div>

        {/* ── Sliders ─────────────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 space-y-4 border-b border-th-border">
          <SliderRow
            label="Prix d'achat"
            value={s.prixAchat} min={prixMin} max={prixMax} step={5000}
            display={formatPrix(s.prixAchat)}
            onChange={v => setS(p => ({ ...p, prixAchat: v }))}
            changed={s.prixAchat !== baseParams.prixAchat}
          />

          {!isImmeuble && (
            <SliderRow
              label={loyerLabel}
              value={s.loyer} min={loyerMin} max={loyerMax} step={10}
              display={`${s.loyer} €/mois`}
              onChange={v => setS(p => ({ ...p, loyer: v }))}
              changed={s.loyer !== loyerBase}
            />
          )}

          <SliderRow
            label="Taux d'intérêt"
            value={s.taux} min={1.0} max={6.5} step={0.05}
            display={`${s.taux.toFixed(2)} %`}
            onChange={v => setS(p => ({ ...p, taux: v }))}
            changed={s.taux !== baseParams.taux}
          />

          <SliderRow
            label="Apport"
            value={s.apportPct} min={0} max={50} step={1}
            display={`${s.apportPct}% — ${formatPrix(Math.round(s.prixAchat * s.apportPct / 100))}`}
            onChange={v => setS(p => ({ ...p, apportPct: v }))}
            changed={s.apportPct !== apportBase}
          />

          <SliderRow
            label="Durée du crédit"
            value={s.duree} min={7} max={30} step={1}
            display={`${s.duree} ans`}
            onChange={v => setS(p => ({ ...p, duree: v }))}
            changed={s.duree !== baseParams.duree}
          />

          <SliderRow
            label="Budget travaux"
            value={s.travaux} min={0} max={travauxMax} step={2500}
            display={s.travaux === 0 ? 'Aucun' : formatCurrency(s.travaux)}
            onChange={v => setS(p => ({ ...p, travaux: v }))}
            changed={s.travaux !== (baseParams.travaux || 0)}
          />
        </div>

        {/* ── Point mort ──────────────────────────────────────────────────────── */}
        <div className="px-4 py-4 space-y-3 border-b border-th-border">
          {/* Titre + statut */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider mb-0.5">Point mort</p>
              <p className="text-[12px] text-th-text-2">
                Loyer min. pour couvrir toutes les charges :{' '}
                <span className="font-bold text-th-text-1 tabular-nums">{pointMort} €/mois</span>
              </p>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ${
              ecart >= 0
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-red-400 bg-red-500/10 border-red-500/20'
            }`}>
              {ecart >= 0 ? `+${Math.round(ecart)} €` : `${Math.round(ecart)} €`}
            </span>
          </div>

          {/* Alerte marge faible */}
          {ecart >= 0 && ecart < loyerActuel * 0.07 && (
            <p className="text-[11px] text-amber-400/80 bg-amber-500/[0.05] border border-amber-500/15 rounded-lg px-3 py-2 leading-relaxed">
              ⚡ Marge faible — un mois de vacance suffit à passer en déficit.
            </p>
          )}

          {/* Verdict déficit */}
          {ecart < 0 && (
            <p className="text-[12px] text-th-text-1 bg-red-500/[0.05] border border-red-500/15 rounded-lg px-3 py-2.5 leading-relaxed">
              Le loyer actuel ({loyerActuel} €) ne couvre pas les charges.{' '}
              <span className="text-red-400 font-semibold">Il manque {Math.abs(Math.round(ecart))} €/mois.</span>
            </p>
          )}

          {/* Décomposition */}
          <div className="space-y-2">
            {decomposition.map(row => (
              <div key={row.label} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 80px 46px' }}>
                <div className="h-1.5 bg-th-surface rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (row.value / pointMort) * 100).toFixed(1)}%`, background: row.color }}
                  />
                </div>
                <span className="text-[10px] text-th-text-3 truncate">{row.label}</span>
                <span className="text-[11px] font-semibold text-th-text-2 tabular-nums text-right">{row.value} €</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Leviers (si déficit) ─────────────────────────────────────────────── */}
        {ecart < 0 && (
          <div className="px-4 py-4 space-y-2 border-b border-th-border">
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
              Leviers pour rééquilibrer
            </p>

            {/* Levier 1 — loyer */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-th-surface border border-th-border">
              <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-[11px] font-semibold text-th-text-1">Augmenter le loyer</p>
                <p className="text-[11px] text-th-text-3 mt-0.5">
                  Cible : <span className="text-amber-400 font-bold">{pointMort} €/mois</span>
                  {' '}(+{Math.abs(Math.round(ecart))} € · à valider avec le marché local)
                </p>
              </div>
            </div>

            {/* Levier 2 — durée */}
            {dureeCible && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-th-surface border border-th-border">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-[11px] font-semibold text-th-text-1">Allonger la durée à {dureeCible} ans</p>
                  <p className="text-[11px] text-th-text-3 mt-0.5">
                    Réduit la mensualité de{' '}
                    <span className="text-amber-400 font-bold">
                      −{Math.round(scenarioResult.mensualiteTotale - calculateInvestment(buildScenarioParams(baseParams, { ...s, duree: dureeCible })).mensualiteTotale)} €/mois
                    </span>
                    {' '}· rééquilibre le cashflow
                  </p>
                </div>
              </div>
            )}

            {/* Levier 3 — prix */}
            {prixCible && (
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-th-surface border border-th-border">
                <span className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] font-black text-amber-400 shrink-0 mt-0.5">3</span>
                <div>
                  <p className="text-[11px] font-semibold text-th-text-1">Négocier le prix d'achat</p>
                  <p className="text-[11px] text-th-text-3 mt-0.5">
                    Viser{' '}<span className="text-amber-400 font-bold">{formatCurrency(prixCible)}</span>
                    {' '}(−{Math.round((1 - prixCible / s.prixAchat) * 100)}% · économise{' '}
                    <span className="text-amber-400 font-bold">
                      {Math.round(scenarioResult.mensualiteTotale - calculateInvestment(buildScenarioParams(baseParams, { ...s, prixAchat: prixCible })).mensualiteTotale)} €/mois
                    </span>)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          {/* Copier le lien */}
          {isModified ? (
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
                  : 'text-th-text-3 border-th-border hover:text-th-text-1 hover:border-th-border-med'
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
          ) : <div />}

          <button
            onClick={handleApply}
            disabled={!isModified}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-lg hover:bg-emerald-500/[0.18] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Appliquer ce scénario
          </button>
        </div>

      </div>
    </>
  )
}
