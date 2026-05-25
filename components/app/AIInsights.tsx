'use client'

import { useState } from 'react'
import { AIInsight } from '@/lib/types'

interface AIInsightsProps {
  insights: AIInsight[] | null
  loading: boolean
  onGenerate: () => void
  isPro?: boolean
}

const typeConfig = {
  opportunity: { label: 'Opportunité', color: 'text-emerald-400', bg: 'bg-emerald-500/[0.14] border-emerald-500/20', dot: '#10b981' },
  risk:        { label: 'Risque',       color: 'text-red-400',     bg: 'bg-red-500/[0.14] border-red-500/20',         dot: '#ef4444' },
  optimization:{ label: 'Optimisation', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20',   dot: '#8b5cf6' },
  market:      { label: 'Marché',       color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/20',         dot: '#38bdf8' },
}

const priorityConfig = {
  high:   'text-red-400',
  medium: 'text-amber-400',
  low:    'text-th-text-3',
}

export function AIInsights({ insights, loading, onGenerate, isPro = false }: AIInsightsProps) {
  const [expanded, setExpanded] = useState<number | null>(0)

  if (!isPro) {
    return (
      <div className="rounded-2xl border border-th-border bg-th-surface2 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <h3 className="text-sm font-semibold text-th-text-1">Analyse IA</h3>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/[0.14] border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
          </div>
        </div>

        <div className="flex flex-col items-center text-center py-6 gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/[0.14] border border-amber-500/15 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-th-text-1 mb-1">Recommandations IA</p>
            <p className="text-xs text-th-text-2 max-w-xs leading-relaxed">
              Optimisation fiscale, analyse de risques et recommandations personnalisées avec le plan Pro.
            </p>
          </div>
          <button className="text-sm font-semibold bg-amber-500/[0.14] text-amber-400 border border-amber-500/20 px-4 py-2 rounded-xl hover:bg-amber-500/20 transition-colors">
            Passer à Pro — 29€/mois
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-th-border bg-th-surface2 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <h3 className="text-sm font-semibold text-th-text-1">Analyse IA</h3>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/[0.14] border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">GPT-4</span>
        </div>
        <div>
          {!insights && !loading && (
            <button
              onClick={onGenerate}
              className="text-xs font-semibold text-emerald-400 bg-emerald-500/[0.14] border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              Générer
            </button>
          )}
          {insights && (
            <button
              onClick={onGenerate}
              className="text-xs text-th-text-2 hover:text-th-text-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-th-surface2"
            >
              Actualiser
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-4 py-2">
          {[0.6, 0.8, 0.5].map((w, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-3 bg-th-surface2 rounded-full" style={{ width: `${w * 100}%` }} />
              <div className="h-2.5 bg-th-surface2 rounded-full" />
              <div className="h-2.5 bg-th-surface2 rounded-full" style={{ width: '70%' }} />
            </div>
          ))}
        </div>
      )}

      {insights && !loading && (
        <div className="space-y-2">
          {insights.map((insight, i) => {
            const tc = typeConfig[insight.type]
            const isOpen = expanded === i

            return (
              <button
                key={i}
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full text-left rounded-xl border border-th-border hover:border-white/[0.1] bg-th-surface hover:bg-th-surface2 transition-all duration-200 overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: tc.dot }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${tc.color}`}>{tc.label}</span>
                      <span className={`text-[10px] ${priorityConfig[insight.priority]}`}>
                        {insight.priority === 'high' ? '↑ Prioritaire' : insight.priority === 'medium' ? '→ Important' : '↓ Informatif'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-th-text-1 leading-snug">{insight.title}</p>
                  </div>
                  <svg
                    className={`w-3.5 h-3.5 text-th-text-3 transition-transform mt-0.5 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-th-border pt-3 space-y-2.5">
                    <p className="text-xs text-th-text-2 leading-relaxed">{insight.description}</p>
                    {insight.impact && (
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/[0.13] border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        {insight.impact}
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {!insights && !loading && (
        <div className="py-6 text-center">
          <p className="text-xs text-th-text-3 leading-relaxed">
            Cliquez sur "Générer" pour obtenir des recommandations personnalisées basées sur votre simulation.
          </p>
        </div>
      )}
    </div>
  )
}
