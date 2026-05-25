'use client'

import { useState } from 'react'
import { InvestmentResult, FiscalRegime, InvestmentParams } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'
import { IconLightBulb, IconCheckCircle, IconExclamationTriangle } from '@/components/ui/icons'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine, Cell,
} from 'recharts'

interface DetailedResultsProps {
  result: InvestmentResult
  fiscalResults: FiscalRegime[] | null
  params?: InvestmentParams | null
  onApplyRenovationScenario?: (travaux: number, prixAchat: number) => void
}

const tooltipStyle = {
  contentStyle: { background: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px' },
  labelStyle: { color: '#a1a1aa', fontSize: 11, marginBottom: 4 },
  itemStyle: { fontSize: 12 },
}

export function DetailedResults({ result, fiscalResults, params, onApplyRenovationScenario }: DetailedResultsProps) {
  const [tab, setTab] = useState('cashflow')

  const hasFiscal  = fiscalResults && fiscalResults.filter(r => !r.disabled).length > 0
  const hasRevente = result.prixRevente != null && result.prixRevente > 0

  const tabs = [
    { id: 'cashflow',   label: 'Cashflow' },
    { id: 'fiscal',     label: 'Fiscalité' },
    { id: 'revente',    label: 'Revente & TRI' },
    { id: 'amort',      label: 'Amortissement' },
    { id: 'projection', label: 'Projection 20 ans' },
  ]

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
      {/* Tab nav */}
      <div className="flex border-b border-th-border overflow-x-auto scrollbar-none bg-th-surface">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3.5 text-[12px] font-semibold whitespace-nowrap transition-colors relative ${
              tab === t.id ? 'text-th-text-1' : 'text-th-text-3 hover:text-th-text-1'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-emerald-500 rounded-t-full" />
            )}
            {t.id === 'fiscal' && hasFiscal && (
              <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                {fiscalResults!.filter(r => !r.disabled).length}
              </span>
            )}
            {t.id === 'revente' && hasRevente && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block align-middle" />
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === 'cashflow'   && <CashflowTab result={result} />}
        {tab === 'fiscal'     && <FiscalTab fiscalResults={fiscalResults} />}
        {tab === 'revente'    && <ReventeTab result={result} />}
        {tab === 'amort'      && <AmortTab result={result} />}
        {tab === 'projection' && <ProjectionTab result={result} />}
      </div>
    </div>
  )
}

