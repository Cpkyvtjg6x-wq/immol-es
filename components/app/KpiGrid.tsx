'use client'

import { InvestmentResult } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'

interface KpiGridProps {
  result: InvestmentResult
  netNetYield?: number
  netNetRegime?: string
}

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: boolean
  warn?: boolean
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return (
    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
    </svg>
  )
  if (trend === 'down') return (
    <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  )
  return (
    <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
    </svg>
  )
}

function KpiCard({ label, value, sub, trend, accent, warn }: KpiCardProps) {
  const valueColor = accent
    ? 'text-emerald-400'
    : warn
    ? 'text-amber-400'
    : trend === 'up'
    ? 'text-emerald-400'
    : trend === 'down'
    ? 'text-red-400'
    : trend === 'neutral'
    ? 'text-amber-400'
    : 'text-white'

  return (
    <div className={`rounded-xl border p-4 space-y-2.5 transition-colors ${
      accent
        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
        : warn
        ? 'border-amber-500/20 bg-amber-500/[0.03]'
        : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]'
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider leading-tight">{label}</p>
        {trend && <TrendIcon trend={trend} />}
      </div>
      <p className={`text-xl font-bold tabular-nums leading-none ${valueColor}`} style={{ letterSpacing: '-0.03em' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-zinc-600 leading-relaxed">{sub}</p>
      )}
    </div>
  )
}

export function KpiGrid({ result, netNetYield, netNetRegime }: KpiGridProps) {
  const cfTrend: 'up' | 'down' | 'neutral' = result.cashflowMensuel >= 0 ? 'up' : 'down'
  const brutTrend: 'up' | 'down' | 'neutral' = result.rendementBrut >= 7 ? 'up' : result.rendementBrut >= 4 ? 'neutral' : 'down'
  const netTrend: 'up' | 'down' | 'neutral' = result.rendementNet >= 5 ? 'up' : result.rendementNet >= 3 ? 'neutral' : 'down'

  const tri = result.tri ?? 0
  const triTrend: 'up' | 'down' | 'neutral' = tri >= 8 ? 'up' : tri >= 4 ? 'neutral' : 'down'

  const roi = result.roiApport ?? 0
  const roiTrend: 'up' | 'down' | 'neutral' = roi >= 15 ? 'up' : roi >= 5 ? 'neutral' : 'down'

  return (
    <div className="space-y-3">
      {/* Row 1 (hero) — 3 métriques clés : rendement NET, cashflow, nette-nette */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Rendement net"
          value={formatPct(result.rendementNet)}
          sub="Charges déduites, avant impôts"
          trend={netTrend}
          accent={result.rendementNet >= 5}
        />
        <KpiCard
          label="Cashflow mensuel"
          value={`${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`}
          sub={result.cashflowMensuel < 0
            ? `Effort épargne : ${formatCurrency(result.effortEpargne)}/mois`
            : `Gain net locatif : ${formatCurrency(result.cashflowAnnuel)}/an`}
          trend={cfTrend}
        />
        {netNetYield !== undefined ? (
          <KpiCard
            label="Nette-nette"
            value={formatPct(netNetYield)}
            sub={netNetRegime || 'Après impôts — meilleur régime'}
            trend={netNetYield >= 4 ? 'up' : netNetYield >= 2 ? 'neutral' : 'down'}
            accent
          />
        ) : (
          <KpiCard
            label="Prix de revient"
            value={formatCurrency(result.prixRevient)}
            sub="Notaire + travaux inclus"
          />
        )}
      </div>

      {/* Row 2 — Performance financière */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="TRI (sur horizon)"
          value={tri > 0 ? `${tri.toFixed(1)}%` : '—'}
          sub="Taux de Rendement Interne — flux + revente"
          trend={tri > 0 ? triTrend : undefined}
          accent={tri >= 8}
        />
        <KpiCard
          label="ROI sur apport"
          value={roi > 0 ? `${roi.toFixed(1)}%` : '—'}
          sub="Retour annuel sur capital investi"
          trend={roi > 0 ? roiTrend : undefined}
          warn={roi > 0 && roi < 5}
        />
        <KpiCard
          label="Rendement brut"
          value={formatPct(result.rendementBrut)}
          sub={`${formatCurrency(result.loyerAnnuelBrut)} / an brut`}
          trend={brutTrend}
        />
      </div>

      {/* Row 3 — Seuils & crédit */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Point mort locatif"
          value={`${result.pointMort} €/mois`}
          sub="Loyer minimum pour couvrir les charges"
        />
        <KpiCard
          label="Mensualité crédit"
          value={`${Math.round(result.mensualiteTotale)} €/mois`}
          sub={`Dont assurance : ${Math.round(result.mensualiteTotale - result.mensualiteCredit)} €/mois`}
        />
        <KpiCard
          label="Coût total crédit"
          value={formatCurrency(result.coutCredit)}
          sub={`Sur ${result.coutCredit > 0 ? 'durée du prêt' : '—'}`}
          trend="down"
        />
      </div>
    </div>
  )
}
