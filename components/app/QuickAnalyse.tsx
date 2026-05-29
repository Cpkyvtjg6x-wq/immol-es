'use client'

import { useState, useEffect, useCallback } from 'react'
import type { InvestmentParams } from '@/lib/types'
import { DEFAULT_PARAMS } from '@/lib/calculator'
import { AddressInput } from '@/components/app/AddressInput'
import type { AddressResult } from '@/components/app/AddressInput'
import { Tooltip } from '@/components/ui/Tooltip'

interface QuickAnalyseProps {
  onChange: (params: InvestmentParams) => void
  onSwitchExpert: (params: InvestmentParams) => void
  initialParams?: InvestmentParams
  liveResult?: {
    rendBrut: number
    cashflowMensuel: number
    score: number
    rendNetNet: number
  } | null
  liveUpdating?: boolean
}

// ─── Input numérique simple ──────────────────────────────────────────────────
function QInput({
  label, value, onChange, suffix, prefix, min = 0, step = 1000,
  placeholder, tooltip, tooltipExample,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  prefix?: string
  min?: number
  step?: number
  placeholder?: string
  tooltip?: string
  tooltipExample?: string
}) {
  const [raw, setRaw] = useState(value > 0 ? value.toString() : '')
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setRaw(value > 0 ? value.toString() : '')
  }, [value, focused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/[^0-9]/g, '')
    setRaw(v)
    const n = parseInt(v, 10)
    if (!isNaN(n) && n >= min) onChange(n)
    else if (v === '') onChange(0)
  }

  const display = focused ? raw : (value > 0 ? value.toLocaleString('fr-FR') : '')

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
        {label}
        {tooltip && <Tooltip content={tooltip} example={tooltipExample} />}
      </label>
      <div className={`relative flex items-center rounded-xl border transition-all duration-200 ${
        focused
          ? 'border-emerald-500/50 bg-[#0f1f18]'
          : 'border-white/[0.08] bg-[#111113] hover:border-white/[0.14]'
      }`}>
        {prefix && (
          <span className="pl-3.5 text-[13px] text-zinc-600 select-none">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onFocus={() => { setFocused(true); setRaw(value > 0 ? value.toString() : '') }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder ?? '0'}
          className="flex-1 bg-transparent px-3.5 py-3 text-[16px] font-semibold text-white tabular-nums outline-none placeholder:text-zinc-700 min-w-0"
          style={{ letterSpacing: '-0.02em' }}
        />
        {suffix && (
          <span className="pr-3.5 text-[13px] text-zinc-500 select-none shrink-0">{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ─── Badge résultat live ──────────────────────────────────────────────────────
function LiveKpi({ label, value, sub, tone }: {
  label: string
  value: string
  sub?: string
  tone: 'green' | 'red' | 'neutral' | 'amber'
}) {
  const colors = {
    green:   { val: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]', border: 'border-emerald-500/[0.15]' },
    red:     { val: 'text-red-400',     bg: 'bg-red-500/[0.06]',     border: 'border-red-500/[0.15]' },
    amber:   { val: 'text-amber-400',   bg: 'bg-amber-500/[0.06]',   border: 'border-amber-500/[0.12]' },
    neutral: { val: 'text-zinc-200',    bg: 'bg-white/[0.03]',       border: 'border-white/[0.08]' },
  }[tone]

  return (
    <div className={`flex flex-col gap-1 px-4 py-3.5 rounded-xl border ${colors.bg} ${colors.border}`}>
      <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-[0.16em]">{label}</span>
      <span className={`text-[22px] font-bold tabular-nums ${colors.val}`} style={{ letterSpacing: '-0.04em' }}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-zinc-700">{sub}</span>}
    </div>
  )
}

// ─── Score ring compact ───────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const pct = score / 100
  const dashOffset = circ * (1 - pct)
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9.5px] font-bold text-zinc-600 uppercase tracking-[0.16em]">Score</span>
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle
            cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <span className="text-[17px] font-bold tabular-nums" style={{ color, letterSpacing: '-0.04em' }}>
          {score}
        </span>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function QuickAnalyse({ onChange, onSwitchExpert, initialParams, liveResult, liveUpdating }: QuickAnalyseProps) {
  const [params, setParams] = useState<InvestmentParams>(() => ({
    ...DEFAULT_PARAMS,
    ...initialParams,
  }))
  const [locType, setLocType] = useState<'meuble' | 'nu'>(
    initialParams?.locType === 'nu' ? 'nu' : 'meuble'
  )
  const [tmi, setTmi] = useState(initialParams?.tmi ?? 30)
  const [adresseText, setAdresseText] = useState(initialParams?.adresse ?? '')

  const emit = useCallback((p: InvestmentParams) => {
    // Pas de debounce ici — handleChange dans le parent gère déjà 700ms
    onChange(p)
  }, [onChange])

  const update = useCallback((patch: Partial<InvestmentParams>) => {
    setParams(prev => {
      const next = { ...prev, ...patch }
      emit(next)
      return next
    })
  }, [emit])

  // Sync loyer selon locType
  const handleLocType = (lt: 'meuble' | 'nu') => {
    setLocType(lt)
    update({ locType: lt })
  }

  const handleTmi = (t: number) => {
    setTmi(t)
    update({ tmi: t })
  }

  const handleAddress = (result: AddressResult) => {
    setAdresseText(result.label)
    update({
      adresse:   result.label,
      ville:     result.ville,
      codeInsee: result.codeInsee,
      lat:       result.lat,
      lng:       result.lng,
      quartier:  result.quartier,
    })
  }

  // Déclenchement initial si params préchargés
  useEffect(() => {
    if (params.prixAchat > 0) emit(params)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loyer = locType === 'meuble' ? params.loyerMeuble : params.loyerNu
  const setLoyer = (v: number) => locType === 'meuble'
    ? update({ loyerMeuble: v })
    : update({ loyerNu: v })

  const hasResult = !!liveResult && params.prixAchat > 0

  const cfTone = !liveResult ? 'neutral'
    : liveResult.cashflowMensuel >= 100 ? 'green'
    : liveResult.cashflowMensuel >= 0 ? 'amber'
    : 'red'

  const rendTone = !liveResult ? 'neutral'
    : liveResult.rendBrut >= 7 ? 'green'
    : liveResult.rendBrut >= 5 ? 'amber'
    : 'red'

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-5 p-4 pb-8">

      {/* ── Carte principale ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0e] shadow-[0_4px_32px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.04)_inset] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span className="text-[13px] font-semibold text-zinc-200 tracking-[-0.01em]">Analyse rapide</span>
          </div>
          {liveUpdating && (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-600 font-mono">calcul en cours…</span>
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">

          {/* Localisation */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Ville / Adresse
            </label>
            <div className="rounded-xl border border-white/[0.08] bg-[#111113] hover:border-white/[0.14] transition-colors focus-within:border-emerald-500/50 focus-within:bg-[#0f1f18]">
              <AddressInput
                value={adresseText}
                onSelect={handleAddress}
                onChangeText={setAdresseText}
                placeholder="Lyon, Paris 11e, Bordeaux…"
                className="w-full bg-transparent px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-zinc-700"
              />
            </div>
          </div>

          {/* Grille 2 col */}
          <div className="grid grid-cols-2 gap-3">
            <QInput
              label="Prix d'achat"
              value={params.prixAchat}
              onChange={v => update({ prixAchat: v, fraisNotaire: Math.round(v * 0.08), apport: Math.round(v * 0.20) })}
              suffix="€"
              step={5000}
              placeholder="200 000"
              tooltip="Prix FAI (frais d'agence inclus). Les frais de notaire (~8%) sont calculés automatiquement."
              tooltipExample="Ex : 220 000 € pour un T2 à Lyon"
            />
            <QInput
              label="Surface"
              value={params.surface}
              onChange={v => update({ surface: v })}
              suffix="m²"
              step={5}
              placeholder="45"
              tooltip="Surface habitable du bien, hors balcon et cave."
              tooltipExample="Ex : 42 m² pour un T2"
            />
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Loyer mensuel
                <Tooltip
                  content="Loyer charges comprises que vous prévoyez de percevoir. Pour le meublé, ajoutez environ 15-20% vs le nu."
                  example="Ex : 750 €/mois pour un T2 meublé à Lyon"
                />
              </label>
              {/* Type de location inline */}
              <div className="flex gap-1.5 mb-1">
                {(['meuble', 'nu'] as const).map(lt => (
                  <button
                    key={lt}
                    type="button"
                    onClick={() => handleLocType(lt)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                      locType === lt
                        ? 'bg-emerald-500/[0.15] text-emerald-400 border border-emerald-500/[0.25]'
                        : 'bg-white/[0.03] text-zinc-600 border border-white/[0.06] hover:text-zinc-400'
                    }`}
                  >
                    {lt === 'meuble' ? 'Meublé' : 'Nu'}
                  </button>
                ))}
              </div>
              <div className="relative flex items-center rounded-xl border border-white/[0.08] bg-[#111113] hover:border-white/[0.14] transition-all duration-200 focus-within:border-emerald-500/50 focus-within:bg-[#0f1f18]">
                <input
                  type="text"
                  inputMode="numeric"
                  value={loyer > 0 ? loyer.toLocaleString('fr-FR') : ''}
                  onChange={e => {
                    const v = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10)
                    setLoyer(isNaN(v) ? 0 : v)
                  }}
                  placeholder="750"
                  className="flex-1 bg-transparent px-3.5 py-3 text-[16px] font-semibold text-white tabular-nums outline-none placeholder:text-zinc-700"
                  style={{ letterSpacing: '-0.02em' }}
                />
                <span className="pr-3.5 text-[13px] text-zinc-500 select-none">€/mois</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                TMI
                <Tooltip
                  content="Tranche Marginale d'Imposition — le taux auquel votre dernière tranche de revenus est taxée. Détermine l'optimisation fiscale recommandée."
                  example="0% · 11% · 30% · 41% · 45%"
                />
              </label>
              <div className="flex gap-1">
                {[0, 11, 30, 41, 45].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTmi(t)}
                    className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold tabular-nums transition-all duration-200 ${
                      tmi === t
                        ? 'bg-emerald-500/[0.15] text-emerald-400 border border-emerald-500/[0.25]'
                        : 'bg-white/[0.03] text-zinc-600 border border-white/[0.06] hover:text-zinc-400'
                    }`}
                  >
                    {t}%
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Résultats live ── */}
      <div className={`transition-all duration-500 ${hasResult ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {hasResult && liveResult && (
          <div className="space-y-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-2">
              <LiveKpi
                label="Rend. brut"
                value={`${liveResult.rendBrut.toFixed(2)}%`}
                sub="annuel"
                tone={rendTone}
              />
              <LiveKpi
                label="Cashflow"
                value={`${liveResult.cashflowMensuel >= 0 ? '+' : ''}${Math.round(liveResult.cashflowMensuel)} €`}
                sub="par mois"
                tone={cfTone}
              />
              <div className={`flex flex-col items-center justify-center px-4 py-3.5 rounded-xl border bg-white/[0.03] border-white/[0.08]`}>
                <ScoreRing score={liveResult.score} />
              </div>
            </div>

            {/* Rend net net */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-600">Rendement net net</span>
                <Tooltip content="Rendement après toutes charges, impôts et prélèvements sociaux, dans le régime fiscal le plus avantageux pour votre situation." />
              </div>
              <span className={`text-[15px] font-bold tabular-nums ${liveResult.rendNetNet >= 5 ? 'text-emerald-400' : liveResult.rendNetNet >= 3 ? 'text-amber-400' : 'text-red-400'}`} style={{ letterSpacing: '-0.03em' }}>
                {liveResult.rendNetNet.toFixed(2)} %
              </span>
            </div>

            {/* Disclaimer charges par défaut */}
            <div className="flex items-center gap-1.5 px-1">
              <svg className="w-3 h-3 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] text-zinc-700">Estimé avec charges par défaut — affinez en mode Expert</span>
            </div>

            {/* CTA Expert */}
            <button
              type="button"
              onClick={() => onSwitchExpert({ ...params, tmi, locType })}
              className="w-full group flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all duration-200"
            >
              <div className="text-left">
                <p className="text-[13px] font-semibold text-zinc-200">Analyse complète</p>
                <p className="text-[11px] text-zinc-600 mt-0.5">Fiscalité · Travaux · Financement · Marché</p>
              </div>
              <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </div>
        )}

        {/* Placeholder avant premier résultat */}
        {!hasResult && params.prixAchat === 0 && (
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl border border-dashed border-white/[0.06] gap-3">
            <div className="flex items-center gap-2 text-emerald-500/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-[11px] font-semibold uppercase tracking-widest">Prix d'achat requis</span>
            </div>
            <p className="text-[12px] text-zinc-700 text-center leading-relaxed">
              Saisissez le prix d'achat et le loyer pour obtenir rendement, cashflow et score instantanément.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
