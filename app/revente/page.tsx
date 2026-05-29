'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { LibraryPickerModal } from '@/components/app/LibraryPickerModal'
import { useAuth } from '@/lib/hooks/useAuth'
import type { SavedSimulation } from '@/lib/hooks/useSimulations'
import { formatCurrency } from '@/lib/utils'
import { IconHome, IconBuildingOffice, IconLightBulb, IconCheckCircle, IconExclamationTriangle } from '@/components/ui/icons'

// ─── Barèmes fiscaux 2025 ──────────────────────────────────────────────────────
const ABATTEMENT_IR: { ans: number; pct: number }[] = [
  { ans: 5, pct: 0 }, { ans: 6, pct: 6 }, { ans: 7, pct: 12 }, { ans: 8, pct: 18 },
  { ans: 9, pct: 24 }, { ans: 10, pct: 30 }, { ans: 11, pct: 36 }, { ans: 12, pct: 42 },
  { ans: 13, pct: 48 }, { ans: 14, pct: 54 }, { ans: 15, pct: 60 }, { ans: 16, pct: 66 },
  { ans: 17, pct: 72 }, { ans: 18, pct: 78 }, { ans: 19, pct: 84 }, { ans: 20, pct: 90 },
  { ans: 21, pct: 96 }, { ans: 22, pct: 100 },
]
const ABATTEMENT_PS: { ans: number; pct: number }[] = [
  { ans: 5, pct: 0 }, { ans: 6, pct: 1.65 }, { ans: 7, pct: 3.30 }, { ans: 8, pct: 4.95 },
  { ans: 9, pct: 6.60 }, { ans: 10, pct: 8.25 }, { ans: 11, pct: 9.90 }, { ans: 12, pct: 11.55 },
  { ans: 13, pct: 13.20 }, { ans: 14, pct: 14.85 }, { ans: 15, pct: 16.50 }, { ans: 16, pct: 18.15 },
  { ans: 17, pct: 19.80 }, { ans: 18, pct: 21.45 }, { ans: 19, pct: 23.10 }, { ans: 20, pct: 24.75 },
  { ans: 21, pct: 26.40 }, { ans: 22, pct: 28.00 }, { ans: 23, pct: 37.00 }, { ans: 24, pct: 46.00 },
  { ans: 25, pct: 55.00 }, { ans: 26, pct: 64.00 }, { ans: 27, pct: 73.00 }, { ans: 28, pct: 82.00 },
  { ans: 29, pct: 91.00 }, { ans: 30, pct: 100 },
]

function getAbattement(table: typeof ABATTEMENT_IR, ans: number): number {
  const tranche = [...table].reverse().find(t => ans >= t.ans)
  return tranche ? Math.min(tranche.pct, 100) : 0
}

// ─── TRI bisection ─────────────────────────────────────────────────────────────
function calcTRI(apport: number, cashflowAnnuel: number, produitNet: number, duree: number): number | null {
  if (apport <= 0 || duree <= 0) return null
  // flux[0] = -apport, flux[1..n-1] = cashflowAnnuel, flux[n] = cashflowAnnuel + produitNet
  const flux: number[] = [-apport]
  for (let i = 1; i < duree; i++) flux.push(cashflowAnnuel)
  flux.push(cashflowAnnuel + produitNet)

  const npv = (r: number) => flux.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0)
  let lo = -0.99, hi = 10.0
  if (npv(lo) * npv(hi) > 0) return null // pas de solution
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const v = npv(mid)
    if (Math.abs(v) < 0.5) return mid * 100
    if (npv(lo) * v < 0) hi = mid; else lo = mid
  }
  return ((lo + hi) / 2) * 100
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ReventeParams {
  typeBien: 'locatif' | 'residence_principale'
  modeSaisie: 'manuel' | 'acquis'
  // Bien acquis
  dateAchat: string        // 'YYYY-MM'
  // Prix
  prixAchat: number
  fraisAcquisition: number
  travauxDeduits: number
  prixRevente: number
  fraisRevente: number
  // Détention (mode manuel)
  anneesDetention: number
  // Crédit (mode acquis)
  capitalRestantDu: number
  ira: number              // indemnités remboursement anticipé
  fraisMainlevee: number
  // TRI
  showTRI: boolean
  apportInitial: number
  cashflowMensuelMoyen: number
  tmi: number
}

interface ReventeResult {
  plusValueBrute: number
  abattementIR: number
  abattementPS: number
  baseImposableIR: number
  baseImposablePS: number
  impotIR: number
  prelevementsSociaux: number
  surtaxe: number
  impotTotal: number
  plusValueNette: number
  reventeNette: number
  liquiditesNettes: number
  exonerationIR: boolean
  exonerationPS: boolean
  anneesDetention: number
}

