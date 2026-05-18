'use client'

import { ScoreResult } from '@/lib/types'

interface ScoreCardProps {
  score: ScoreResult
}

const subScoreLabels: Array<{ key: keyof ScoreResult['subScores']; label: string }> = [
  { key: 'rentabilite', label: 'Rentabilité' },
  { key: 'cashflow', label: 'Cashflow' },
  { key: 'fiscalite', label: 'Fiscalité' },
  { key: 'marche', label: 'Marché' },
]

// SVG arc ring for score
function ScoreRing({ value, color }: { value: number; color: 'emerald' | 'amber' | 'red' }) {
  const size = 120
  const strokeW = 6
  const r = (size - strokeW) / 2
  const circumference = 2 * Math.PI * r
  const dash = (value / 100) * circumference

  const stroke = { emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }[color]
  const glow = { emerald: 'rgba(16,185,129,0.25)', amber: 'rgba(245,158,11,0.2)', red: 'rgba(239,68,68,0.2)' }[color]

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
          filter: `drop-shadow(0 0 6px ${glow})`,
          transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)',
        }}
      />
    </svg>
  )
}

export function ScoreCard({ score }: ScoreCardProps) {
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

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Left: global score */}
        <div className="md:w-56 shrink-0 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/[0.06]">
          <div className="relative">
            <ScoreRing value={score.global} color={score.color} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black leading-none ${textColor}`} style={{ letterSpacing: '-0.04em' }}>
                {score.global}
              </span>
              <span className="text-[11px] text-zinc-600 mt-0.5">/100</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeBg}`}>
              {score.label}
            </span>
            <p className="text-[11px] text-zinc-600 mt-2">Score d'opportunité</p>
          </div>
        </div>

        {/* Right: sub-scores + summary */}
        <div className="flex-1 p-6 flex flex-col justify-between gap-5">
          {/* Sub-scores */}
          <div className="space-y-3.5">
            {subScoreLabels.map(({ key, label }) => {
              const val = score.subScores[key]
              const c: 'emerald' | 'amber' | 'red' = val >= 60 ? 'emerald' : val >= 35 ? 'amber' : 'red'
              const barColor = { emerald: '#10b981', amber: '#f59e0b', red: '#ef4444' }[c]
              const numColor = { emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' }[c]

              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${val}%`,
                        background: barColor,
                        boxShadow: `0 0 8px ${barColor}40`,
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-8 text-right tabular-nums ${numColor}`}>{val}</span>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <p className="text-xs text-zinc-500 leading-relaxed border-t border-white/[0.05] pt-4">
            {score.summary}
          </p>
        </div>
      </div>
    </div>
  )
}
