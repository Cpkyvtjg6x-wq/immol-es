'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations } from '@/lib/hooks/useSimulations'
import { formatCurrency } from '@/lib/utils'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isPro, tier } = useAuth()
  const { simulations } = useSimulations(user?.id ?? null)

  const firstName =
    user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'vous'

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const recentSims = simulations.slice(0, 4)

  const nav = [
    {
      href: '/dashboard',
      label: 'Tableau de bord',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      href: '/analyse',
      label: 'Analyser un bien',
      highlight: true,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
  ]

  const tools = [
    {
      href: '/comparer',
      label: 'Comparer',
      disabled: false,
      badge: null as string | null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: '/analyse',
      label: 'Export PDF / Excel',
      disabled: false,
      badge: null as string | null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      href: '/rapport-bancaire',
      label: 'Dossier bancaire',
      disabled: false,
      badge: 'Pro' as string | null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex min-h-screen bg-[#09090b] text-white">
      {/* ── Sidebar ── */}
      <aside className="fixed inset-y-0 left-0 w-56 border-r border-white/[0.05] flex flex-col z-40 bg-[#09090b]">

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-white/[0.05] shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <svg className="w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">IMMO<span className="text-emerald-400">RA</span></span>
          </Link>
        </div>

        {/* Plan badge — tier réel */}
        {user && (
          <div className="px-3 py-2.5 border-b border-white/[0.05] shrink-0">
            {isPro ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-400">
                  {tier === 'business' ? 'Agence' : 'Pro'}
                </span>
                <span className="ml-auto text-[10px] font-bold text-emerald-600">Actif</span>
              </div>
            ) : (
              <button
                onClick={() => router.push('/#pricing')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-emerald-500/30 transition-all group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                <span className="text-[11px] font-semibold text-zinc-500 group-hover:text-zinc-300">Gratuit</span>
                <span className="ml-auto text-[10px] font-bold text-emerald-500 group-hover:text-emerald-400">→ Pro</span>
              </button>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 pt-3">

          {/* Main nav */}
          <div className="space-y-0.5 mb-5">
            {nav.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all
                    ${item.highlight && !isActive
                      ? 'text-emerald-400 hover:bg-emerald-500/[0.08]'
                      : isActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'}
                  `}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Recent simulations */}
          {recentSims.length > 0 && (
            <div className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Récentes</p>
              <div className="space-y-0.5">
                {recentSims.map((sim) => {
                  const score = sim.score ?? 0
                  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 45 ? 'text-amber-400' : 'text-red-400'
                  const cfSign = sim.cashflowMensuel >= 0
                  return (
                    <button
                      key={sim.id}
                      onClick={() => router.push('/analyse')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all text-left group"
                    >
                      {/* Score dot */}
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-zinc-300 truncate leading-tight">{sim.name}</p>
                        <p className="text-[10px] text-zinc-600 truncate">
                          {sim.ville} · {sim.rendementBrut.toFixed(1)}% brut
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[11px] font-bold tabular-nums ${scoreColor}`}>{score}</p>
                        <p className={`text-[10px] tabular-nums ${cfSign ? 'text-emerald-500' : 'text-red-400'}`}>
                          {cfSign ? '+' : ''}{Math.round(sim.cashflowMensuel)}€
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 mt-1 text-[10px] font-semibold text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Voir toutes les simulations
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {/* Tools section */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Outils Pro</p>
            <div className="space-y-0.5">
              {tools.map((item) => {
                const isActive = pathname === item.href
                const cls = `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  item.disabled
                    ? 'text-zinc-600 opacity-50 cursor-not-allowed'
                    : isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`
                if (item.disabled) {
                  return (
                    <button key={item.label} disabled className={cls}>
                      <span className="shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.05] text-zinc-600 border border-white/[0.07]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                }
                return (
                  <Link key={item.label} href={item.href} className={cls}>
                    <span className="shrink-0">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/[0.12] text-emerald-500 border border-emerald-500/20">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </nav>

        {/* User footer */}
        <div className="p-2 border-t border-white/[0.05] shrink-0 space-y-0.5">
          {user ? (
            <>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white uppercase shrink-0">
                  {firstName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight truncate capitalize">{firstName}</p>
                  <p className="text-[10px] text-zinc-600 leading-tight truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Se déconnecter
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/[0.06] transition-all"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Se connecter / S'inscrire
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="pl-56 flex-1 min-h-screen">
        {children}
      </div>
    </div>
  )
}
