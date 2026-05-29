'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, type SavedSimulation } from '@/lib/hooks/useSimulations'
import { DEFAULT_TAGS, loadCustomTags, resolveTag, type TagDef } from '@/lib/tags'
import { TagChip } from '@/components/app/TagChip'

function fmt(n: number) {
  return Math.round(n).toLocaleString('fr-FR')
}
function scoreColor(s: number) {
  return s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444'
}

function ScoreRing({ score, size = 40 }: { score: number; size?: number }) {
  const r = size * 0.39
  const c = size / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(score, 100) / 100)
  const col = scoreColor(score)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke={`${col}22`} strokeWidth={size * 0.08} />
      <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={size * 0.08}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.3} fontWeight="700" fill={col}>{score}</text>
    </svg>
  )
}

interface LibraryPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (sim: SavedSimulation) => void
  title?: string
}

export function LibraryPickerModal({ open, onClose, onSelect, title = 'Choisir un bien de la bibliothèque' }: LibraryPickerModalProps) {
  const { user } = useAuth()
  const { simulations, loading } = useSimulations(user?.id ?? null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const customTags = useMemo(() => loadCustomTags(user?.id ?? null), [user?.id])
  const allTags: TagDef[] = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags])
  // Tags réellement présents dans les biens (pour le filtre)
  const usedTags = useMemo(() => {
    const ids = new Set<string>()
    simulations.forEach(s => s.tags?.forEach(t => ids.add(t)))
    return allTags.filter(t => ids.has(t.id))
  }, [simulations, allTags])

  const filtered = useMemo(() => {
    let list = simulations
    if (tagFilter) list = list.filter(s => s.tags?.includes(tagFilter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.ville.toLowerCase().includes(q))
    }
    return list
  }, [simulations, search, tagFilter])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-th-border bg-th-surface shadow-card-th overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-th-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-th-text-1">{title}</h3>
                </div>
                <button onClick={onClose} className="text-th-text-3 hover:text-th-text-1 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom ou ville…"
                  className="w-full bg-th-input-bg border border-th-input-border rounded-lg text-sm text-th-text-1 placeholder:text-th-text-3 pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-500/40 transition-all"
                />
              </div>

              {usedTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-3">
                  <button
                    onClick={() => setTagFilter(null)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                      tagFilter === null ? 'bg-th-surface2 border-th-border-med text-th-text-1' : 'border-th-border text-th-text-3 hover:text-th-text-1'
                    }`}
                  >
                    Tous
                  </button>
                  {usedTags.map(t => {
                    const active = tagFilter === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTagFilter(active ? null : t.id)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5"
                        style={{
                          background: active ? `${t.color}22` : 'transparent',
                          borderColor: active ? t.color : 'var(--c-border)',
                          color: active ? t.color : 'var(--c-text-3)',
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-20 gap-3">
                  <div className="relative w-6 h-6">
                    <div className="w-6 h-6 border border-th-border rounded-full" />
                    <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
                  </div>
                  <span className="text-sm text-th-text-2">Chargement…</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-sm text-th-text-2">{simulations.length === 0 ? 'Aucune simulation enregistrée.' : 'Aucun résultat pour cette recherche.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((sim, i) => {
                    const score = sim.score ?? 0
                    const cfPos = sim.cashflowMensuel >= 0
                    return (
                      <motion.button
                        key={sim.id}
                        onClick={() => { onSelect(sim); onClose() }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.25), ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -3 }}
                        className="text-left rounded-xl border border-th-border bg-th-surface2 hover:border-emerald-500/40 p-4 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-th-text-1 truncate">{sim.name}</p>
                            <p className="text-[11px] text-th-text-3 truncate">{sim.ville || '—'} · {fmt(sim.prixAchat)} €</p>
                          </div>
                          <ScoreRing score={score} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-th-surface rounded-lg px-2.5 py-2">
                            <p className="text-[8px] font-semibold text-th-text-3 uppercase tracking-wide">Rdt net</p>
                            <p className="text-xs font-bold text-th-text-1 tabular-nums">{sim.rendementNet.toFixed(1)} %</p>
                          </div>
                          <div className="bg-th-surface rounded-lg px-2.5 py-2">
                            <p className="text-[8px] font-semibold text-th-text-3 uppercase tracking-wide">Cashflow</p>
                            <p className={`text-xs font-bold tabular-nums ${cfPos ? 'text-emerald-500' : 'text-red-400'}`}>{cfPos ? '+' : ''}{fmt(sim.cashflowMensuel)} €</p>
                          </div>
                        </div>
                        {sim.tags && sim.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {sim.tags.map(tid => {
                              const t = resolveTag(tid, customTags)
                              return t ? <TagChip key={tid} tag={t} size="xs" /> : null
                            })}
                          </div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-th-border flex items-center justify-between">
              <span className="text-[11px] text-th-text-3">{filtered.length} bien{filtered.length > 1 ? 's' : ''}</span>
              <button onClick={onClose} className="text-xs font-semibold text-th-text-2 hover:text-th-text-1 px-4 py-2 rounded-lg border border-th-border hover:bg-th-surface2 transition-all">
                Annuler
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
