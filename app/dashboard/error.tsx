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
    // Log the error so we can see it in Vercel runtime logs
    console.error('[Dashboard Error]', error.message, error.stack)
  }, [error])

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center space-y-5">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-black text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
            Une erreur est survenue
          </h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
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
            className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-zinc-300 font-semibold py-3 rounded-xl text-sm transition-all block"
          >
            Aller au calculateur
          </Link>
        </div>
      </div>
    </div>
  )
}