// ─── Calcul ────────────────────────────────────────────────────────────────────
function calculerRevente(p: ReventeParams): ReventeResult {
  const ans = Math.max(0, p.anneesDetention)
  const prixRevientTotal = p.prixAchat + p.fraisAcquisition + p.travauxDeduits
  const plusValueBrute = p.prixRevente - p.fraisRevente - prixRevientTotal

  const reventeNette = Math.round(p.prixRevente - p.fraisRevente)
  const liquiditesBrutes = reventeNette - p.capitalRestantDu - p.ira - p.fraisMainlevee

  if (p.typeBien === 'residence_principale') {
    return {
      plusValueBrute: Math.round(plusValueBrute),
      abattementIR: 100, abattementPS: 100,
      baseImposableIR: 0, baseImposablePS: 0,
      impotIR: 0, prelevementsSociaux: 0, surtaxe: 0, impotTotal: 0,
      plusValueNette: Math.round(plusValueBrute),
      reventeNette,
      liquiditesNettes: Math.round(liquiditesBrutes),
      exonerationIR: true, exonerationPS: true,
      anneesDetention: ans,
    }
  }

  if (plusValueBrute <= 0) {
    return {
      plusValueBrute: Math.round(plusValueBrute),
      abattementIR: 0, abattementPS: 0,
      baseImposableIR: 0, baseImposablePS: 0,
      impotIR: 0, prelevementsSociaux: 0, surtaxe: 0, impotTotal: 0,
      plusValueNette: Math.round(plusValueBrute),
      reventeNette,
      liquiditesNettes: Math.round(liquiditesBrutes),
      exonerationIR: false, exonerationPS: false,
      anneesDetention: ans,
    }
  }

  const abIR = getAbattement(ABATTEMENT_IR, ans)
  const abPS = getAbattement(ABATTEMENT_PS, ans)
  const baseIR = plusValueBrute * (1 - abIR / 100)
  const basePS = plusValueBrute * (1 - abPS / 100)

  const TAUX_PV = 0.19
  const impotIR = baseIR > 0 ? baseIR * TAUX_PV : 0
  const ps = basePS > 0 ? basePS * 0.172 : 0

  let surtaxe = 0
  if (plusValueBrute > 260000) surtaxe = baseIR * 0.06
  else if (plusValueBrute > 210000) surtaxe = baseIR * 0.05
  else if (plusValueBrute > 160000) surtaxe = baseIR * 0.04
  else if (plusValueBrute > 110000) surtaxe = baseIR * 0.03
  else if (plusValueBrute > 60000) surtaxe = baseIR * 0.02
  else if (plusValueBrute > 50000) surtaxe = baseIR * 0.01

  const impotTotal = Math.round(impotIR + ps + surtaxe)
  const plusValueNette = Math.round(plusValueBrute - impotTotal)
  const liquiditesNettes = Math.round(liquiditesBrutes - impotTotal)

  return {
    plusValueBrute: Math.round(plusValueBrute),
    abattementIR: abIR, abattementPS: abPS,
    baseImposableIR: Math.round(baseIR),
    baseImposablePS: Math.round(basePS),
    impotIR: Math.round(impotIR + surtaxe),
    prelevementsSociaux: Math.round(ps),
    surtaxe: Math.round(surtaxe),
    impotTotal,
    plusValueNette,
    reventeNette: Math.round(reventeNette - impotTotal),
    liquiditesNettes,
    exonerationIR: abIR >= 100,
    exonerationPS: abPS >= 100,
    anneesDetention: ans,
  }
}

function calcResultForAns(p: ReventeParams, ans: number): ReventeResult {
  return calculerRevente({ ...p, anneesDetention: ans })
}

// ─── UI Components ─────────────────────────────────────────────────────────────
function NumInput({
  label, value, onChange, min = 0, suffix = '€', hint, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; suffix?: string; hint?: string; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          disabled={disabled}
          className={`w-full border rounded-xl px-4 py-3 pr-12 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50 transition-colors ${
            disabled
              ? 'bg-th-surface border-th-border text-th-text-3 cursor-not-allowed'
              : 'bg-th-surface2 border-th-border-med hover:border-th-border-med'
          }`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-th-text-2">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-th-text-3 mt-1">{hint}</p>}
    </div>
  )
}

