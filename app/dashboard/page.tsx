'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatPct } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations, SavedSimulation } from '@/lib/hooks/useSimulations'

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const bg = score >= 70 ? 'rgba(16,185,129,0.1)' : score >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  const border = score >= 70 ? 'rgba(16,185,129,0.2)' : score >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border tabular-nums" style={{ color, background: bg, borderColor: border }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {score}
    </span>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center mb-5">
        <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-white mb-2" style={{ letterSpacing: '-0.02em' }}>Aucune simulation enregistrée</p>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs leading-relaxed">
        Analysez un bien et sauvegardez-le pour le retrouver ici avec tous vos indicateurs.
      </p>
      <button
        onClick={onNew}
        className="flex items-center gap-2 text-sm font-semibold bg-emerald-500 text-zinc-950 px-4 py-2 rounded-xl hover:bg-emerald-400 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Analyser un bien
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { simulations, loading: simsLoading, deleteSimulation, toggleFavorite } = useSimulations(user?.id ?? null)
  const [activeNav] = useState<'dashboard' | 'analyse'>('dashboard')

  // Redirect to login if not authenticated after loading
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [authLoading, user, router])

  // Portfolio stats
  const totalInvested = simulations.reduce((a, s) => a + s.prixAchat, 0)
  const totalCf = simulations.reduce((a, s) => a + s.cashflowMensuel, 0)
  const avgScore = simulations.length > 0
    ? Math.round(simulations.reduce((a, s) => a + (s.score ?? 0), 0) / simulations.length)
    : 0

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border border-white/[0.08] rounded-full" />
          <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'vous'

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center transition-transform group-hover:scale-105">
                <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-[13px] font-semibold text-white tracking-tight">Immolyse</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {[
                { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
                { id: 'analyse', label: 'Analyser', href: '/analyse' },
              ].map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    activeNav === item.id
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-500 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-zinc-500 bg-white/[0.05] border border-white/[0.08] px-2.5 py-1 rounded-full uppercase tracking-wider">
              Gratuit
            </span>
            <button
              className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white uppercase"
              title={user?.email}
            >
              {firstName.charAt(0)}
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="pt-14 max-w-screen-xl mx-auto px-6 pb-20">
        {/* Page header */}
        <div className="flex items-end justify-between pt-10 pb-8">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Tableau de bord</p>
            <h1 className="text-3xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
              Bonjour, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              {simulations.length > 0
                ? `${simulations.length} simulation${simulations.length > 1 ? 's' : ''} enregistrée${simulations.length > 1 ? 's' : ''}.`
                : 'Aucune simulation enregistrée.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/analyse')}
            className="flex items-center gap-2 text-sm font-semibold bg-emerald-500 text-zinc-950 px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle analyse
          </button>
        </div>

        {/* Portfolio KPIs */}
        {simulations.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            {[
              { label: 'Simulations', value: simulations.length.toString(), sub: `${simulations.length}/3 plan gratuit`, color: 'text-white' },
              { label: 'Patrimoine simulé', value: formatCurrency(totalInvested), sub: 'prix acquisitions', color: 'text-white' },
              { label: 'Cashflow total', value: `${totalCf >= 0 ? '+' : ''}${Math.round(totalCf)} €`, sub: 'par mois', color: totalCf >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Score moyen', value: avgScore.toString(), sub: 'sur 100', color: avgScore >= 70 ? 'text-emerald-400' : avgScore >= 50 ? 'text-amber-400' : 'text-red-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-3">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${kpi.color}`} style={{ letterSpacing: '-0.03em' }}>{kpi.value}</p>
                <p className="text-[11px] text-zinc-600">{kpi.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Simulations */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Mes simulations</p>
            {simulations.length > 0 && (
              <span className="text-[11px] text-zinc-600">{simulations.length} / 3 (plan gratuit)</span>
            )}
          </div>

          {simsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="relative w-6 h-6">
                <div className="w-6 h-6 border border-white/[0.08] rounded-full" />
                <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
              </div>
              <span className="text-sm text-zinc-500">Chargement…</span>
            </div>
          ) : simulations.length === 0 ? (
            <EmptyState onNew={() => router.push('/analyse')} />
          ) : (
            <>
              {/* Column headers */}
              <div className="hidden md:grid grid-cols-[1fr_100px_100px_80px_60px_60px] gap-4 px-5 mb-2">
                {['Bien', 'Brut / Net', 'Cashflow', 'Prix', 'Score', ''].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="space-y-2">
                {simulations.map((sim: SavedSimulation) => (
                  <div
                    key={sim.id}
                    className="group grid md:grid-cols-[1fr_100px_100px_80px_60px_60px] gap-4 items-center rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 px-5 py-4"
                  >
                    {/* Name */}
                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => router.push('/analyse')}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white truncate">{sim.name}</p>
                        {sim.is_favorite && (
                          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-600">
                        {sim.ville} · {new Date(sim.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Yield */}
                    <div className="hidden md:block">
                      <p className="text-sm font-semibold text-white tabular-nums">{formatPct(sim.rendementBrut)}</p>
                      <p className="text-[11px] text-zinc-600">{formatPct(sim.rendementNet)} net</p>
                    </div>

                    {/* Cashflow */}
                    <div className="hidden md:block">
                      <p className={`text-sm font-bold tabular-nums ${sim.cashflowMensuel >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sim.cashflowMensuel >= 0 ? '+' : ''}{Math.round(sim.cashflowMensuel)} €
                      </p>
                      <p className="text-[11px] text-zinc-600">par mois</p>
                    </div>

                    {/* Price */}
                    <div className="hidden md:block">
                      <p className="text-sm text-white tabular-nums">{formatCurrency(sim.prixAchat)}</p>
                    </div>

                    {/* Score */}
                    <div className="hidden md:block">
                      {sim.score !== null ? <ScoreBadge score={sim.score} /> : <span className="text-xs text-zinc-600">—</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleFavorite(sim.id, sim.is_favorite)}
                        className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-zinc-600 hover:text-amber-400 transition-colors"
                        title="Favori"
                      >
                        <svg className={`w-3.5 h-3.5 ${sim.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} fill={sim.is_favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteSimulation(sim.id)}
                        className="w-7 h-7 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upsell */}
              {simulations.length >= 3 && (
                <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Limite du plan gratuit atteinte</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Simulations illimitées, analyse IA, export PDF avec Pro.</p>
                    </div>
                  </div>
                  <button className="shrink-0 text-[13px] font-semibold bg-white text-zinc-950 px-4 py-2 rounded-xl hover:bg-zinc-100 transition-all hover:scale-[1.02] whitespace-nowrap">
                    Passer à Pro
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Actions rapides</p>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                title: 'Nouvelle analyse',
                desc: 'Évaluez un bien en 30 secondes',
                action: () => router.push('/analyse'),
                cta: 'Analyser',
                ctaStyle: 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>,
                title: 'Comparer des biens',
                desc: 'Côte à côte pour décider',
                action: () => {},
                cta: 'Bientôt',
                ctaStyle: 'bg-white/[0.05] text-zinc-500 border border-white/[0.08] cursor-not-allowed',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
                title: 'Rapport PDF',
                desc: 'Exportez pour votre banquier',
                action: () => {},
                cta: 'Plan Pro',
                ctaStyle: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={item.action}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-lg transition-all ${item.ctaStyle}`}
                >
                  {item.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
