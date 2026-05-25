'use client'

import { InvestmentResult, InvestmentParams } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'
import { getMarcheRef } from '@/lib/marche-reference'

interface KpiGridProps {
  result: InvestmentResult
  netNetYield?: number
  netNetRegime?: string
  params?: InvestmentParams
}

// ─── Hero card — grande métrique clé ──────────────────────────────────────────

function HeroCard({
  label, value, sub, delta, trend, accent,
}: {
  label: string
  value: string
  sub?: string
  delta?: { text: string; positive: boolean | null } // null = neutral
  trend?: 'up' | 'down' | 'neutral'
  accent?: boolean
}) {
  const valueColor =
    accent ? 'text-emerald-400' :
    trend === 'up' ? 'text-emerald-400' :
    trend === 'down' ? 'text-red-400' :
    trend === 'neutral' ? 'text-amber-400' :
    'text-white'

  const borderBg = accent
    ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
    : 'border-th-border-med bg-th-surface2 hover:bg-th-surface2'

  const deltaColor = delta?.positive === true ? 'text-emerald-400' : delta?.positive === false ? 'text-red-400' : 'text-th-text-2'

  return (
    <div className={`rounded-2xl border ${borderBg} transition-colors px-5 py-4 flex flex-col gap-2`}>
      <p className="text-[10px] font-semibold text-th-text-2 uppercase tracking-wider">{label}</p>
      <p
        className={`font-black tabular-nums leading-none ${valueColor}`}
        style={{ fontSize: '26px', letterSpacing: '-0.04em' }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-th-text-3 leading-snug">{sub}</p>}
      {delta && (
        <p className={`text-[10px] font-semibold ${deltaColor} flex items-center gap-1`}>
          <span className="opacity-60">vs marché ·</span>
          <span>{delta.text}</span>
        </p>
      )}
    </div>
  )
}

// ─── Mini card — métrique secondaire ──────────────────────────────────────────

function MiniCard({
  label, value, sub, trend, accent, warn,
}: {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  accent?: boolean
  warn?: boolean
}) {
  const valueColor =
    accent ? 'text-emerald-400' :
    warn ? 'text-amber-400' :
    trend === 'up' ? 'text-emerald-400' :
    trend === 'down' ? 'text-red-400' :
    trend === 'neutral' ? 'text-amber-400' :
    'text-th-text-1'

  return (
    <div className="rounded-xl border border-th-border bg-th-surface hover:bg-th-surface2 transition-colors px-3.5 py-3 flex flex-col gap-1.5">
      <p className="text-[9px] font-semibold text-th-text-3 uppercase tracking-wider leading-tight">{label}</p>
      <p
        className={`font-bold tabular-nums leading-none ${valueColor}`}
        style={{ fontSize: '17px', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-th-text-3 leading-snug">{sub}</p>}
    </div>
  )
}

// ─── KpiGrid ──────────────────────────────────────────────────────────────────

export function KpiGrid({ result, netNetYield, netNetRegime, params }: KpiGridProps) {
  const cfTrend: 'up' | 'down' | 'neutral' = result.cashflowMensuel >= 0 ? 'up' : 'down'
  const netTrend: 'up' | 'down' | 'neutral' =
    result.rendementNet >= 5 ? 'up' : result.rendementNet >= 3 ? 'neutral' : 'down'

  const tri = result.tri ?? 0
  const triTrend: 'up' | 'down' | 'neutral' = tri >= 8 ? 'up' : tri >= 4 ? 'neutral' : 'down'

  const roi = result.roiApport ?? 0
  const roiTrend: 'up' | 'down' | 'neutral' = roi >= 15 ? 'up' : roi >= 5 ? 'neutral' : 'down'

  const brutTrend: 'up' | 'down' | 'neutral' =
    result.rendementBrut >= 7 ? 'up' : result.rendementBrut >= 4 ? 'neutral' : 'down'

  // ── Comparaison marché local ──────────────────────────────────────────────
  const cpMatch = params?.adresse?.match(/\b(\d{5})\b/)
  const codePostal = cpMatch ? cpMatch[1] : null
  const marche = params?.ville ? getMarcheRef(params.ville, codePostal) : null
  const marcheLabel = marche ? (marche.label ?? marche.villeNorm.charAt(0).toUpperCase() + marche.villeNorm.slice(1)) : null

  // Rendement brut médian du marché = (loyerNu * 12) / prixM2 * 100
  const rendBrutMarche = marche ? (marche.loyerNu * 12) / marche.prixM2 * 100 : null
  const deltaBrut = rendBrutMarche !== null ? +(result.rendementBrut - rendBrutMarche).toFixed(1) : null

  // Prix m² du bien vs marché
  const prixM2Bien = params ? Math.round(params.prixAchat / params.surface) : null
  const deltaM2 = (prixM2Bien !== null && marche) ? Math.round(((prixM2Bien - marche.prixM2) / marche.prixM2) * 100) : null

  return (
    <div className="space-y-2.5">

      {/* ── Hero row — 3 métriques principales ────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5">
        <HeroCard
          label="Rendement net"
          value={formatPct(result.rendementNet)}
          sub="Charges déduites, avant impôts"
          delta={deltaBrut !== null && marcheLabel ? {
            text: `${deltaBrut >= 0 ? '+' : ''}${deltaBrut} pts vs ${marcheLabel}`,
            positive: deltaBrut > 0 ? true : deltaBrut < 0 ? false : null,
          } : undefined}
          trend={netTrend}
          accent={result.rendementNet >= 5}
        />
        <HeroCard
          label="Cashflow mensuel"
          value={`${result.cashflowMensuel >= 0 ? '+' : ''}${Math.round(result.cashflowMensuel)} €`}
          sub={result.cashflowMensuel < 0
            ? `Effort épargne : ${formatCurrency(result.effortEpargne)}/mois`
            : `Gain net : ${formatCurrency(result.cashflowAnnuel)}/an`}
          trend={cfTrend}
        />
        {netNetYield !== undefined ? (
          <HeroCard
            label="Nette-nette"
            value={formatPct(netNetYield)}
            sub={netNetRegime ?? 'Après impôts — meilleur régime'}
            trend={netNetYield >= 4 ? 'up' : netNetYield >= 2 ? 'neutral' : 'down'}
            accent
          />
        ) : (
          <HeroCard
            label="Prix de revient"
            value={formatCurrency(result.prixRevient)}
            sub="Notaire + travaux inclus"
            delta={deltaM2 !== null && marcheLabel ? {
              text: `${deltaM2 >= 0 ? '+' : ''}${deltaM2}% vs médian ${marcheLabel}`,
              positive: deltaM2 < 0 ? true : deltaM2 > 15 ? false : null,
            } : undefined}
          />
        )}
      </div>

      {/* ── Secondary row — 6 métriques compactes ─────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <MiniCard
          label="TRI (20 ans)"
          value={tri > 0 ? `${tri.toFixed(1)} %` : '—'}
          sub="Flux + revente"
          trend={tri > 0 ? triTrend : undefined}
          accent={tri >= 8}
        />
        <MiniCard
          label="ROI apport"
          value={roi > 0 ? `${roi.toFixed(1)} %` : '—'}
          sub="Retour annuel capital"
          trend={roi > 0 ? roiTrend : undefined}
          warn={roi > 0 && roi < 5}
        />
        <MiniCard
          label="Rendement brut"
          value={formatPct(result.rendementBrut)}
          sub={`${formatCurrency(result.loyerAnnuelBrut)} / an`}
          trend={brutTrend}
        />
        <MiniCard
          label="Point mort"
          value={`${result.pointMort} €/m`}
          sub="Loyer min équilibre"
        />
        <MiniCard
          label="Mensualité crédit"
          value={`${Math.round(result.mensualiteTotale)} €/m`}
          sub={`Assurance ${Math.round(result.mensualiteTotale - result.mensualiteCredit)} €`}
        />
        <MiniCard
          label="Coût total crédit"
          value={formatCurrency(result.coutCredit)}
          sub="Sur durée du prêt"
          trend="down"
        />
      </div>

    </div>
  )
}