function Row({ label, value, color = 'white', bold = false, sep = false }: {
  label: string; value: string; color?: string; bold?: boolean; sep?: boolean
}) {
  const col = color === 'emerald' ? 'text-emerald-400'
    : color === 'red' ? 'text-red-400'
    : color === 'amber' ? 'text-amber-400'
    : 'text-th-text-1'
  return (
    <div className={`flex items-center justify-between py-2 ${sep ? 'border-t border-th-border-med mt-1 pt-3' : 'border-b border-th-border'}`}>
      <span className={`text-sm ${bold ? 'font-bold text-th-text-1' : 'text-th-text-2'}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${col}`}>{value}</span>
    </div>
  )
}

// ─── Frise abattements ─────────────────────────────────────────────────────────
function FriseAbattements({ ans }: { ans: number }) {
  const MAX = 32
  const steps = Array.from({ length: MAX + 1 }, (_, i) => i)
  const irPct = (a: number) => getAbattement(ABATTEMENT_IR, a)
  const psPct = (a: number) => getAbattement(ABATTEMENT_PS, a)

  // Milestones fixes : { a, label, align: 'left'|'center'|'right', note? }
  const milestones: { a: number; label: string; align: 'left' | 'center' | 'right'; noteColor?: string }[] = [
    { a: 0,  label: '0 an',    align: 'left' },
    { a: 6,  label: '6 ans',   align: 'center' },
    { a: 22, label: '22 ans — exo IR', align: 'center', noteColor: 'text-emerald-400' },
    { a: 30, label: '30 ans — exo PS', align: 'right',  noteColor: 'text-emerald-400' },
  ]

  const cursorX = Math.min(ans, MAX) / MAX * 100

  // Transform selon alignement
  const xShift = (align: string) =>
    align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%'

  return (
    <div className="space-y-2">

      {/* Label position courante — au-dessus des barres */}
      <div className="relative h-5">
        {ans >= 0 && ans <= MAX && (
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: `${cursorX}%`,
              transform: ans === 0 ? 'translateX(0%)' : ans >= MAX ? 'translateX(-100%)' : 'translateX(-50%)',
              top: 0,
            }}
          >
            <span className="text-[11px] text-th-text-1 font-bold whitespace-nowrap bg-th-surface2 px-2 py-0.5 rounded-full">
              {ans} an{ans !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* IR bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">IR · 19%</span>
          <span className="text-xs font-bold text-emerald-400">{irPct(ans)}% abattu</span>
        </div>
        <div className="relative h-5 rounded-full overflow-hidden bg-th-surface2">
          {steps.slice(0, -1).map(i => {
            const avgPct = (irPct(i) + irPct(i + 1)) / 2
            return (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{
                  left: `${i / MAX * 100}%`,
                  width: `${1 / MAX * 100}%`,
                  backgroundColor: `rgba(16, 185, 129, ${avgPct / 100 * 0.85 + 0.05})`,
                }}
              />
            )
          })}
          <div
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{ left: `${cursorX}%`, boxShadow: '0 0 5px rgba(255,255,255,0.8)' }}
          />
        </div>
      </div>

      {/* PS bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">PS · 17.2%</span>
          <span className="text-xs font-bold text-indigo-400">{psPct(ans)}% abattu</span>
        </div>
        <div className="relative h-5 rounded-full overflow-hidden bg-th-surface2">
          {steps.slice(0, -1).map(i => {
            const avgPct = (psPct(i) + psPct(i + 1)) / 2
            return (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{
                  left: `${i / MAX * 100}%`,
                  width: `${1 / MAX * 100}%`,
                  backgroundColor: `rgba(99, 102, 241, ${avgPct / 100 * 0.85 + 0.05})`,
                }}
              />
            )
          })}
          <div
            className="absolute top-0 h-full w-0.5 bg-white"
            style={{ left: `${cursorX}%`, boxShadow: '0 0 5px rgba(255,255,255,0.8)' }}
          />
        </div>
      </div>

      {/* Repères fixes */}
      <div className="relative h-7 mt-1">
        {milestones.map(m => (
          <div
            key={m.a}
            className="absolute top-0 flex flex-col"
            style={{
              left: `${m.a / MAX * 100}%`,
              transform: `translateX(${xShift(m.align)})`,
            }}
          >
            <div className={`w-px h-2 mb-0.5 mx-auto ${m.noteColor ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            <span className={`text-[10px] whitespace-nowrap font-medium ${m.noteColor ?? 'text-th-text-2'}`}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tableau vendre vs garder ──────────────────────────────────────────────────
function TableauVendreGarder({ params, currentAns }: { params: ReventeParams; currentAns: number }) {
  const rows = [
    { label: 'Maintenant', ans: currentAns },
    { label: `+1 an (${currentAns + 1} ans)`, ans: currentAns + 1 },
    { label: `+2 ans (${currentAns + 2} ans)`, ans: currentAns + 2 },
    { label: `+5 ans (${currentAns + 5} ans)`, ans: currentAns + 5 },
    { label: '22 ans', ans: 22 },
    { label: '30 ans', ans: 30 },
  ].filter((r, i, arr) => {
    // déduplique les lignes dont les ans seraient identiques
    return arr.findIndex(x => x.ans === r.ans) === i && r.ans >= 0
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-th-border-med">
            <th className="text-left py-2 pr-3 text-th-text-2 font-semibold">Durée</th>
            <th className="text-right py-2 px-2 text-emerald-400 font-semibold">Abat. IR</th>
            <th className="text-right py-2 px-2 text-indigo-400 font-semibold">Abat. PS</th>
            <th className="text-right py-2 px-2 text-red-400 font-semibold">Impôts</th>
            <th className="text-right py-2 pl-2 text-th-text-1 font-semibold">PV nette</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const res = calcResultForAns(params, r.ans)
            const isCurrent = r.ans === currentAns
            return (
              <tr
                key={r.ans}
                className={`border-b border-th-border ${isCurrent ? 'bg-emerald-500/[0.12]' : ''}`}
              >
                <td className={`py-2 pr-3 font-semibold ${isCurrent ? 'text-emerald-400' : 'text-th-text-1'}`}>
                  {r.label}
                  {isCurrent && <span className="ml-1.5 text-[9px] text-emerald-500 font-bold bg-emerald-500/20 px-1.5 py-0.5 rounded-full">Actuel</span>}
                </td>
                <td className={`text-right py-2 px-2 tabular-nums ${res.exonerationIR ? 'text-emerald-400' : 'text-th-text-2'}`}>
                  {res.exonerationIR ? '100%' : `${res.abattementIR}%`}
                </td>
                <td className={`text-right py-2 px-2 tabular-nums ${res.exonerationPS ? 'text-emerald-400' : 'text-th-text-2'}`}>
                  {res.exonerationPS ? '100%' : `${res.abattementPS}%`}
                </td>
                <td className={`text-right py-2 px-2 tabular-nums ${res.impotTotal > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {res.impotTotal > 0 ? `– ${formatCurrency(res.impotTotal)}` : '0 €'}
                </td>
                <td className={`text-right py-2 pl-2 tabular-nums font-bold ${res.plusValueNette >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {res.plusValueNette >= 0 ? '+' : ''}{formatCurrency(res.plusValueNette)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ReventePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const importDoneRef = useRef(false)

  const [params, setParams] = useState<ReventeParams>({
    typeBien: 'locatif',
    modeSaisie: 'manuel',
    dateAchat: '',
    prixAchat: 200000,
    fraisAcquisition: 16000,
    travauxDeduits: 0,
    prixRevente: 260000,
    fraisRevente: 13000,
    anneesDetention: 10,
    capitalRestantDu: 0,
    ira: 0,
    fraisMainlevee: 800,
    showTRI: false,
    apportInitial: 30000,
    cashflowMensuelMoyen: 0,
    tmi: 30,
  })

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  // Calcul durée depuis dateAchat
  useEffect(() => {
    if (params.modeSaisie === 'acquis' && params.dateAchat) {
      // Valider le format YYYY-MM avant de parser
      if (!/^\d{4}-\d{2}$/.test(params.dateAchat)) return
      const [y, m] = params.dateAchat.split('-').map(Number)
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return
      const now = new Date()
      const moisEcoules = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
      const ans = Math.max(0, Math.floor(moisEcoules / 12))
      setParams(p => ({ ...p, anneesDetention: ans }))
    }
  }, [params.modeSaisie, params.dateAchat])

  // IRA auto (3% CRD) quand CRD change
  useEffect(() => {
    if (params.modeSaisie === 'acquis' && params.capitalRestantDu > 0) {
      setParams(p => ({ ...p, ira: Math.round(p.capitalRestantDu * 0.03) }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.capitalRestantDu])

  const set = <K extends keyof ReventeParams>(k: K, v: ReventeParams[K]) =>
    setParams(p => ({ ...p, [k]: v }))

  const [pickerOpen, setPickerOpen] = useState(false)

  function importFromLibrary(sim: SavedSimulation) {
    const d = (sim.params ?? {}) as Record<string, number | undefined>
    setParams(p => ({
      ...p,
      prixAchat: (d.prixAchat as number) ?? sim.prixAchat ?? p.prixAchat,
      fraisAcquisition: (d.fraisNotaire as number) ?? p.fraisAcquisition,
      travauxDeduits: (d.travaux as number) ?? p.travauxDeduits,
      apportInitial: (d.apport as number) ?? p.apportInitial,
      tmi: (d.tmi as number) ?? p.tmi,
    }))
    importDoneRef.current = true
  }

  const result = useMemo(() => calculerRevente(params), [params])

  const tri = useMemo(() => {
    if (!params.showTRI || params.apportInitial <= 0) return null
    return calcTRI(
      params.apportInitial,
      params.cashflowMensuelMoyen * 12,
      result.liquiditesNettes,
      params.anneesDetention || 1,
    )
  }, [params.showTRI, params.apportInitial, params.cashflowMensuelMoyen, result.liquiditesNettes, params.anneesDetention])

  const exoTotal = result.exonerationIR && result.exonerationPS
  const hasCredit = params.capitalRestantDu > 0

  if (authLoading) return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center">
      <div className="relative w-8 h-8">
        <div className="w-8 h-8 border border-th-border-med rounded-full" />
        <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <AppShell>
      <div className="min-h-screen bg-th-bg text-th-text-1">

        {/* Top bar */}
        <div className="border-b border-th-border px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-th-text-3 uppercase tracking-widest mb-0.5">Outils</p>
            <h1 className="text-xl font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
              Simulateur de revente
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.12] hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Importer depuis la bibliothèque
            </button>
            <Link href="/dashboard" className="text-xs font-semibold text-th-text-2 hover:text-th-text-1 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </Link>
          </div>
        </div>

        <div className="px-8 py-8 max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">

            {/* ── Formulaire ── */}
            <div className="space-y-5">

              {/* A. Type de bien */}
              <div className="rounded-2xl border border-th-border bg-th-surface p-6 space-y-4">
                <h2 className="text-sm font-bold text-th-text-1">Type de bien</h2>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'locatif', label: 'Investissement locatif', Icon: IconBuildingOffice, desc: 'Impôt sur le bénéfice de vente' },
                    { id: 'residence_principale', label: 'Résidence principale', Icon: IconHome, desc: 'Aucun impôt sur le bénéfice' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => set('typeBien', t.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        params.typeBien === t.id
                          ? 'border-emerald-500/40 bg-emerald-500/[0.12]'
                          : 'border-th-border bg-th-surface hover:border-th-border-med'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-th-surface2 border border-th-border flex items-center justify-center shrink-0">
                        <t.Icon className="w-4 h-4 text-th-text-2" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-th-text-1">{t.label}</p>
                        <p className="text-[11px] text-th-text-2 mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* B. Informations du bien */}
              <div className="rounded-2xl border border-th-border bg-th-surface p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-th-text-1">Informations du bien</h2>
                  {/* Mode toggle */}
                  <div className="flex rounded-lg border border-th-border-med overflow-hidden">
                    {([
                      { id: 'manuel', label: 'Simulation' },
                      { id: 'acquis', label: 'Bien acquis' },
                    ] as const).map(m => (
                      <button
                        key={m.id}
                        onClick={() => set('modeSaisie', m.id)}
                        className={`px-3.5 py-1.5 text-xs font-semibold transition-all ${
                          params.modeSaisie === m.id
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'text-th-text-2 hover:text-th-text-1'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {params.modeSaisie === 'acquis' && (
                  <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 p-4 space-y-4">
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">Votre bien actuel</p>
                      <p className="text-[11px] text-th-text-2">Renseignez les infos de votre crédit pour calculer ce qu&apos;il vous restera en poche après la vente.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-1.5">Mois et année d&apos;achat</label>
                      <input
                        type="month"
                        value={params.dateAchat}
                        onChange={e => set('dateAchat', e.target.value)}
                        max={new Date().toISOString().slice(0, 7)}
                        className="w-full bg-th-surface2 border border-th-border-med rounded-xl px-4 py-3 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      {params.dateAchat && /^\d{4}-\d{2}$/.test(params.dateAchat) ? (
                        <p className="text-[11px] text-emerald-400 mt-1">
                          {params.anneesDetention} an{params.anneesDetention !== 1 ? 's' : ''} de détention — durée calculée automatiquement
                        </p>
                      ) : params.dateAchat ? (
                        <p className="text-[11px] text-amber-400 mt-1">Sélectionnez un mois et une année complets</p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <NumInput
                        label="Solde du crédit"
                        value={params.capitalRestantDu}
                        onChange={v => set('capitalRestantDu', v)}
                        hint="Ce qu'il reste à rembourser à la banque"
                      />
                      <NumInput
                        label="Pénalité de remboursement"
                        value={params.ira}
                        onChange={v => set('ira', v)}
                        hint="Calculée auto (3% du solde) — modifiable"
                      />
                      <NumInput
                        label="Frais de clôture crédit"
                        value={params.fraisMainlevee}
                        onChange={v => set('fraisMainlevee', v)}
                        hint="Levée d'hypothèque (~800 €)"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <NumInput label="Prix d'achat" value={params.prixAchat} onChange={v => set('prixAchat', v)} hint="Prix payé au vendeur" />
                  <NumInput label="Frais de notaire et d'agence" value={params.fraisAcquisition} onChange={v => set('fraisAcquisition', v)} hint="Frais payés à l'achat (notaire ~8%, agence)" />
                  <NumInput label="Travaux réalisés" value={params.travauxDeduits} onChange={v => set('travauxDeduits', v)} hint="Travaux non déduits de vos loyers — réduisent l'impôt" />
                  <div className="flex items-end">
                    <div className="w-full">
                      <p className="text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-1">Coût total de votre investissement</p>
                      <p className="text-lg font-black text-th-text-1 tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                        {formatCurrency(params.prixAchat + params.fraisAcquisition + params.travauxDeduits)}
                      </p>
                      <p className="text-[11px] text-th-text-3 mt-0.5">Base de calcul de votre bénéfice</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* C. Prix de revente */}
              <div className="rounded-2xl border border-th-border bg-th-surface p-6 space-y-4">
                <h2 className="text-sm font-bold text-th-text-1">Prix de vente envisagé</h2>
                <div className="grid grid-cols-2 gap-4">
                  <NumInput label="Prix de vente" value={params.prixRevente} onChange={v => set('prixRevente', v)} hint="Prix auquel vous vendez le bien" />
                  <NumInput label="Commission agence (vente)" value={params.fraisRevente} onChange={v => set('fraisRevente', v)} hint="Honoraires de l'agent immobilier vendeur" />
                </div>
              </div>

              {/* D. Durée de détention */}
              <div className="rounded-2xl border border-th-border bg-th-surface p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-th-text-1">Durée de possession</h2>
                    <p className="text-[11px] text-th-text-2 mt-0.5">Plus vous gardez longtemps, moins vous payez d&apos;impôts</p>
                  </div>
                  <span className={`text-2xl font-black tabular-nums ${params.anneesDetention >= 30 ? 'text-emerald-400' : params.anneesDetention >= 22 ? 'text-emerald-300' : 'text-th-text-1'}`}
                    style={{ letterSpacing: '-0.04em' }}>
                    {isNaN(params.anneesDetention) ? '—' : `${params.anneesDetention} ans`}
                  </span>
                </div>
                {params.modeSaisie === 'acquis' && params.dateAchat && /^\d{4}-\d{2}$/.test(params.dateAchat) ? (
                  <p className="text-xs text-th-text-2">Calculée automatiquement depuis votre date d&apos;achat.</p>
                ) : (
                  <>
                    <input
                      type="range" min={0} max={35} value={params.anneesDetention}
                      onChange={e => set('anneesDetention', parseInt(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-th-text-3">
                      <span>0</span>
                      <span className="text-emerald-500 font-semibold">22 ans → exo IR</span>
                      <span className="text-emerald-500 font-semibold">30 ans → exo totale</span>
                      <span>35</span>
                    </div>
                  </>
                )}
              </div>

              {/* E. TRI (collapsible) */}
              <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
                <button
                  onClick={() => set('showTRI', !params.showTRI)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-th-surface transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${params.showTRI ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <h2 className="text-sm font-bold text-th-text-1">Rentabilité globale de l&apos;opération</h2>
                    <span className="text-[11px] text-th-text-2 font-medium">Optionnel</span>
                  </div>
                  <svg className={`w-4 h-4 text-th-text-2 transition-transform ${params.showTRI ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {params.showTRI && (
                  <div className="px-6 pb-6 space-y-4 border-t border-th-border">
                    <p className="text-xs text-th-text-2 pt-4">
                      Le TRI (Taux de Rentabilité Interne) mesure la performance annuelle de votre opération, en comparant ce que vous avez investi, ce que vous avez encaissé chaque mois, et ce que vous récupérez à la vente.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <NumInput
                        label="Apport personnel versé"
                        value={params.apportInitial}
                        onChange={v => set('apportInitial', v)}
                        hint="Somme que vous avez investie de votre poche à l'achat"
                      />
                      <NumInput
                        label="Loyer net mensuel moyen"
                        value={params.cashflowMensuelMoyen}
                        onChange={v => set('cashflowMensuelMoyen', v)}
                        hint="Loyer perçu, après toutes charges (peut être négatif)"
                        min={-99999}
                      />
                    </div>
                    {tri !== null ? (
                      <div className={`rounded-xl p-4 border text-center ${
                        tri >= 8 ? 'border-emerald-500/30 bg-emerald-500/[0.12]'
                        : tri >= 4 ? 'border-amber-500/30 bg-amber-500/[0.04]'
                        : 'border-red-500/20 bg-red-500/[0.04]'
                      }`}>
                        <p className="text-[11px] text-th-text-2 uppercase tracking-wider mb-1">Rentabilité annuelle sur {params.anneesDetention} ans</p>
                        <p className={`text-3xl font-black tabular-nums ${tri >= 8 ? 'text-emerald-400' : tri >= 4 ? 'text-amber-400' : 'text-red-400'}`}
                          style={{ letterSpacing: '-0.04em' }}>
                          {tri.toFixed(1)}% / an
                        </p>
                        <p className="text-[11px] text-th-text-2 mt-1">
                          {tri >= 10 ? 'Excellent' : tri >= 7 ? 'Très bon' : tri >= 4 ? 'Correct' : 'Faible'}
                          {' '}· Livret A ≈ 2.5% · SCPI ≈ 5%
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-th-text-3 text-center py-2">Renseignez votre apport pour calculer la rentabilité</p>
                    )}
                  </div>
                )}
              </div>

            </div>{/* fin formulaire */}

            {/* ── Résultats (sticky) ── */}
            <div className="sticky top-6 space-y-5">

              {/* KPI principal */}
              <div className={`rounded-2xl p-6 text-center border ${
                exoTotal
                  ? 'border-emerald-500/30 bg-emerald-500/[0.12]'
                  : result.plusValueBrute <= 0
                  ? 'border-red-500/20 bg-red-500/[0.04]'
                  : 'border-th-border bg-th-surface'
              }`}>
                {exoTotal && (
                  <div className="flex items-center gap-1.5 justify-center mb-2">
                    <IconCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider">Exonération totale</p>
                  </div>
                )}
                <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider mb-2">
                  {hasCredit ? 'Argent récupéré après la vente' : 'Bénéfice net après impôts'}
                </p>
                <p className={`text-4xl font-black tabular-nums ${
                  (hasCredit ? result.liquiditesNettes : result.plusValueNette) >= 0
                    ? 'text-emerald-400' : 'text-red-400'
                }`} style={{ letterSpacing: '-0.04em' }}>
                  {(hasCredit ? result.liquiditesNettes : result.plusValueNette) >= 0 ? '+' : ''}
                  {formatCurrency(hasCredit ? result.liquiditesNettes : result.plusValueNette)}
                </p>
                {!exoTotal && result.plusValueBrute > 0 && (
                  <p className="text-xs text-th-text-2 mt-2">
                    Impôts : {formatCurrency(result.impotTotal)}
                    {hasCredit && ` · CRD : ${formatCurrency(params.capitalRestantDu)}`}
                  </p>
                )}
              </div>

              {/* Frise abattements */}
              {params.typeBien === 'locatif' && result.plusValueBrute > 0 && (
                <div className="rounded-2xl border border-th-border bg-th-surface p-5">
                  <p className="text-[11px] font-semibold text-th-text-3 uppercase tracking-wider mb-4">Réduction d&apos;impôt selon la durée de possession</p>
                  <FriseAbattements ans={params.anneesDetention} />
                </div>
              )}

              {/* Détail calcul */}
              <div className="rounded-2xl border border-th-border bg-th-surface p-5">
                <p className="text-[11px] font-semibold text-th-text-3 uppercase tracking-wider mb-3">Comment on calcule</p>

                <Row label="Prix de vente" value={formatCurrency(params.prixRevente)} />
                <Row label="– Commission agence (vente)" value={`– ${formatCurrency(params.fraisRevente)}`} color="red" />
                <Row label="– Ce que vous avez investi" value={`– ${formatCurrency(params.prixAchat + params.fraisAcquisition + params.travauxDeduits)}`} color="red" />
                <Row
                  label="= Bénéfice brut de la vente"
                  value={`${result.plusValueBrute >= 0 ? '+' : ''}${formatCurrency(result.plusValueBrute)}`}
                  color={result.plusValueBrute >= 0 ? 'emerald' : 'red'}
                  bold sep
                />

                {params.typeBien === 'locatif' && result.plusValueBrute > 0 && (
                  <>
                    {!result.exonerationIR ? (
                      <>
                        <Row label={`Réduction IR (${result.abattementIR}% selon durée)`} value={`– ${formatCurrency(Math.round(result.plusValueBrute * result.abattementIR / 100))}`} color="emerald" />
                        <Row label="Impôt sur le bénéfice (19%)" value={`– ${formatCurrency(result.impotIR)}`} color="red" />
                      </>
                    ) : (
                      <Row label="Impôt sur le bénéfice" value="Exonéré" color="emerald" />
                    )}
                    {!result.exonerationPS ? (
                      <>
                        <Row label={`Réduction cotisations (${result.abattementPS}%)`} value={`– ${formatCurrency(Math.round(result.plusValueBrute * result.abattementPS / 100))}`} color="emerald" />
                        <Row label="Cotisations sociales (17.2%)" value={`– ${formatCurrency(result.prelevementsSociaux)}`} color="red" />
                      </>
                    ) : (
                      <Row label="Cotisations sociales" value="Exonérées" color="emerald" />
                    )}
                    <Row label="Total impôts à payer" value={`– ${formatCurrency(result.impotTotal)}`} color={result.impotTotal > 0 ? 'red' : 'emerald'} bold sep />
                  </>
                )}

                {params.typeBien === 'residence_principale' && (
                  <div className="mt-3 rounded-xl bg-emerald-500/[0.12] border border-emerald-500/20 px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <p className="text-xs font-semibold text-emerald-400">Résidence principale — Aucun impôt sur le bénéfice</p>
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-th-border-med">
                  <Row label="Ce que vous encaissez à la vente" value={formatCurrency(result.reventeNette + result.impotTotal)} bold />
                  {hasCredit && (
                    <>
                      <Row label="– Remboursement du crédit" value={`– ${formatCurrency(params.capitalRestantDu)}`} color="red" />
                      <Row label="– Pénalité de remboursement" value={`– ${formatCurrency(params.ira)}`} color="red" />
                      <Row label="– Frais de clôture crédit" value={`– ${formatCurrency(params.fraisMainlevee)}`} color="red" />
                      <Row label="– Impôts" value={`– ${formatCurrency(result.impotTotal)}`} color="red" />
                      <Row
                        label="= Argent disponible après vente"
                        value={`${result.liquiditesNettes >= 0 ? '+' : ''}${formatCurrency(result.liquiditesNettes)}`}
                        color={result.liquiditesNettes >= 0 ? 'emerald' : 'red'}
                        bold sep
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Tableau vendre vs garder */}
              {params.typeBien === 'locatif' && result.plusValueBrute > 0 && (
                <div className="rounded-2xl border border-th-border bg-th-surface p-5">
                  <p className="text-[11px] font-semibold text-th-text-3 uppercase tracking-wider mb-3">Attendre réduit vos impôts — comparaison</p>
                  <TableauVendreGarder params={params} currentAns={params.anneesDetention} />
                </div>
              )}

              {/* Conseil optimisation */}
              {params.typeBien === 'locatif' && !exoTotal && result.plusValueBrute > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <IconLightBulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <p className="text-xs font-bold text-amber-400">Optimisation fiscale</p>
                  </div>
                  <p className="text-xs text-th-text-2 leading-relaxed">
                    {!result.exonerationIR
                      ? <>Attendre <strong className="text-th-text-1">{22 - params.anneesDetention} an{22 - params.anneesDetention > 1 ? 's' : ''}</strong> vous exonère d&apos;IR. Économie estimée : <strong className="text-emerald-400">{formatCurrency(result.impotIR)}</strong>.</>
                      : <>Attendre <strong className="text-th-text-1">{30 - params.anneesDetention} an{30 - params.anneesDetention > 1 ? 's' : ''}</strong> vous exonère aussi des prélèvements sociaux. Économie estimée : <strong className="text-emerald-400">{formatCurrency(result.prelevementsSociaux)}</strong>.</>
                    }
                  </p>
                </div>
              )}

              <Link
                href="/analyse"
                className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold py-3.5 rounded-xl text-sm transition-all"
              >
                Analyser un nouveau bien →
              </Link>

            </div>{/* fin résultats */}
          </div>
        </div>
      </div>

      <LibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={importFromLibrary}
        title="Importer un bien de la bibliothèque"
      />
    </AppShell>
  )
}
