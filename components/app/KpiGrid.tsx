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

function KpiCard({ label, value, sub, trend, accent }: KpiCardProps) {
  const valueColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : trend === 'neutral' ? 'text-amber-400' : 'text-white'

  return (
    <div className={`rounded-xl border p-5 space-y-3 transition-colors ${
      accent
        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
        : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]'
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        {trend && <TrendIcon trend={trend} />}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`} style={{ letterSpacing: '-0.03em' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-zinc-600 leading-relaxed">{sub}</p>
      )}
    </div>
  )
}

export function KpiGrid({ result, netNetYield, netNetRegime }: KpiGridProps) {
  const cfTrend: 'up' | 'down' | 'neutral' = result.cashflowMensuel >= 0 ? 'up' : 'down'
  const brutTrend: 'up' | 'down' | 'neutral' = result.rendementBrut >= 7 ? 'up' : result.rendementBrut >= 4 ? 'neutral' : 'down'
  const netTrend: 'up' | 'down' | 'neutral' = result.rendementNet >= 5 ? 'up' : result.rendementNet >= 3 ? 'neutral' : 'down'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        label="Rendement brut"
        value={formatPct(result.rendementBrut)}
        sub={`${formatCurrency(result.loyerAnnuelBrut)} / an`}
        trend={brutTrend}
      />
      <KpiCard
        label="Rendement net"
        value={formatPct(result.rendementNet)}
        sub="Avant fiscalité"
        trend={netTrend}
      />
      <KpiCard
        label="Cashflow mensuel"
        value={`${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`}
        sub={`Effort épargne : ${formatCurrency(result.effortEpargne)}/mois`}
        trend={cfTrend}
      />
      {netNetYield !== undefined ? (
        <KpiCard
          label="Nette-nette"
          value={formatPct(netNetYield)}
          sub={netNetRegime || 'Après impôts'}
          trend={netNetYield >= 4 ? 'up' : netNetYield >= 2 ? 'neutral' : 'down'}
          accent
        />
      ) : (
        <KpiCard
          label="Prix de revient"
          value={formatCurrency(result.prixRevient)}
          sub="Frais notaire inclus"
        />
      )}
    </div>
  )
}