/* ─── Cashflow tab ─────────────────────────────────────────────────────────── */
export function CashflowTab({ result }: { result: InvestmentResult }) {
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

  // Cashflow color
  const cfColor = result.cashflowAnnuel >= 0 ? 'text-emerald-400' : 'text-red-400'
  const cfBg = result.cashflowAnnuel >= 0
    ? 'bg-emerald-500/[0.05] border-emerald-500/20'
    : 'bg-red-500/[0.05] border-red-500/20'

  return (
    <div className="space-y-4">
      {/* Cascade rows */}
      <div className="space-y-0.5 rounded-xl overflow-hidden border border-th-border">
        {rows.map((row, i) => {
          const isResult = row.type === 'result'
          const isSubtotal = row.type === 'subtotal'
          const isNeutral = row.type === 'neutral'
          const color = isResult
            ? row.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            : row.type === 'income' ? 'text-emerald-400'
            : isNeutral ? 'text-th-text-3'
            : 'text-red-400'
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-3.5 py-2.5 ${
                isResult
                  ? `border-t border-th-border mt-0.5 ${cfBg}`
                  : isSubtotal
                  ? 'bg-th-surface2'
                  : 'hover:bg-th-surface2'
              }`}
            >
              <span className={`text-[12px] truncate mr-3 ${isResult ? `font-bold ${cfColor}` : isSubtotal ? 'font-semibold text-th-text-1' : 'text-th-text-2'}`}>
                {row.label}
              </span>
              <span className={`text-[12px] font-bold tabular-nums shrink-0 ${color}`}>
                {row.value >= 0 ? '+' : ''}{formatCurrency(row.value)}
              </span>
            </div>
          )
        })}
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {[
          {
            label: 'Cashflow / mois',
            value: `${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`,
            color: result.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400',
            bg: result.cashflowMensuel >= 0 ? 'border-emerald-500/20' : 'border-red-500/20',
          },
          {
            label: 'Mensualité crédit',
            value: `${Math.round(result.mensualiteCredit)} €/mois`,
            color: 'text-th-text-1',
            bg: 'border-th-border',
          },
          {
            label: 'Point mort locatif',
            value: `${result.pointMort} €/mois`,
            color: 'text-amber-400',
            bg: 'border-amber-500/20',
          },
        ].map((m) => (
          <div key={m.label} className={`text-center rounded-xl bg-th-surface border py-3 px-2 ${m.bg}`}>
            <p className="text-[10px] text-th-text-3 mb-1.5 leading-tight">{m.label}</p>
            <p className={`text-[15px] font-black tabular-nums leading-none ${m.color}`} style={{ letterSpacing: '-0.02em' }}>{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Fiscal helpers ──────────────────────────────────────────────────────── */

const REGIME_PROS_CONS: Record<string, { pros: string[]; cons: string[] }> = {
  'micro-foncier': {
    pros: ['Abattement forfaitaire 30% — simple', 'Aucun comptable requis', 'Déclaration simplifiée'],
    cons: ['Plafonné à 15 000 €/an de revenus', 'Pas de déduction réelle des charges', 'Moins optimal si charges élevées'],
  },
  'reel-foncier': {
    pros: ['Déduction de toutes les charges réelles', 'Déficit foncier imputable sur revenus (10 700 €)', 'Idéal si travaux importants'],
    cons: ['Déclaration plus complexe', 'Comptable recommandé', 'Durée de 3 ans minimum'],
  },
  'micro-bic': {
    pros: ['Abattement 50% (ou 71% saisonnier)', 'Pas de comptable obligatoire', 'Simple et rapide'],
    cons: ['Plafonné à 77 700 €/an (meublé)', 'Pas de déduction des amortissements', 'Moins efficace que le réel LMNP'],
  },
  'lmnp-reel': {
    pros: ['Amortissement bien + travaux déductible', 'Peut générer 0 impôt pendant 10–15 ans', 'Déficit reportable indéfiniment'],
    cons: ['Comptable obligatoire (~500–1000 €/an)', 'Imposition plus-value à la revente', 'Charges à justifier'],
  },
  'lmp': {
    pros: ['Déficit imputable sur revenus globaux', 'Exonération plus-value après 5 ans (si <90 000 €)', 'Amortissements + charges déductibles'],
    cons: ['Revenus meublés > 23 000 € ET > 50% des revenus', 'Cotisations sociales (~40%)', 'Statut difficile à maintenir'],
  },
  'sci-ir': {
    pros: ['Transparence fiscale — pas d\'IS', 'Facilite la transmission familiale', 'Régime réel foncier disponible'],
    cons: ['Formalisme juridique (statuts, AG)', 'Revenus imposés au TMI de chaque associé', 'Pas d\'amortissement du bien'],
  },
  'sci-is': {
    pros: ['IS à 15% sur les 42 500 premiers €', 'Amortissement du bien déductible', 'Capitalisation des bénéfices en société'],
    cons: ['Double imposition dividendes (IS + IR)', 'Plus-value à la revente importante', 'Gestion comptable obligatoire'],
  },
  'sarl-famille': {
    pros: ['Option IR — transparence fiscale', 'Amortissements LMNP disponibles', 'Pas de cotisations sociales élevées'],
    cons: ['Réservé aux membres d\'une même famille', 'Formalisme juridique requis', 'Plus complexe qu\'en nom propre'],
  },
}

function getProsCons(regimeId: string) {
  return REGIME_PROS_CONS[regimeId] ?? null
}

/* ─── Fiscal tab ───────────────────────────────────────────────────────────── */
export function FiscalTab({ fiscalResults }: { fiscalResults: FiscalRegime[] | null }) {
  const [showAll, setShowAll] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!fiscalResults || fiscalResults.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-th-surface2 border border-th-border flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-th-text-1 mb-1">Renseignez votre TMI</p>
          <p className="text-xs text-th-text-2 max-w-xs mx-auto">Dans la section Fiscalité du formulaire, sélectionnez votre tranche marginale pour comparer les régimes fiscaux.</p>
        </div>
      </div>
    )
  }

  const enabled = fiscalResults.filter((r) => !r.disabled)
  const disabled = fiscalResults.filter((r) => r.disabled)
  const sorted = [...enabled].sort((a, b) => b.rendNetNet - a.rendNetNet)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  const displayed = showAll ? sorted : sorted.slice(0, 6)
  const economie = best && worst && sorted.length > 1 ? best.net - worst.net : 0

  // Chart data
  const chartData = sorted.slice(0, 7).map((r) => ({
    name: r.shortName || r.name.split(' ')[0],
    rendement: parseFloat(r.rendNetNet.toFixed(2)),
    impot: Math.round(r.totalFiscal),
    fill: r.rendNetNet >= 4 ? '#10b981' : r.rendNetNet >= 2 ? '#f59e0b' : '#ef4444',
  }))

  return (
    <div className="space-y-5">

      {/* ── Bannière régime optimal ───────────────────────────────────────────── */}
      {best && (
        <div className={`rounded-xl p-4 border flex items-center gap-4 ${
          best.rendNetNet >= 4
            ? 'bg-emerald-500/[0.07] border-emerald-500/25'
            : best.rendNetNet >= 2
            ? 'bg-amber-500/[0.07] border-amber-500/25'
            : 'bg-red-500/[0.07] border-red-500/25'
        }`}>
          <div className={`text-2xl shrink-0 ${
            best.rendNetNet >= 4 ? 'text-emerald-400' : best.rendNetNet >= 2 ? 'text-amber-400' : 'text-red-400'
          }`}>★</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-th-text-2 mb-0.5">Régime recommandé</p>
            <p className="text-sm font-bold text-th-text-1 truncate">{best.name}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[11px] text-th-text-2">
                Net/an : <span className="text-th-text-1 font-semibold">{formatCurrency(best.net)}</span>
              </span>
              <span className="text-[11px] text-th-text-2">
                CF/mois : <span className={`font-semibold ${best.cfNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {best.cfNet >= 0 ? '+' : ''}{formatCurrency(best.cfNet)}
                </span>
              </span>
              <span className="text-[11px] text-th-text-2">
                Impôt : <span className="text-red-400 font-semibold">{formatCurrency(best.impot)}</span>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-2xl font-black tabular-nums ${
              best.rendNetNet >= 4 ? 'text-emerald-400' : best.rendNetNet >= 2 ? 'text-amber-400' : 'text-red-400'
            }`} style={{ letterSpacing: '-0.04em' }}>
              {formatPct(best.rendNetNet)}
            </p>
            <p className="text-[10px] text-th-text-3">nette-nette</p>
          </div>
        </div>
      )}

      {/* ── Économie possible ────────────────────────────────────────────────── */}
      {economie > 500 && (
        <div className="rounded-lg bg-blue-500/[0.06] border border-blue-500/15 px-3 py-2.5 flex items-center gap-2">
          <IconLightBulb className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-[11px] text-blue-400">
            Choisir le meilleur régime vous fait économiser{' '}
            <strong>{formatCurrency(economie)}/an</strong> vs le moins avantageux
          </p>
        </div>
      )}

      {/* ── Graphique ────────────────────────────────────────────────────────── */}
      {chartData.length > 1 && (
        <div>
          <p className="text-[11px] text-th-text-3 mb-3">Rendement nette-nette par régime (classé du meilleur au moins bon)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barCategoryGap="28%">
              <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Rdt nette-nette']} />
              <Bar dataKey="rendement" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} fillOpacity={i === 0 ? 1 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Liste des régimes (cartes cliquables) ────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider mb-2">
          Tous les régimes — cliquez pour voir les détails
        </p>

        {displayed.map((r, i) => {
          const isBest = i === 0
          const nnGood = r.rendNetNet >= 4
          const nnOk = r.rendNetNet >= 2
          const borderColor = nnGood ? 'border-emerald-500/25' : nnOk ? 'border-amber-500/25' : 'border-red-500/20'
          const bgColor = nnGood
            ? (isBest ? 'bg-emerald-500/[0.07]' : 'bg-emerald-500/[0.03]')
            : nnOk ? 'bg-amber-500/[0.03]' : 'bg-red-500/[0.03]'
          const nnColor = nnGood ? 'text-emerald-400' : nnOk ? 'text-amber-400' : 'text-red-400'
          const isExpanded = expandedId === r.id
          const pc = getProsCons(r.id)

          // Barre de performance relative au meilleur
          const barPct = best && best.rendNetNet > 0
            ? Math.max(8, Math.round((r.rendNetNet / best.rendNetNet) * 100))
            : 50
          const barColor = nnGood ? '#10b981' : nnOk ? '#f59e0b' : '#ef4444'

          return (
            <div
              key={r.id}
              className={`rounded-xl border transition-all cursor-pointer ${bgColor} ${borderColor} ${
                isBest ? 'ring-1 ring-emerald-500/20' : ''
              }`}
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
            >
              {/* Ligne principale */}
              <div className="flex items-center gap-3 px-3 py-3">
                {/* Rang */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isBest ? 'bg-emerald-500/20 text-emerald-400' : 'bg-th-surface2 text-th-text-3'
                }`}>
                  {i + 1}
                </div>

                {/* Nom + tag */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`text-xs font-bold ${isBest ? 'text-th-text-1' : 'text-th-text-1'}`}>{r.name}</p>
                    {isBest && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">★ OPTIMAL</span>}
                    {r.tag && <span className="text-[9px] text-th-text-3 bg-th-surface2 px-1.5 py-0.5 rounded-full">{r.tag}</span>}
                  </div>
                  {/* Barre performance */}
                  <div className="mt-1.5 h-1 bg-th-surface2 rounded-full overflow-hidden w-full">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${barPct}%`, background: barColor }}
                    />
                  </div>
                </div>

                {/* Valeurs clés */}
                <div className="hidden sm:flex items-center gap-4 text-right shrink-0">
                  <div>
                    <p className="text-[9px] text-th-text-3">Impôt</p>
                    <p className="text-[11px] text-red-400 tabular-nums font-medium">{formatCurrency(r.impot)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-th-text-3">Net/an</p>
                    <p className={`text-[11px] tabular-nums font-semibold ${r.net >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>{formatCurrency(r.net)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-th-text-3">CF/mois</p>
                    <p className={`text-[11px] tabular-nums font-semibold ${r.cfNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.cfNet >= 0 ? '+' : ''}{formatCurrency(r.cfNet)}
                    </p>
                  </div>
                </div>

                {/* Rendement nette-nette */}
                <div className="text-right shrink-0 ml-2">
                  <p className={`text-base font-black tabular-nums ${nnColor}`} style={{ letterSpacing: '-0.03em' }}>
                    {formatPct(r.rendNetNet)}
                  </p>
                  <p className="text-[9px] text-th-text-3">N-N</p>
                </div>

                {/* Chevron expand */}
                <svg
                  className={`w-3.5 h-3.5 text-th-text-3 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Panel expandé — détails + pros/cons */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-th-border pt-3 space-y-3">
                  {/* Détail chiffres */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Rev. imposable', value: formatCurrency(r.revImposable), color: 'text-th-text-1' },
                      { label: 'Impôt IR', value: formatCurrency(r.impot), color: 'text-red-400' },
                      { label: 'Prélèv. soc.', value: formatCurrency(r.ps), color: 'text-amber-400' },
                      { label: 'Total fiscal', value: formatCurrency(r.totalFiscal), color: 'text-red-400' },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-th-surface2 border border-th-border p-2 text-center">
                        <p className="text-[9px] text-th-text-3 mb-0.5">{m.label}</p>
                        <p className={`text-[11px] font-bold tabular-nums ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pros / Cons */}
                  {pc && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-emerald-500/[0.05] border border-emerald-500/15 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <IconCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Avantages</p>
                        </div>
                        <div className="space-y-1">
                          {pc.pros.map((pro, i) => (
                            <p key={i} className="text-[10px] text-th-text-2 flex gap-1.5 leading-snug">
                              <span className="text-emerald-500 shrink-0 mt-0.5">·</span>
                              {pro}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg bg-red-500/[0.05] border border-red-500/15 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <IconExclamationTriangle className="w-3.5 h-3.5 text-red-400" />
                          <p className="text-[9px] font-bold text-red-400 uppercase tracking-wide">Points de vigilance</p>
                        </div>
                        <div className="space-y-1">
                          {pc.cons.map((con, i) => (
                            <p key={i} className="text-[10px] text-th-text-2 flex gap-1.5 leading-snug">
                              <span className="text-red-500 shrink-0 mt-0.5">·</span>
                              {con}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {enabled.length > 6 && (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="w-full text-xs text-th-text-3 hover:text-th-text-2 transition-colors py-2"
          >
            {showAll ? '↑ Afficher moins' : `↓ Voir ${enabled.length - 6} régimes de plus`}
          </button>
        )}
      </div>

      {/* ── Régimes non éligibles ─────────────────────────────────────────────── */}
      {disabled.length > 0 && (
        <div className="pt-3 border-t border-th-border">
          <p className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider mb-2">Non éligibles dans votre situation</p>
          <div className="space-y-1">
            {disabled.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg opacity-35">
                <p className="text-xs text-th-text-2 line-through">{r.name}</p>
                <p className="text-[10px] text-th-text-3 text-right max-w-[60%]">{r.disabledReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Revente & TRI tab ────────────────────────────────────────────────────── */
export function ReventeTab({ result }: { result: InvestmentResult }) {
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
        <div className="w-10 h-10 rounded-xl bg-th-surface2 border border-th-border flex items-center justify-center mx-auto">
          <svg className="w-5 h-5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-th-text-1 mb-1">Configurez l&apos;horizon de revente</p>
          <p className="text-xs text-th-text-2 max-w-xs mx-auto">Ouvrez la section «&nbsp;Revente & TRI&nbsp;» dans le formulaire pour définir votre horizon et la valorisation annuelle.</p>
        </div>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Prix de revente estimé',
      value: formatCurrency(prixRevente),
      color: 'text-th-text-1',
      sub: 'Valorisation annuelle appliquée',
    },
    {
      label: 'Plus-value brute',
      value: formatCurrency(plusValue),
      color: plusValue > 0 ? 'text-emerald-400' : 'text-th-text-2',
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
            <p className="text-xs text-th-text-2 max-w-xs leading-relaxed">
              Rentabilité globale de l&apos;opération, intégrant l&apos;apport initial, les cashflows annuels, la plus-value nette et les impôts à la revente.
            </p>
          </div>
          <div className="text-right shrink-0 ml-6">
            <p className={`text-3xl font-black ${tri >= 8 ? 'text-emerald-400' : tri >= 4 ? 'text-amber-400' : 'text-red-400'}`} style={{ letterSpacing: '-0.04em' }}>
              {tri.toFixed(1)}%
            </p>
            <p className="text-[11px] text-th-text-3 mt-0.5">
              {tri >= 8 ? 'Excellent' : tri >= 5 ? 'Bon' : tri >= 3 ? 'Moyen' : 'Faible'}
            </p>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-th-surface2 border border-th-border p-4">
            <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-wider mb-2">{m.label}</p>
            <p className={`text-lg font-bold tabular-nums ${m.color}`} style={{ letterSpacing: '-0.02em' }}>{m.value}</p>
            <p className="text-[10px] text-th-text-3 mt-1 leading-snug">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Plus-value timeline */}
      <div className="rounded-xl bg-th-surface border border-th-border p-4">
        <p className="text-[11px] font-semibold text-th-text-2 uppercase tracking-wider mb-3">Abattements plus-value selon durée de détention</p>
        {/* En-tête */}
        <div className="grid grid-cols-[1fr_70px_80px] gap-2 pb-2 mb-1 border-b border-th-border">
          <span className="text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">Durée</span>
          <span className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider text-right">IR 19%</span>
          <span className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider text-right">PS 17.2%</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: 'Moins de 6 ans', ir: '0%', ps: '0%', special: '' },
            { label: '6 à 11 ans', ir: '6%/an', ps: '1.65%/an', special: '' },
            { label: '12 à 15 ans', ir: '6%/an', ps: '1.65%/an', special: '' },
            { label: '16 à 21 ans', ir: '6%/an', ps: '1.60%/an', special: '' },
            { label: '22 ans révolus', ir: '100%', ps: '1.60%/an', special: 'Exonération IR' },
            { label: '23 à 29 ans', ir: '100%', ps: '9%/an', special: '' },
            { label: '30 ans et +', ir: '100%', ps: '100%', special: 'Exonération totale' },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_70px_80px] gap-2 items-center py-1 rounded-md hover:bg-th-surface px-1 -mx-1 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-th-text-2 truncate">{row.label}</span>
                {row.special && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">{row.special}</span>
                )}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold text-right tabular-nums">{row.ir}</span>
              <span className="text-[11px] text-amber-400 font-semibold text-right tabular-nums">{row.ps}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footnote */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-th-surface border border-th-border">
        <svg className="w-3.5 h-3.5 text-th-text-3 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[10px] text-th-text-3 leading-relaxed">
          Calcul indicatif selon les règles fiscales en vigueur. Les abattements s&apos;appliquent par année de détention complète. Consultez un conseiller fiscal pour votre situation personnelle.
        </p>
      </div>
    </div>
  )
}

/* ─── Amortissement tab ────────────────────────────────────────────────────── */
export function AmortTab({ result }: { result: InvestmentResult }) {
  const [view, setView] = useState<'chart' | 'table'>('chart')

  if (!result.tableauAmortissement || result.tableauAmortissement.length === 0) {
    return <p className="text-sm text-th-text-2 py-8 text-center">Données d&apos;amortissement non disponibles.</p>
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
        <p className="text-xs text-th-text-2">
          Capital emprunté : <span className="text-th-text-1 font-semibold">{formatCurrency(result.montantEmprunte)}</span>
          {' · '}
          Coût total crédit : <span className="text-red-400 font-semibold">{formatCurrency(result.coutCredit)}</span>
        </p>
        <div className="flex items-center gap-1 p-0.5 bg-th-surface2 rounded-lg border border-th-border">
          {(['chart', 'table'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                view === v ? 'bg-th-accent text-white' : 'text-th-text-2 hover:text-th-text-1'
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
              <tr className="border-b border-th-border">
                {['Année', 'Capital remboursé', 'Intérêts payés', 'Capital restant'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-[10px] font-semibold text-th-text-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} className="border-b border-th-border hover:bg-th-surface">
                  <td className="py-2 pr-4 text-th-text-2">{row.an}</td>
                  <td className="py-2 pr-4 text-emerald-400 tabular-nums">{formatCurrency(row.capital)}</td>
                  <td className="py-2 pr-4 text-violet-400 tabular-nums">{formatCurrency(row.interets)}</td>
                  <td className="py-2 pr-4 text-th-text-1 tabular-nums">{formatCurrency(row.restant)}</td>
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
export function ProjectionTab({ result }: { result: InvestmentResult }) {
  if (!result.projection || result.projection.length === 0) {
    return <p className="text-sm text-th-text-2 py-8 text-center">Données de projection non disponibles.</p>
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
          { label: 'Valeur estimée du bien', value: formatCurrency(final.valeur), color: 'text-th-text-1' },
          { label: 'Cashflow cumulé', value: `${final.cashflow >= 0 ? '+' : ''}${formatCurrency(final.cashflow)}`, color: final.cashflow >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-th-surface2 border border-th-border p-4 text-center">
            <p className="text-[10px] text-th-text-3 mb-2 leading-tight">{m.label}</p>
            <p className={`text-base font-bold tabular-nums ${m.color}`} style={{ letterSpacing: '-0.02em' }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[11px] text-th-text-3 mb-3">Évolution du patrimoine net — valeur bien moins capital restant dû</p>
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
        <p className="text-[11px] text-th-text-3 mb-3">Cashflow cumulé sur 20 ans</p>
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

      <p className="text-[10px] text-th-text-3 leading-relaxed border-t border-th-border pt-3">
        * Projection sur 20 ans avec revalorisation IRL des loyers. Résultats indicatifs, avant fiscalité.
      </p>
    </div>
  )
}
