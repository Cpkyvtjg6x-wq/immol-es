'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { formatCurrency } from '@/lib/utils'

// ─── Barèmes fiscaux 2025 (locatif) ───────────────────────────────────────────
// Abattement IR progressif sur la plus-value immobilière locative
const ABATTEMENT_IR: { ans: number; pct: number }[] = [
  { ans: 5, pct: 0 },
  { ans: 6, pct: 6 },
  { ans: 7, pct: 12 },
  { ans: 8, pct: 18 },
  { ans: 9, pct: 24 },
  { ans: 10, pct: 30 },
  { ans: 11, pct: 36 },
  { ans: 12, pct: 42 },
  { ans: 13, pct: 48 },
  { ans: 14, pct: 54 },
  { ans: 15, pct: 60 },
  { ans: 16, pct: 66 },
  { ans: 17, pct: 72 },
  { ans: 18, pct: 78 },
  { ans: 19, pct: 84 },
  { ans: 20, pct: 90 },
  { ans: 21, pct: 96 },
  { ans: 22, pct: 100 }, // exonéré IR après 22 ans
]

// Abattement prélèvements sociaux (17.2%)
const ABATTEMENT_PS: { ans: number; pct: number }[] = [
  { ans: 5, pct: 0 },
  { ans: 6, pct: 1.65 },
  { ans: 7, pct: 3.30 },
  { ans: 8, pct: 4.95 },
  { ans: 9, pct: 6.60 },
  { ans: 10, pct: 8.25 },
  { ans: 11, pct: 9.90 },
  { ans: 12, pct: 11.55 },
  { ans: 13, pct: 13.20 },
  { ans: 14, pct: 14.85 },
  { ans: 15, pct: 16.50 },
  { ans: 16, pct: 18.15 },
  { ans: 17, pct: 19.80 },
  { ans: 18, pct: 21.45 },
  { ans: 19, pct: 23.10 },
  { ans: 20, pct: 24.75 },
  { ans: 21, pct: 26.40 },
  { ans: 22, pct: 28.00 },
  { ans: 23, pct: 37.00 },
  { ans: 24, pct: 46.00 },
  { ans: 25, pct: 55.00 },
  { ans: 26, pct: 64.00 },
  { ans: 27, pct: 73.00 },
  { ans: 28, pct: 82.00 },
  { ans: 29, pct: 91.00 },
  { ans: 30, pct: 100 }, // exonéré PS après 30 ans
]

function getAbattement(table: typeof ABATTEMENT_IR, ans: number): number {
  // Trouver la tranche applicable
  const tranche = [...table].reverse().find(t => ans >= t.ans)
  return tranche ? Math.min(tranche.pct, 100) : 0
}

interface ReventeParams {
  typeBien: 'locatif' | 'residence_principale'
  prixAchat: number
  fraisAcquisition: number // frais notaire + agence achat
  travauxDeduits: number   // travaux déductibles
  prixRevente: number
  fraisRevente: number     // agence vente
  anneesDetention: number
  tmi: number             // tranche marginale IR (pour locatif)
}

interface ReventeResult {
  plusValueBrute: number
  plusValueImposable: number // après abattements
  abattementIR: number
  abattementPS: number
  baseImposableIR: number
  baseImposablePS: number
  impotIR: number
  prelevementsSociaux: number
  impotTotal: number
  plusValueNette: number
  reventeNette: number   // prix revente - agence - impôts
  exonerationIR: boolean
  exonerationPS: boolean
}

