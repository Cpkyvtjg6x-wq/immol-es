'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SimulationStatus } from '@/lib/hooks/useSimulations'

interface MarkOwnedModalProps {
  open: boolean
  sim: { name: string; status: SimulationStatus; acquired_at: string | null } | null
  onClose: () => void
  onConfirm: (status: SimulationStatus, acquiredAt: string | null) => void
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function MarkOwnedModal({ open, sim, onClose, onConfirm }: MarkOwnedModalProps) {
  const [date, setDate] = useState<string>(today())

  useEffect(() => {
    if (open && sim) setDate(sim.acquired_at ?? today())
  }, [open, sim])

  const owned = sim?.status === 'possede'

  return (
    <AnimatePresence>
      {open && sim && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-th-border bg-th-surface shadow-card-th overflow-hidden"
          >
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M3 22h18M9 7h.01M15 7h.01M9 11h.01M15 11h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-th-text-1">
                      {owned ? 'Bien détenu' : 'Marquer comme détenu'}
                    </h3>
                    <p className="text-xs text-th-text-2 truncate max-w-[260px]">{sim.name}</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-th-text-3 hover:text-th-text-1 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 pb-2">
              <p className="text-sm text-th-text-2 leading-relaxed mb-4">
                {owned
                  ? 'Ce bien fait partie de votre patrimoine détenu. Vous pouvez ajuster la date d’acquisition ou le repasser en étude.'
                  : 'Ce bien rejoindra votre patrimoine détenu — il alimentera le cashflow réel, la consolidation fiscale et la timeline des prêts.'}
              </p>
              <label className="block text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-2">
                Date d’acquisition <span className="text-th-text-3 normal-case">(optionnelle)</span>
              </label>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-th-input-bg border border-th-input-border rounded-xl px-4 py-3 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div className="px-6 py-5 flex items-center gap-3">
              {owned && (
                <button
                  onClick={() => onConfirm('simule', null)}
                  className="text-xs font-semibold text-th-text-2 hover:text-th-text-1 px-3 py-2.5 rounded-xl border border-th-border hover:border-th-border-med transition-all"
                >
                  Repasser en étude
                </button>
              )}
              <button
                onClick={onClose}
                className="ml-auto text-sm font-semibold text-th-text-2 hover:text-th-text-1 px-4 py-2.5 rounded-xl border border-th-border hover:bg-th-surface2 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => onConfirm('possede', date || null)}
                className="text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {owned ? 'Mettre à jour' : 'Confirmer l’acquisition'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
