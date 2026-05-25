'use client'

import { useState } from 'react'
import { ScoreResult } from '@/lib/types'
import { IconTrendingUp, IconBanknotes, IconScale, IconMapPin, IconCheckCircle, IconExclamationTriangle, IconExclamationCircle } from '@/components/ui/icons'

interface ScoreCardProps {
  score: ScoreResult
}

const subScoreLabels: Array<{ key: keyof ScoreResult['subScores']; label: string; Icon: React.FC<{ className?: string }> }> = [
  { key: 'rentabilite', label: 'Rentabilité', Icon: IconTrendingUp },
  { key: 'cashflow',    label: 'Cashflow',    Icon: IconBanknotes },
  { key: 'fiscalite',   label: 'Fiscalité',   Icon: IconScale },
  { key: 'marche',      label: 'Marché',      Icon: IconMapPin },
]

// SVG arc ring for score
function ScoreRing({ value, color }: { value: number; color: 'emerald' | 'amber' | 'red' }) {
  const size = 140
  const strokeW = 7
  const r = (size - strokeW) / 2
  const circumference = 2 * Math.PI * r

  const dash = (value / 100) * circumference

  const stroke = { emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }[color]
  const glow = { emerald: 'rgba(16,185,129,0.3)', amber: 'rgba(245,158,11,0.25)', red: 'rgba(239,68,68,0.25)' }[color]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={strokeW}
      />
      {/* Progress */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        style={{
          filter: `drop-shadow(0 0 8px ${glow})`,
          transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
    </svg>
  )
}

export function ScoreCard({ score }: ScoreCardProps) {
  const [expanded, setExpanded] = useState(false)
  const globalRounded = Math.round(score.global)

  const textColor = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  }[score.color]

  const badgeBg = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }[score.color]

  const SummaryIcon = score.color === 'emerald' ? IconCheckCircle : score.color === 'amber' ? IconExclamationTriangle : IconExclamationCircle
  const summaryIconColor = { emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' }[score.color]

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface2 overflow-hidden">
      {/* Hero — score global uniquement */}
      <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-0">
        {/* Ring + chiffre */}
        <div className="sm:w-56 shrink-0 flex flex-col items-center justify-center p-8 border-b sm:border-b-0 sm:border-r border-th-border bg-th-surface2">
          <div className="relative w-[140px] h-[140px]">
            <ScoreRing value={globalRounded} color={score.color} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[44px] font-black leading-none tabular-nums ${textColor}`} style={{ letterSpacing: '-0.04em' }}>
                {globalRounded}
              </span>
              <span className="text-[11px] text-th-text-3 mt-1 font-medium">/100</span>
            </div>
          </div>
          <div className="mt-4 text-center space-y-1.5">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${badgeBg}`}>
              {score.label}
            </span>
            <p className="text-[10px] text-th-text-3 uppercase tracking-wider font-semibold">Score IMMORA</p>
          </div>
        </div>

        {/* Résumé verdict */}
        <div className="flex-1 flex flex-col justify-center p-6 gap-4 min-w-0">
          <div className="flex items-start gap-3">
            <SummaryIcon className={`w-5 h-5 shrink-0 mt-0.5 ${summaryIconColor}`} />
            <p className="text-[14px] text-th-text-1 leading-relaxed font-medium">
              {score.summary}
            </p>
          </div>

          {/* Mini aperçu des 4 dimensions (non-interactif, compact) */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-th-border">
            {subScoreLabels.map(({ key, label, Icon }) => {
              const val = Math.round(score.subScores[key])
              const c: 'emerald' | 'amber' | 'red' = val >= 60 ? 'emerald' : val >= 35 ? 'amber' : 'red'
              const numColor = { emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' }[c]
              const iconColor = { emerald: 'text-emerald-500/60', amber: 'text-amber-500/60', red: 'text-red-500/60' }[c]
              return (
                <div key={key} className="flex flex-col items-center gap-0.5">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                  <span className={`text-[13px] font-bold tabular-nums ${numColor}`}>{val}</span>
                  <span className="text-[9px] text-th-text-3 font-medium">{label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Section déployable — détail barres de progression */}
      <div className="border-t border-th-border">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-[11px] text-th-text-2 hover:text-th-text-2 transition-colors font-semibold uppercase tracking-wider"
        >
          <span>Détail par dimension</span>
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4">
            {subScoreLabels.map(({ key, label, Icon }) => {
              const val = Math.round(score.subScores[key])
              const c: 'emerald' | 'amber' | 'red' = val >= 60 ? 'emerald' : val >= 35 ? 'amber' : 'red'
              const barColor = { emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }[c]
              const numColor = { emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' }[c]
              const iconColor = { emerald: 'text-emerald-500/50', amber: 'text-amber-500/50', red: 'text-red-500/50' }[c]

              return (
                <div key={key} className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                  <span className="text-[12px] text-th-text-2 w-24 shrink-0 font-medium">{label}</span>
                  <div className="flex-1 h-1.5 bg-th-surface2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${val}%`,
                        background: barColor,
                        boxShadow: `0 0 6px ${barColor}50`,
                        transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  </div>
                  <span className={`text-[12px] font-bold w-7 text-right tabular-nums shrink-0 ${numColor}`}>{val}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
