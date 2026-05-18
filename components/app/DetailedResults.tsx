'use client'

import { useState } from 'react'
import { InvestmentResult, FiscalRegime } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine, Cell,
} from 'recharts'

interface DetailedResultsProps {
  result: InvestmentResult
  fiscalResults: FiscalRegime[] | null
}

const tabs = [
  { id: 'cashflow', label: 'Cashflow' },
  { id: 'fiscal', label: 'Fiscalité' },
  { id: 'revente', label: 'Revente & TRI' },
  { id: 'amort', label: 'Amortissement' },
  { id: 'projection', label: 'Projection 20 ans' },
]

const tooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px' },
  labelStyle: { color: '#a1a1aa', fontSize: 11, marginBottom: 4 },
  itemStyle: { fontSize: 12 },
}

export function DetailedResults({ result, fiscalResults }: DetailedResultsProps) {
  const [tab, setTab] = useState('cashflow')

  const hasFiscal = fiscalResults && fiscalResults.filter(r => !r.disabled).length > 0
  const hasRevente = result.prixRevente != null && result.prixRevente > 0

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      {/* Tab nav */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3.5 text-[13px] font-medium whitespace-nowrap transition-colors relative ${
              tab === t.id ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
            {t.id === 'fiscal' && hasFiscal && (
              <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                {fiscalResults!.filter(r => !r.disabled).length}
              </span>
            )}
            {t.id === 'revente' && hasRevente && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block align-middle" />
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'cashflow' && <CashflowTab result={result} />}
        {tab === 'fiscal' && <FiscalTab fiscalResults={fiscalResults} />}
        {tab === 'revente' && <ReventeTab result={result} />}
        {tab === 'amort' && <AmortTab result={result} />}
        {tab === 'projection' && <ProjectionTab result={result} />}
      </div>
    </div>
  )
}

/* ─── Cashflow tab ─────────────────────────────────────────────────────────── */
function CashflowTab({ result }: { result: InvestmentResult }) {
  const rows = [
    { label: 'Loyers bruts annuels', value: result.loyerAnnuelBrut, type: 'income' },
    { label: `Vacance locative (${result.moisLoues}/12 mois loués)`, value: -result.vacanceAnnuelle, type: 'charge' },
    { label: 'Loyers nets encaissés', value: result.loyerAnnuelNet, type: 'subtotal' },
    { label: 'Taxe foncière + charges copro', value: -(result.totalCharges - result.fraisGestionAnnuel - result.provisionAnnuelle - result.gliAnnuel - result.cfe), type: 'charge' },
    { label: 'Gestion + GLI + provision travaux', value: -(result.fraisGestionAnnuel + result.gliAnnuel + result.provisionAnnuelle), type: 'charge' },
    { label: 'CFE', value: -result.cfe, type: result.cfe > 0 ? 'charge' : 'neutral' },
    { label: 'Total charges annuelles', value: -result.chargesAnnuelles, type: 'charge' },
    { label: 'Mensualité crédit (annuel)', value: -result.mensualiteCredit * 12, type: 'charge' },
    { label: 'Cashflow net annuel', value: result.cashflowAnnuel, type: 'result' },
  ]

  return (
    <div className="space-y-5">
      <div className="space-y-0.5">
        {rows.map((row, i) => {
          const isResult = row.type === 'result'
          const isSubtotal = row.type === 'subtotal'
          const isNeutral = row.type === 'neutral'
          const color = isResult
            ? row.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            : row.type === 'income' ? 'text-emerald-400'
            : isNeutral ? 'text-zinc-500'
            : 'text-red-400'
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                isResult ? 'bg-white/[0.06] border border-white/[0.08]' :
                isSubtotal ? 'bg-white/[0.03]' : ''
              }`}
            >
              <span className={`text-xs ${isResult || isSubtotal ? 'font-semibold text-white' : 'text-zinc-500'}`}>
                {row.label}
              </span>
              <span className={`text-xs font-semibold tabular-nums ${color}`}>
                {row.value >= 0 ? '+' : ''}{formatCurrency(row.value)}
              </span>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/[0.05]">
        {[
          { label: 'Cashflow / mois', value: `${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`, color: result.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Mensualité crédit', value: `${Math.round(result.mensualiteCredit)} €`, color: 'text-white' },
          { label: 'Point mort loyer', value: `${result.pointMort} €/mois`, color: 'text-amber-400' },
        ].map((m) => (
          <div key={m.label} className="text-center rounded-xl bg-white/[0.03] py-3 px-2">
            <p className="text-[10px] text-zinc-600 mb-1">{m.label}</p>
            <p className={`text-base font-bold tabular-nums ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Fiscal tab ───────────────────────────────────────────────────────────── */
function FiscalTab({ fiscalResults }: { fiscalResults: FiscalRegime[] | null }) {
  const [showAll, setShowAll] = useState(false)

  if (!fiscalResults || fiscalResults.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Renseignez votre TMI</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">Dans la section Fiscalité du formulaire, sélectionnez votre tranche marginale pour comparer les 10 régimes fiscaux.</p>
        </div>
      </div>
    )
  }

  const enabled = fiscalResults.filter((r) => !r.disabled)
  const disabled = fiscalResults.filter((r) => r.disabled)
  const sorted = [...enabled].sort((a, b) => b.rendNetNet - a.rendNetNet)
  const best = sorted[0]
  const displayed = showAll ? sorted : sorted.slice(0, 5)

  // Chart data
  const chartData = sorted.slice(0, 6).map((r) => ({
    name: r.shortName || r.name.split(' ')[0],
    rendement: parseFloat(r.rendNetNet.toFixed(2)),
    impot: Math.round(r.totalFiscal),
  }))

  return (
    <div className="space-y-6">
      {/* Best regime banner */}
      {best && (
        <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-400/80 font-semibold uppercase tracking-wider mb-1">⭐ Régime recommandé</p>
            <p className="text-base font-bold text-white">{best.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Rendement nette-nette le plus élevé dans votre situation</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-2xl font-black text-emerald-400" style={{ letterSpacing: '-0.04em' }}>{formatPct(best.rendNetNet)}</p>
            <p className="text-[11px] text-zinc-600">nette-nette</p>
          </div>
        </div>
      )}

      {/* Bar chart comparison */}
      {chartData.length > 1 && (
        <div>
          <p className="text-[11px] text-zinc-600 mb-3">Rendement nette-nette par régime</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Rdt nette-nette']} />
              <Bar dataKey="rendement" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? '#10b981' : 'rgba(255,255,255,0.08)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Regime list */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[1fr_80px_80px_80px_70px] gap-2 px-3 mb-1">
          {['Régime', 'Impôts', 'Charges soc.', 'Net/an', 'Rdt N-N'].map((h) => (
            <span key={h} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {displayed.map((r, i) => {
          const isBest = i === 0
          const nnColor = r.rendNetNet >= 5 ? 'text-emerald-400' : r.rendNetNet >= 3 ? 'text-amber-400' : 'text-red-400'
          return (
            <div
              key={r.id}
              className={`grid grid-cols-[1fr_80px_80px_80px_70px] gap-2 items-center px-3 py-3 rounded-xl transition-colors ${
                isBest ? 'bg-emerald-500/[0.06] border border-emerald-500/15' : 'bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-white">{r.name}</p>
                {r.tag && <span className="text-[10px] text-zinc-600">{r.tag}</span>}
              </div>
              <span className="text-xs text-red-400 tabular-nums">{formatCurrency(r.impot)}</span>
              <span className="text-xs text-amber-400 tabular-nums">{formatCurrency(r.ps)}</span>
              <span className="text-xs text-white tabular-nums font-medium">{formatCurrency(r.net)}</span>
              <span className={`text-xs font-bold tabular-nums ${nnColor}`}>{formatPct(r.rendNetNet)}</span>
            </div>
          )
        })}

        {enabled.length > 5 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="w-full text-xs text-zinc-600 hover:text-zinc-400 transition-colors py-2"
          >
            {showAll ? '↑ Afficher moins' : `↓ Voir ${enabled.length - 5} régimes de plus`}
          </button>
        )}
      </div>

      {disabled.length > 0 && (
        <div className="pt-3 border-t border-white/[0.05]">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Non éligibles dans votre situation</p>
          <div className="space-y-1">
            {disabled.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg opacity-40">
                <p className="text-xs text-zinc-500 line-through">{r.name}</p>
                <p className="text-[10px] text-zinc-600">{r.disabledReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Revente & TRI tab ────────────────────────────────────────────────────── */
function ReventeTab({ result }: { result: InvestmentResult }) {
  const prixRevente = result.prixRevente ?? 0
  const plusValue = result.plusValueBrute ?? 0
  const impotPV = result.impotPlusValue ?? 0
  const patrimoineNet = result.patrimoineNetRevente ?? 0
  const tri = result.tri ?? 0
  const abatIR = result.abattementPVIR ?? 0
  const abatPS = result.abattementPVPS ?? 0

  const hasData = prixRevente > 0

  if (!hasData) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white mb-1">Configurez l&apos;horizon de revente</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">Ouvrez la section «&nbsp;Revente & TRI&nbsp;» dans le formulaire pour définir votre horizon et la valorisation annuelle.</p>
        </div>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Prix de revente estimé',
      value: formatCurrency(prixRevente),
      color: 'text-white',
      sub: 'Valorisation annuelle appliquée',
    },
    {
      label: 'Plus-value brute',
      value: formatCurrency(plusValue),
      color: plusValue > 0 ? 'text-emerald-400' : 'text-zinc-500',
      sub: 'Prix revente − prix acquisition',
    },
    {
      label: 'Abattement IR',
      value: `${Math.round(abatIR)}%`,
      color: 'text-emerald-400',
      sub: abatIR >= 100 ? 'Exonération totale IR' : 'Selon durée de détention',
    },
    {
      label: 'Abattement PS',
      value: `${Math.round(abatPS)}%`,
      color: 'text-emerald-400',
      sub: abatPS >= 100 ? 'Exonération totale PS' : 'Prélèvements sociaux 17.2%',
    },
    {
      label: 'Impôt sur plus-value',
      value: formatCurrency(impotPV),
      color: impotPV > 0 ? 'text-red-400' : 'text-emerald-400',
      sub: impotPV === 0 ? 'Exonéré selon durée de détention' : 'IR 19% + PS 17.2% (après abattements)',
    },
    {
      label: 'Patrimoine net à la revente',
      value: formatCurrency(patrimoineNet),
      color: patrimoineNet > 0 ? 'text-emerald-400' : 'text-red-400',
      sub: 'Revente − capital restant − impôts − frais agence',
    },
  ]

  return (
    <div className="space-y-6">
      {/* TRI hero */}
      {tri > 0 && (
        <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-400/80 font-semibold uppercase tracking-wider mb-1">TRI — Taux de Rendement Interne</p>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
              Rentabilité globale de l&apos;opération, intégrant l&apos;apport initial, les cashflows annuels, la plus-value nette et les impôts à la revente.
            </p>
          </div>
          <div className="text-right shrink-0 ml-6">
            <p className={`text-3xl font-black ${tri >= 8 ? 'text-emerald-400' : tri >= 4 ? 'text-amber-400' : 'text-red-400'}`} style={{ letterSpacing: '-0.04em' }}>
              {tri.toFixed(1)}%
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5">
              {tri >= 8 ? 'Excellent' : tri >= 5 ? 'Bon' : tri >= 3 ? 'Moyen' : 'Faible'}
            </p>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{m.label}</p>
            <p className={`text-lg font-bold tabular-nums ${m.color}`} style={{ letterSpacing: '-0.02em' }}>{m.value}</p>
            <p className="text-[10px] text-zinc-600 mt-1 leading-snug">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Plus-value timeline */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">Abattements plus-value selon durée de détention</p>
        <div className="space-y-2">
          {[
            { label: 'Avant 5 ans', ir: '0%', ps: '0%', note: 'Aucun abattement' },
            { label: '6–10 ans', ir: '6%/an', ps: '1.65%/an', note: '' },
            { label: '11–15 ans', ir: '6%/an', ps: '1.65%/an', note: '' },
            { label: '16–21 ans', ir: '6%/an', ps: '1.60%/an', note: '' },
            { label: '22 ans', ir: '100% exo', ps: 'en cours', note: 'Exonération IR totale' },
            { label: '30 ans+', ir: '100% exo', ps: '100% exo', note: 'Exonération totale' },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[80px_60px_80px_1fr] gap-2 items-center text-[11px]">
              <span className="text-zinc-500">{row.label}</span>
              <span className="text-emerald-400 font-medium">{row.ir}</span>
              <span className="text-amber-400 font-medium">{row.ps}</span>
              <span className="text-zinc-600 italic">{row.note}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.05] text-[10px]">
          <span className="text-emerald-400 font-semibold">● IR (19%)</span>
          <span className="text-amber-400 font-semibold">● PS (17.2%)</span>
        </div>
      </div>

      <p className="text-[10px] text-zinc-600 leading-relaxed">
        * Calcul indicatif selon les règles fiscales en vigueur. Consultez un conseiller fiscal pour votre situation personnelle.
      </p>
    </div>
  )
}

/* ─── Amortissement tab ────────────────────────────────────────────────────── */
function AmortTab({ result }: { result: InvestmentResult }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')

  if (!result.tableauAmortissement || result.tableauAmortissement.length === 0) {
    return <p className="text-sm text-zinc-500 py-8 text-center">Données d&apos;amortissement non disponibles.</p>
  }

  const chartData = result.tableauAmortissement
    .filter((_, i) => (i + 1) % 12 === 0)
    .map((row) => ({
      an: `An ${row.annee}`,
      capital: Math.round(row.capitalRembourse),
      interets: Math.round(row.interetsPaies),
      restant: Math.round(row.capitalRestant),
    }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          Capital emprunté : <span className="text-white font-semibold">{formatCurrency(result.montantEmprunte)}</span>
          {' · '}
          Coût total crédit : <span className="text-red-400 font-semibold">{formatCurrency(result.coutCredit)}</span>
        </p>
        <div className="flex items-center gap-1 p-0.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
          {(['chart', 'table'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                view === v ? 'bg-white text-zinc-950' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {v === 'chart' ? 'Graphique' : 'Tableau'}
            </button>
          ))}
        </div>
      </div>

      {view === 'chart' && (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="an" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
            <Bar dataKey="capital" name="Capital remboursé" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="interets" name="Intérêts payés" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {view === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Année', 'Capital remboursé', 'Intérêts payés', 'Capital restant'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-2 pr-4 text-zinc-400">{row.an}</td>
                  <td className="py-2 pr-4 text-emerald-400 tabular-nums">{formatCurrency(row.capital)}</td>
                  <td className="py-2 pr-4 text-violet-400 tabular-nums">{formatCurrency(row.interets)}</td>
                  <td className="py-2 pr-4 text-white tabular-nums">{formatCurrency(row.restant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ─── Projection tab ───────────────────────────────────────────────────────── */
function ProjectionTab({ result }: { result: InvestmentResult }) {
  if (!result.projection || result.projection.length === 0) {
    return <p className="text-sm text-zinc-500 py-8 text-center">Données de projection non disponibles.</p>
  }

  const data = result.projection.map((p) => ({
    an: `An ${p.annee}`,
    patrimoine: Math.round(p.valeurBien - p.capitalRestant),
    valeur: Math.round(p.valeurBien),
    cashflow: Math.round(p.cashflowCumule),
    dette: Math.round(p.capitalRestant),
  }))

  const final = data[data.length - 1]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Patrimoine net à 20 ans', value: formatCurrency(final.patrimoine), color: 'text-emerald-400' },
          { label: 'Valeur estimée du bien', value: formatCurrency(final.valeur), color: 'text-white' },
          { label: 'Cashflow cumulé', value: `${final.cashflow >= 0 ? '+' : ''}${formatCurrency(final.cashflow)}`, color: final.cashflow >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-center">
            <p className="text-[10px] text-zinc-600 mb-2 leading-tight">{m.label}</p>
            <p className={`text-base font-bold tabular-nums ${m.color}`} style={{ letterSpacing: '-0.02em' }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[11px] text-zinc-600 mb-3">Évolution du patrimoine net — valeur bien moins capital restant dû</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="an" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k€`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#71717a' }} />
            <Line dataKey="valeur" name="Valeur bien" stroke="#6366f1" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            <Line dataKey="patrimoine" name="Patrimoine net" stroke="#10b981" strokeWidth={2.5} dot={false} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-[11px] text-zinc-600 mb-3">Cashflow cumulé sur 20 ans</p>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="an" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
            <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k€`} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Line
              dataKey="cashflow"
              name="Cashflow cumulé"
              stroke={final.cashflow >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-zinc-600 leading-relaxed border-t border-white/[0.05] pt-3">
        * Projection sur 20 ans avec revalorisation IRL des loyers. Résultats indicatifs, avant fiscalité.
      </p>
    </div>
  )
}
