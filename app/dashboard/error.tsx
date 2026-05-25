'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log complet pour diagnostiquer React error #310
    console.error('[Dashboard Error] message:', error.message)
    console.error('[Dashboard Error] stack:', error.stack)
    if ((error as { cause?: unknown }).cause) {
      console.error('[Dashboard Error] cause:', (error as { cause?: unknown }).cause)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-th-surface border border-th-border-med rounded-2xl p-8 text-center space-y-5">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-black text-th-text-1 mb-2" style={{ letterSpacing: '-0.03em' }}>
            Une erreur est survenue
          </h2>
          <p className="text-sm text-th-text-2 leading-relaxed">
            Le tableau de bord n&apos;a pas pu se charger.
          </p>
        </div>

        {/* Error details (visible for debugging) */}
        {error.message && (
          <div className="bg-red-500/[0.06] border border-red-500/20 rounded-xl px-4 py-3 text-left">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">Détail de l&apos;erreur</p>
            <p className="text-xs text-red-300 font-mono break-all leading-relaxed">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] text-red-600 mt-1">ID: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={reset}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all"
          >
            Réessayer
          </button>
          <Link
            href="/analyse"
            className="w-full bg-th-surface2 hover:bg-th-surface3 border border-th-border text-th-text-1 font-semibold py-3 rounded-xl text-sm transition-all block"
          >
            Aller au calculateur
          </Link>
        </div>
      </div>
    </div>
  )
}