function calculerRevente(p: ReventeParams): ReventeResult {
  // Base de calcul
  const prixRevientTotal = p.prixAchat + p.fraisAcquisition + p.travauxDeduits
  const plusValueBrute = p.prixRevente - p.fraisRevente - prixRevientTotal

  if (p.typeBien === 'residence_principale') {
    // Exonération totale résidence principale
    return {
      plusValueBrute,
      plusValueImposable: 0,
      abattementIR: 100,
      abattementPS: 100,
      baseImposableIR: 0,
      baseImposablePS: 0,
      impotIR: 0,
      prelevementsSociaux: 0,
      impotTotal: 0,
      plusValueNette: plusValueBrute,
      reventeNette: p.prixRevente - p.fraisRevente,
      exonerationIR: true,
      exonerationPS: true,
    }
  }

  if (plusValueBrute <= 0) {
    return {
      plusValueBrute,
      plusValueImposable: 0,
      abattementIR: 0,
      abattementPS: 0,
      baseImposableIR: 0,
      baseImposablePS: 0,
      impotIR: 0,
      prelevementsSociaux: 0,
      impotTotal: 0,
      plusValueNette: plusValueBrute,
      reventeNette: p.prixRevente - p.fraisRevente,
      exonerationIR: false,
      exonerationPS: false,
    }
  }

  const ans = Math.max(0, p.anneesDetention)
  const abIR = getAbattement(ABATTEMENT_IR, ans)
  const abPS = getAbattement(ABATTEMENT_PS, ans)

  const baseIR = plusValueBrute * (1 - abIR / 100)
  const basePS = plusValueBrute * (1 - abPS / 100)

  const taux_ir = p.tmi / 100 // 19% taux forfaitaire flat tax sur PV immo
  const TAUX_PV_IMMO = 0.19 // taux fixe 19% pour les non-résidents, sinon TMI plafonné
  const impotIR = baseIR > 0 ? baseIR * TAUX_PV_IMMO : 0
  const ps = basePS > 0 ? basePS * 0.172 : 0

  // Taxe sur les hautes plus-values (>50k€)
  let surtaxe = 0
  if (plusValueBrute > 260000) surtaxe = baseIR * 0.06
  else if (plusValueBrute > 210000) surtaxe = baseIR * 0.05
  else if (plusValueBrute > 160000) surtaxe = baseIR * 0.04
  else if (plusValueBrute > 110000) surtaxe = baseIR * 0.03
  else if (plusValueBrute > 60000) surtaxe = baseIR * 0.02
  else if (plusValueBrute > 50000) surtaxe = baseIR * 0.01

  const impotTotal = Math.round(impotIR + ps + surtaxe)
  const plusValueNette = Math.round(plusValueBrute - impotTotal)
  const reventeNette = p.prixRevente - p.fraisRevente - impotTotal

  return {
    plusValueBrute: Math.round(plusValueBrute),
    plusValueImposable: Math.round(baseIR),
    abattementIR: abIR,
    abattementPS: abPS,
    baseImposableIR: Math.round(baseIR),
    baseImposablePS: Math.round(basePS),
    impotIR: Math.round(impotIR + surtaxe),
    prelevementsSociaux: Math.round(ps),
    impotTotal,
    plusValueNette,
    reventeNette: Math.round(reventeNette),
    exonerationIR: abIR >= 100,
    exonerationPS: abPS >= 100,
  }
}

// ─── UI Components ────────────────────────────────────────────────────────────

