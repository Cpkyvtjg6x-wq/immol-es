'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { InvestmentParams, InvestmentResult, ScoreResult } from '@/lib/types'
import { formatCurrency, formatPct } from '@/lib/utils'

interface SaveModalProps {
  isOpen: boolean
  onClose: () => void
  isLoggedIn: boolean
  result: InvestmentResult | null
  score: ScoreResult | null
  params: Partial<InvestmentParams> | null
  onSave: (name: string) => Promise<{ error: string | null }>
}

export function SaveModal({ isOpen, onClose, isLoggedIn, result, score, params, onSave }: SaveModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const defaultName = result
    ? `${result.ville} — ${formatCurrency(result.prixRevient ?? 0)}`
    : 'Ma simulation'

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: err } = await onSave(name || defaultName)
    setSaving(false)
    if (err) {
      setError(err)
    } else {
      setSaved(true)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-th-border bg-th-surface shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-th-surface2 hover:bg-th-surface3 flex items-center justify-center text-th-text-2 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!isLoggedIn ? (
          /* Not logged in → upsell signup */
          <div className="p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-th-text-1 mb-2" style={{ letterSpacing: '-0.02em' }}>
                Sauvegardez votre analyse
              </p>
              <p className="text-sm text-th-text-2 leading-relaxed">
                Créez un compte gratuit pour sauvegarder vos simulations et y accéder depuis votre dashboard.
              </p>
            </div>
            {result && score && (
              <div className="rounded-xl bg-th-surface2 border border-th-border p-4 text-left space-y-2">
                <p className="text-xs text-th-text-2 font-medium">Simulation à sauvegarder</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-th-text-1 font-semibold">{result.ville} · {formatCurrency(result.prixRevient)}</span>
                  <span className={`text-sm font-bold ${score.color === 'emerald' ? 'text-emerald-400' : score.color === 'amber' ? 'text-amber-400' : 'text-red-400'}`}>
                    Score {score.global}/100
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-th-text-2">
                  <span>Brut : {formatPct(result.rendementBrut)}</span>
                  <span>Net : {formatPct(result.rendementNet)}</span>
                  <span>CF : {result.cashflowMensuel >= 0 ? '+' : ''}{Math.round(result.cashflowMensuel)} €/mois</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => router.push('/auth/signup')}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
              >
                Créer un compte gratuit
              </button>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-2 text-sm text-th-text-2 hover:text-white transition-colors"
              >
                J'ai déjà un compte → Connexion
              </button>
            </div>
          </div>
        ) : saved ? (
          /* Success state */
          <div className="p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-th-text-1 mb-1">Simulation sauvegardée !</p>
              <p className="text-sm text-th-text-2">Elle est disponible dans votre dashboard.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm text-th-text-2 hover:text-white border border-th-border-med rounded-xl transition-colors"
              >
                Continuer l'analyse
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-2 text-sm font-semibold bg-white text-zinc-950 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                Voir le dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Save form */
          <div className="p-8 space-y-5">
            <div>
              <p className="text-base font-bold text-th-text-1 mb-1" style={{ letterSpacing: '-0.02em' }}>
                Sauvegarder la simulation
              </p>
              <p className="text-xs text-th-text-2">Donnez un nom à cette analyse pour la retrouver facilement.</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-th-text-2">Nom de la simulation</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName}
                className="w-full bg-th-surface2 border border-th-border rounded-xl px-3 py-2.5 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/40 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 text-sm text-th-text-2 hover:text-white border border-th-border-med rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 text-sm font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-50"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
