'use client'

import { useMemo } from 'react'
import type { SavedSimulation } from '@/lib/hooks/useSimulations'

interface Props {
  simulations: SavedSimulation[]
  isPro: boolean
}

function healthScore(simulations: SavedSimulation[]): {
  score: number
  label: string
  color: string
  tips: string[]
} {
  if (simulations.length === 0)
    return { score: 0, label: 'Aucun bien', color: '#52525b', tips: ['Analysez votre premier bien pour obtenir un score de santé.'] }

  const avgScore = simulations.reduce((a, s) => a + (s.score ?? 50), 0) / simulations.length
  const totalCf = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
  const avgYield = simulations.reduce((a, s) => a + s.rendementBrut, 0) / simulations.length

  // Pondération : 50% score moyen, 30% cashflow positif, 20% rendement
  const cfBonus = totalCf > 0 ? Math.min(totalCf / 100, 20) : Math.max(totalCf / 100, -20)
  const yieldBonus = avgYield >= 7 ? 20 : avgYield >= 5 ? 12 : avgYield >= 3 ? 6 : 0
  const raw = avgScore * 0.5 + 50 + cfBonus + yieldBonus
  const score = Math.round(Math.max(0, Math.min(100, raw)))

  const tips: string[] = []
  if (totalCf < 0) tips.push('Votre cashflow global est négatif — cherchez à réduire les charges ou augmenter les loyers.')
  if (avgYield < 5) tips.push('Rendement moyen sous 5% — envisagez des biens avec un meilleur rapport loyer/prix.')
  if (simulations.length < 3) tips.push('Diversifiez avec 2–3 biens pour réduire le risque locatif.')
  if (simulations.some(s => (s.score ?? 0) < 40)) tips.push('Un bien sous-performe (score < 40) — analysez ses coûts.')
  if (tips.length === 0) tips.push('Portefeuille sain ! Continuez à identifier des opportunités.')

  const label = score >= 75 ? 'Excellent' : score >= 55 ? 'Correct' : score >= 35 ? 'À optimiser' : 'Risqué'
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : score >= 35 ? '#f97316' : '#ef4444'

  return { score, label, color, tips }
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function ArcGauge({ score, color }: { score: number; color: string }) {
  const r = 40
  const cx = 52
  const cy = 52
  const strokeW = 6
  const full = Math.PI * r // half-circle circumference
  const dash = (score / 100) * full
  const gap = full - dash

  return (
    <svg width="104" height="60" viewBox="0 0 104 60">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap + 0.1}`}
        strokeDashoffset="0"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
      />
      {/* Score text */}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="20" fontWeight="700" fontFamily="var(--font-geist-sans)">
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="var(--font-geist-sans)">
        /100
      </text>
    </svg>
  )
}

export function PatrimoineCard({ simulations, isPro }: Props) {
  const health = useMemo(() => healthScore(simulations), [simulations])

  const totalInvested = simulations.reduce((a, s) => a + s.prixAchat, 0)
  const totalCf = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
  const totalCfAnnual = totalCf * 12
  const avgYield = simulations.length > 0
    ? simulations.reduce((a, s) => a + s.rendementBrut, 0) / simulations.length
    : 0
  const bestBien = simulations.length > 0
    ? [...simulations].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
    : null

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(2)} M€`
      : n >= 1_000
      ? `${Math.round(n / 1000)} k€`
      : `${Math.round(n)} €`

  if (simulations.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      {/* Top strip */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: health.color }} />
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Santé du portefeuille</p>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
          style={{
            color: health.color,
            background: `${health.color}14`,
            borderColor: `${health.color}30`,
          }}
        >
          {health.label}
        </span>
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] divide-x divide-white/[0.05]">
        {/* Jauge */}
        <div className="px-8 py-6 flex flex-col items-center justify-center gap-1">
          <ArcGauge score={health.score} color={health.color} />
          <p className="text-[10px] text-zinc-600 text-center">Score global</p>
        </div>

        {/* Patrimoine */}
        <div className="px-6 py-6 flex flex-col justify-between">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Patrimoine</p>
          <p className="text-2xl font-bold text-white tabular-nums" style={{ letterSpacing: '-0.04em' }}>
            {fmt(totalInvested)}
          </p>
          <p className="text-[11px] text-zinc-600 mt-1">{simulations.length} bien{simulations.length > 1 ? 's' : ''} simulé{simulations.length > 1 ? 's' : ''}</p>
          <MiniBar value={simulations.length} max={10} color="rgba(255,255,255,0.2)" />
        </div>

        {/* Cashflow */}
        <div className="px-6 py-6 flex flex-col justify-between">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Cashflow mensuel</p>
          <p
            className="text-2xl font-bold tabular-nums"
            style={{ letterSpacing: '-0.04em', color: totalCf >= 0 ? '#10b981' : '#ef4444' }}
          >
            {totalCf >= 0 ? '+' : ''}{Math.round(totalCf)} €
          </p>
          <p className="text-[11px] text-zinc-600 mt-1">
            {totalCfAnnual >= 0 ? '+' : ''}{fmt(Math.abs(totalCfAnnual))}/an
          </p>
          <MiniBar
            value={Math.max(0, totalCf + 500)}
            max={1000}
            color={totalCf >= 0 ? '#10b981' : '#ef4444'}
          />
        </div>

        {/* Rendement */}
        <div className="px-6 py-6 flex flex-col justify-between">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Rendement moy.</p>
          <p className="text-2xl font-bold text-white tabular-nums" style={{ letterSpacing: '-0.04em' }}>
            {avgYield.toFixed(1)}<span className="text-base text-zinc-400">%</span>
          </p>
          <p className="text-[11px] text-zinc-600 mt-1">brut moyen</p>
          <MiniBar value={avgYield} max={12} color="#a78bfa" />
        </div>

        {/* Meilleur bien */}
        <div className="px-6 py-6 flex flex-col justify-between">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Meilleur bien</p>
          {bestBien ? (
            <>
              <p className="text-sm font-semibold text-white truncate">{bestBien.name}</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">{bestBien.ville}</p>
              <div className="flex items-center gap-1.5 mt-auto pt-2">
                <span className="text-xs font-bold text-emerald-400">{bestBien.rendementBrut.toFixed(1)}%</span>
                <span className="text-[10px] text-zinc-600">brut</span>
                <span className="text-[10px] text-zinc-700 mx-1">·</span>
                <span
                  className="text-xs font-bold"
                  style={{ color: bestBien.cashflowMensuel >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {bestBien.cashflowMensuel >= 0 ? '+' : ''}{Math.round(bestBien.cashflowMensuel)} €
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-600">—</p>
          )}
        </div>
      </div>

      {/* Recommandations IA */}
      {health.tips.length > 0 && (
        <div className="border-t border-white/[0.05] px-6 py-4 flex items-start gap-3">
          <div className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5">Recommandations</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {health.tips.map((tip, i) => (
                <p key={i} className="text-[12px] text-zinc-400 leading-relaxed">{tip}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