function NumberInput({
  label, value, onChange, min = 0, suffix = '€', hint,
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; suffix?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">{suffix}</span>
      </div>
      {hint && <p className="text-[11px] text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

function ResultRow({ label, value, color = 'white', bold = false }: {
  label: string; value: string; color?: string; bold?: boolean
}) {
  const textColor = color === 'emerald' ? 'text-emerald-400'
    : color === 'red' ? 'text-red-400'
    : color === 'amber' ? 'text-amber-400'
    : 'text-white'
  return (
    <div className={`flex items-center justify-between py-2.5 ${bold ? 'border-t border-white/[0.06] mt-1' : 'border-b border-white/[0.04]'}`}>
      <span className={`text-sm ${bold ? 'font-bold text-white' : 'text-zinc-400'}`}>{label}</span>
      <span className={`text-sm font-bold tabular-nums ${textColor}`}>{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TAUX_IMR = [0, 11, 30, 41, 45]

export default function ReventePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [params, setParams] = useState<ReventeParams>({
    typeBien: 'locatif',
    prixAchat: 200000,
    fraisAcquisition: 16000,
    travauxDeduits: 0,
    prixRevente: 260000,
    fraisRevente: 13000,
    anneesDetention: 10,
    tmi: 30,
  })

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  const set = <K extends keyof ReventeParams>(k: K, v: ReventeParams[K]) =>
    setParams(p => ({ ...p, [k]: v }))

  const result = useMemo(() => calculerRevente(params), [params])

  const cfColor = (v: number) => v >= 0 ? 'emerald' : 'red'

  if (authLoading) return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="relative w-8 h-8">
        <div className="w-8 h-8 border border-white/[0.08] rounded-full" />
        <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
      </div>
    </div>
  )

  const exoTotal = result.exonerationIR && result.exonerationPS

  return (
    <AppShell>
      <div className="min-h-screen bg-[#09090b] text-white">

        {/* Top bar */}
        <div className="border-b border-white/[0.05] px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-0.5">Outils</p>
            <h1 className="text-xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
              Simulateur de revente
            </h1>
          </div>
          <Link href="/dashboard" className="text-xs font-semibold text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
        </div>

        <div className="px-8 py-8 max-w-6xl">
          <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">

            {/* ── Formulaire ── */}
            <div className="space-y-6">

              {/* Type de bien */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Type de bien</h2>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'locatif', label: 'Investissement locatif', icon: '🏠', desc: 'Flat tax 19% + PS 17.2%' },
                    { id: 'residence_principale', label: 'Résidence principale', icon: '🏡', desc: 'Exonération totale' },
                  ] as const).map(t => (
                    <button
                      key={t.id}
                      onClick={() => set('typeBien', t.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                        params.typeBien === t.id
                          ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]'
                      }`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white">{t.label}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prix */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-4">
                <h2 className="text-sm font-bold text-white">Prix &amp; coûts</h2>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="Prix d'achat" value={params.prixAchat} onChange={v => set('prixAchat', v)} />
                  <NumberInput label="Frais d'acquisition" value={params.fraisAcquisition} onChange={v => set('fraisAcquisition', v)} hint="Notaire + agence achat" />
                  <NumberInput label="Travaux déductibles" value={params.travauxDeduits} onChange={v => set('travauxDeduits', v)} hint="Travaux non déduits des revenus fonciers" />
                  <NumberInput label="Prix de revente" value={params.prixRevente} onChange={v => set('prixRevente', v)} />
                  <NumberInput label="Frais de revente" value={params.fraisRevente} onChange={v => set('fraisRevente', v)} hint="Commission agence vendeur" />
                </div>
                <div className="pt-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Prix de revient total</p>
                  <p className="text-xl font-black text-white tabular-nums" style={{ letterSpacing: '-0.03em' }}>
                    {formatCurrency(params.prixAchat + params.fraisAcquisition + params.travauxDeduits)}
                  </p>
                </div>
              </div>

              {/* Détention */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 space-y-5">
                <h2 className="text-sm font-bold text-white">Durée de détention</h2>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500">Durée de détention</span>
                    <span className="text-lg font-black text-white">{params.anneesDetention} ans</span>
                  </div>
                  <input
                    type="range" min={0} max={35} value={params.anneesDetention}
                    onChange={e => set('anneesDetention', parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                    <span>0 an</span>
                    <span className="text-emerald-500 font-bold">22 ans → exo IR</span>
                    <span className="text-emerald-500 font-bold">30 ans → exo totale</span>
                    <span>35 ans</span>
                  </div>
                </div>

                {/* Abattements visuels */}
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-4 text-center border ${result.exonerationIR ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Abattement IR</p>
                    <p className={`text-2xl font-black ${result.exonerationIR ? 'text-emerald-400' : 'text-white'}`}>
                      {result.abattementIR}%
                    </p>
                    {result.exonerationIR && <p className="text-[11px] text-emerald-500 mt-1">✓ Exonéré</p>}
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${result.exonerationPS ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/[0.07] bg-white/[0.02]'}`}>
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Abattement PS</p>
                    <p className={`text-2xl font-black ${result.exonerationPS ? 'text-emerald-400' : 'text-white'}`}>
                      {result.abattementPS}%
                    </p>
                    {result.exonerationPS && <p className="text-[11px] text-emerald-500 mt-1">✓ Exonéré</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Résultats ── */}
            <div className="sticky top-6 space-y-5">

              {/* KPI principal */}
              <div className={`rounded-2xl p-6 text-center border ${
                exoTotal
                  ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                  : result.plusValueBrute <= 0
                  ? 'border-red-500/20 bg-red-500/[0.04]'
                  : 'border-white/[0.07] bg-white/[0.03]'
              }`}>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {exoTotal ? '🎉 Plus-value nette (exonérée)' : 'Plus-value nette après impôts'}
                </p>
                <p className={`text-4xl font-black tabular-nums ${
                  result.plusValueNette >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`} style={{ letterSpacing: '-0.04em' }}>
                  {result.plusValueNette >= 0 ? '+' : ''}{formatCurrency(result.plusValueNette)}
                </p>
                {!exoTotal && result.plusValueBrute > 0 && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Impôts : {formatCurrency(result.impotTotal)} · Brute : {formatCurrency(result.plusValueBrute)}
                  </p>
                )}
              </div>

              {/* Détail calcul */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mb-4">Détail du calcul</p>
                <div className="space-y-0">
                  <ResultRow label="Prix de revente" value={formatCurrency(params.prixRevente)} />
                  <ResultRow label="– Frais de revente" value={`– ${formatCurrency(params.fraisRevente)}`} color="red" />
                  <ResultRow label="– Prix de revient" value={`– ${formatCurrency(params.prixAchat + params.fraisAcquisition + params.travauxDeduits)}`} color="red" />
                  <ResultRow
                    label="= Plus-value brute"
                    value={`${result.plusValueBrute >= 0 ? '+' : ''}${formatCurrency(result.plusValueBrute)}`}
                    color={result.plusValueBrute >= 0 ? 'emerald' : 'red'}
                    bold
                  />
                </div>

                {params.typeBien === 'locatif' && result.plusValueBrute > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider mt-5 mb-3">Fiscalité</p>
                    <div className="space-y-0">
                      {!result.exonerationIR ? (
                        <>
                          <ResultRow label={`Abattement IR (${result.abattementIR}%)`} value={`– ${formatCurrency(Math.round(result.plusValueBrute * result.abattementIR / 100))}`} color="emerald" />
                          <ResultRow label="Base imposable IR (19%)" value={formatCurrency(result.baseImposableIR)} />
                          <ResultRow label="Impôt sur la PV (19%)" value={`– ${formatCurrency(result.impotIR)}`} color="red" />
                        </>
                      ) : (
                        <ResultRow label="Impôt IR (exonéré)" value="0 €" color="emerald" />
                      )}
                      {!result.exonerationPS ? (
                        <>
                          <ResultRow label={`Abattement PS (${result.abattementPS}%)`} value={`– ${formatCurrency(Math.round(result.plusValueBrute * result.abattementPS / 100))}`} color="emerald" />
                          <ResultRow label="Prélèvements sociaux (17.2%)" value={`– ${formatCurrency(result.prelevementsSociaux)}`} color="red" />
                        </>
                      ) : (
                        <ResultRow label="Prélèvements sociaux (exonérés)" value="0 €" color="emerald" />
                      )}
                      <ResultRow
                        label="Total impôts"
                        value={`– ${formatCurrency(result.impotTotal)}`}
                        color={result.impotTotal > 0 ? 'red' : 'emerald'}
                        bold
                      />
                    </div>
                  </>
                )}

                {params.typeBien === 'residence_principale' && (
                  <div className="mt-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-400">✓ Résidence principale — Exonération totale d&apos;impôt sur la plus-value</p>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">Produit net de cession</span>
                    <span className="text-lg font-black text-emerald-400 tabular-nums">{formatCurrency(result.reventeNette)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600">Prix revente − frais − impôts</p>
                </div>
              </div>

              {/* Conseil selon durée */}
              {params.typeBien === 'locatif' && !exoTotal && result.plusValueBrute > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                  <p className="text-xs font-bold text-amber-400 mb-1">💡 Optimisation fiscale</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {params.anneesDetention < 22
                      ? `Attendre ${22 - params.anneesDetention} an${22 - params.anneesDetention > 1 ? 's' : ''} de plus vous exonère totalement d'IR sur la plus-value.`
                      : `Attendre ${30 - params.anneesDetention} an${30 - params.anneesDetention > 1 ? 's' : ''} de plus vous exonère aussi des prélèvements sociaux.`}
                    {' '}Économie estimée : {
                      params.anneesDetention < 22
                        ? formatCurrency(result.impotIR)
                        : formatCurrency(result.prelevementsSociaux)
                    }
                  </p>
                </div>
              )}

              <Link
                href="/analyse"
                className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 rounded-xl text-sm transition-all"
              >
                Analyser un nouveau bien →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
