'use client'

import { useState } from 'react'
import { InvestmentResult, FiscalRegime } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine,
} from 'recharts'

interface DetailedResultsProps {
  result: InvestmentResult
  fiscalResults: FiscalRegime[] | null
}

const tabs = [
  { id: 'cashflow', label: 'Cashflow' },
  { id: 'fiscal', label: 'Fiscalité' },
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

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      {/* Tab nav */}
      <div className="flex border-b border-white/[0.06] overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3.5 text-[13px] font-medium whitespace-nowrap transition-colors relative ${
              tab === t.id
                ? 'text-white'
                : 'text-zinc-600 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
            {t.id === 'fiscal' && fiscalResults && fiscalResults.filter(r => !r.disabled).length > 0 && (
              <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                {fiscalResults.filter(r => !r.disabled).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'cashflow' && <CashflowTab result={result} />}
        {tab === 'fiscal' && <FiscalTab fiscalResults={fiscalResults} />}
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
    { label: 'Gestion + GLI + provision', value: -(result.fraisGestionAnnuel + result.gliAnnuel + result.provisionAnnuelle), type: 'charge' },
    { label: 'CFE', value: -result.cfe, type: result.cfe > 0 ? 'charge' : 'neutral' },
    { label: 'Total charges annuelles', value: -result.chargesAnnuelles, type: 'charge' },
    { label: 'Mensualité crédit (annuel)', value: -result.mensualiteCredit * 12, type: 'charge' },
    { label: 'Cashflow net annuel', value: result.cashflowAnnuel, type: 'result' },
  ]

  return (
    <div className="space-y-5">
      {/* Waterfall rows */}
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

      {/* Quick metrics */}
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
          <p className="text-sm font-semibold text-white mb-1">Analyse fiscale non disponible</p>
          <p className="text-xs text-zinc-500">Passez en mode <strong className="text-zinc-300">Avancé</strong> et renseignez votre TMI pour comparer les 10 régimes fiscaux.</p>
        </div>
      </div>
    )
  }

  const enabled = fiscalResults.filter((r) => !r.disabled)
  const disabled = fiscalResults.filter((r) => r.disabled)
  const sorted = [...enabled].sort((a, b) => b.rendNetNet - a.rendNetNet)
  const best = sorted[0]
  const displayed = showAll ? sorted : sorted.slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Best regime banner */}
      {best && (
        <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-400/80 font-semibold uppercase tracking-wider mb-1">Régime recommandé</p>
            <p className="text-base font-bold text-white">{best.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Rendement nette-nette le plus élevé de votre situation</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-emerald-400" style={{ letterSpacing: '-0.04em' }}>{formatPct(best.rendNetNet)}</p>
            <p className="text-[11px] text-zinc-600">nette-nette</p>
          </div>
        </div>
      )}

      {/* Regime list */}
      <div className="space-y-1.5">
        {/* Header */}
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
              className={`grid grid-cols-[1fr_80px_80px_80px_70px] gap-2 items-center px-3 py-3 rounded-xl ${
                isBest ? 'bg-emerald-500/[0.06] border border-emerald-500/15' : 'bg-white/[0.02] hover:bg-white/[0.04]'
              } transition-colors`}
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

      {/* Disabled regimes */}
      {disabled.length > 0 && (
        <div className="pt-3 border-t border-white/[0.05]">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Non éligibles dans votre situation</p>
          <div className="space-y-1">
            {disabled.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg opacity-50">
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

/* ─── Amortissement tab ────────────────────────────────────────────────────── */
function AmortTab({ result }: { result: InvestmentResult }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')

  if (!result.tableauAmortissement || result.tableauAmortissement.length === 0) {
    return <p className="text-sm text-zinc-500 py-8 text-center">Données d'amortissement non disponibles.</p>
  }

  // Yearly data for chart (last month of each year)
  const chartData = result.tableauAmortissement
    .filter((_, i) => (i + 1) % 12 === 0)
    .map((row) => ({
      an: `An ${row.annee}`,
      capital: Math.round(row.capitalRembourse),
      interets: Math.round(row.interetsPaies),
      restant: Math.round(row.capitalRestant),
    }))

  // Table data (yearly summary)
  const tableData = chartData

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
              {tableData.map((row, i) => (
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
      {/* Summary metrics */}
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

      {/* Patrimoine chart */}
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

      {/* Cashflow chart */}
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
        * Projection basée sur une appréciation annuelle de 2% du bien. Résultats indicatifs, avant fiscalité.
      </p>
    </div>
  )
}
