'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from '@/components/app/ThemeProvider'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSimulations } from '@/lib/hooks/useSimulations'
import { NotificationBell } from '@/components/app/NotificationBell'

const SIDEBAR_TAGS = [
  { id: 'visit',  label: 'A visiter',     color: '#60a5fa' },
  { id: 'heart',  label: 'Coup de coeur', color: '#fb7185' },
  { id: 'offer',  label: 'Sous offre',    color: '#fbbf24' },
  { id: 'signed', label: 'Signe',         color: '#4ade80' },
  { id: 'owned',  label: 'Possede',       color: '#c4b5fd' },
  { id: 'refuse', label: 'Refuse',        color: '#52525b' },
]

interface TagDef {
  id: string
  label: string
  color: string
}

interface AppShellProps {
  children: React.ReactNode
  activeTag?: string
  onTagFilter?: (tag: string) => void
  customTags?: TagDef[]
  onCreateTag?: () => void
}

export function AppShell({ children, activeTag, onTagFilter, customTags = [], onCreateTag }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isPro, tier } = useAuth()
  const { simulations } = useSimulations(user?.id ?? null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

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
  const isBibliotheque = pathname.startsWith('/bibliotheque')

  /* Tous les tags (fixes + custom) */
  const allSidebarTags: TagDef[] = [...SIDEBAR_TAGS, ...customTags]

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
      href: '/portfolio',
      label: 'Portfolio',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      badge: simulations.length > 0 ? `${simulations.length}` : null as string | null,
    },
    {
      href: '/bibliotheque',
      label: 'Bibliotheque',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
      badge: null as string | null,
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
    {
      href: '/revente',
      label: 'Simulateur revente',
      disabled: false,
      badge: null as string | null,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex min-h-screen bg-th-bg text-th-text-1">

      {/* Mobile top bar — adapts to theme, sidebar stays dark */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-th-bg backdrop-blur-md border-b border-th-border flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[5px] bg-emerald-500 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </div>
          <span className="text-[13px] font-bold text-th-text-1 tracking-[-0.04em]">IMMO<span className="text-emerald-400">RA</span></span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell simulationCount={simulations.length} isPro={isPro} />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-lg bg-th-surface2 flex items-center justify-center text-th-text-2 hover:bg-th-surface3 transition-colors"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-56 flex flex-col z-40 transition-transform duration-200 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`} style={{
        background: 'var(--c-sidebar-bg)',
        borderRight: '1px solid var(--c-sidebar-border)',
        boxShadow: isDark ? 'none' : '4px 0 24px rgba(0,0,0,0.18)',
      }}>

        {/* Logo */}
        <div className="h-14 flex items-center px-4 shrink-0" style={{ borderBottom: '1px solid var(--c-sidebar-border)' }}>
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-5 h-5 rounded-[5px] bg-emerald-500 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
              <svg className="w-3 h-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10" />
              </svg>
            </div>
            <span className="text-[13px] font-bold text-white tracking-[-0.04em]">IMMO<span className="text-emerald-400">RA</span></span>
          </Link>
        </div>

        {/* Plan badge */}
        {user && (
          <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--c-sidebar-border)' }}>
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
                <span className="text-[11px] font-semibold text-th-sidebar-text-2 group-hover:text-th-sidebar-text-1">Gratuit</span>
                <span className="ml-auto text-[10px] font-bold text-emerald-500 group-hover:text-emerald-400">Pro</span>
              </button>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 pt-3">

          {/* Main nav */}
          <div className="space-y-0.5 mb-5">
            {nav.map((item) => {
              const isActive = pathname === item.href || (item.href === '/bibliotheque' && isBibliotheque)
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
                        : 'text-th-sidebar-text-2 hover:text-white hover:bg-white/[0.04]'}
                  `}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.06] text-th-sidebar-text-2 border border-white/[0.07] tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Mes tags — visible uniquement sur /bibliotheque */}
          {isBibliotheque && onTagFilter && (
            <div className="mb-5">
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-th-sidebar-text-1 uppercase tracking-widest">Mes tags</p>
              <div className="space-y-0">

                {/* Tous — toujours visible, sert de toggle */}
                <button
                  onClick={() => {
                    setTagsExpanded(v => !v)
                    onTagFilter('all')
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[12.5px] transition-all text-left ${
                    activeTag === 'all' || !activeTag
                      ? 'bg-white/[0.06] text-white'
                      : 'text-th-sidebar-text-2 hover:text-th-sidebar-text-1 hover:bg-white/[0.03]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                  <span className="flex-1">Tous</span>
                  <span className="text-[10px] text-th-sidebar-text-2 tabular-nums mr-1">{simulations.length}</span>
                  {/* Chevron rotatif */}
                  <svg
                    className="w-3 h-3 shrink-0 text-th-sidebar-text-2 transition-transform duration-250"
                    style={{ transform: tagsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Liste depliable avec animation */}
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: tagsExpanded ? `${(allSidebarTags.length + 1) * 32 + 12}px` : '0px',
                    opacity: tagsExpanded ? 1 : 0,
                    transition: 'max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
                  }}
                >
                  <div className="pt-0.5 space-y-0">
                    {/* Tags (fixes + custom) */}
                    {allSidebarTags.map(t => {
                      const count = simulations.filter(s => (s.tags || []).includes(t.id)).length
                      const isActive = activeTag === t.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => onTagFilter(t.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[12.5px] transition-all text-left ${
                            isActive
                              ? 'bg-white/[0.06] text-white'
                              : 'text-th-sidebar-text-2 hover:text-th-sidebar-text-1 hover:bg-white/[0.03]'
                          }`}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, flexShrink: 0, display: 'inline-block' }} />
                          <span className="flex-1 truncate">{t.label}</span>
                          {count > 0 && <span className="text-[10px] text-th-sidebar-text-2 tabular-nums shrink-0">{count}</span>}
                        </button>
                      )
                    })}

                    {/* Bouton creer un tag */}
                    {onCreateTag && (
                      <button
                        onClick={onCreateTag}
                        className="w-full flex items-center gap-2.5 px-3 py-[6px] rounded-lg text-[12.5px] transition-all text-left text-th-sidebar-text-2 hover:text-th-sidebar-text-2 hover:bg-white/[0.03]"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Nouveau tag...</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simulations recentes — masquees sur bibliotheque */}
          {recentSims.length > 0 && !isBibliotheque && (
            <div className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-semibold text-th-sidebar-text-1 uppercase tracking-widest">Recentes</p>
              <div className="space-y-0.5">
                {recentSims.map((sim) => {
                  const score = sim.score ?? 0
                  const scoreColor = score >= 70 ? 'text-emerald-400' : score >= 45 ? 'text-amber-400' : 'text-red-400'
                  const cfOk = sim.cashflowMensuel >= 0
                  return (
                    <button
                      key={sim.id}
                      onClick={() => router.push('/analyse')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all text-left group"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-400' : 'bg-red-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-th-sidebar-text-1 truncate leading-tight">{sim.name}</p>
                        <p className="text-[10px] text-th-sidebar-text-2 truncate">
                          {sim.ville} {sim.rendementBrut.toFixed(1)}% brut
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[11px] font-bold tabular-nums ${scoreColor}`}>{score}</p>
                        <p className={`text-[10px] tabular-nums ${cfOk ? 'text-emerald-500' : 'text-red-400'}`}>
                          {cfOk ? '+' : ''}{Math.round(sim.cashflowMensuel)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 mt-1 text-[10px] font-semibold text-th-sidebar-text-1 hover:text-white transition-colors"
              >
                Voir toutes les simulations
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {/* Outils Pro */}
          <div>
            <p className="px-3 mb-2 text-[10px] font-semibold text-th-sidebar-text-1 uppercase tracking-widest">Outils Pro</p>
            <div className="space-y-0.5">
              {tools.map((item) => {
                const isActive = pathname === item.href
                const cls = `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                  item.disabled
                    ? 'text-th-sidebar-text-2 opacity-50 cursor-not-allowed'
                    : isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-th-sidebar-text-2 hover:text-white hover:bg-white/[0.04]'
                }`
                if (item.disabled) {
                  return (
                    <button key={item.label} disabled className={cls}>
                      <span className="shrink-0">{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.05] text-th-sidebar-text-2 border border-white/[0.07]">
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
        <div className="p-2 shrink-0 space-y-0.5" style={{ borderTop: '1px solid var(--c-sidebar-border)' }}>
          {/* Theme toggle */}
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold text-th-sidebar-text-1 uppercase tracking-widest">
              {isDark ? 'Mode sombre' : 'Mode clair'}
            </span>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="relative w-9 h-5 rounded-full transition-colors duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              style={{ background: isDark ? '#27272a' : '#50505a' }}
              aria-label="Basculer le thème"
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-250"
                style={{ transform: isDark ? 'translateX(0)' : 'translateX(16px)' }}
              />
            </button>
          </div>
          {user ? (
            <>
              <div className="flex items-center gap-1 px-1 pb-1">
                <NotificationBell simulationCount={simulations.length} isPro={isPro} />
                <p className="text-[10px] text-th-sidebar-text-1 ml-1">Notifications</p>
              </div>
              <Link
                href="/profile"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white uppercase shrink-0">
                  {firstName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight truncate capitalize">{firstName}</p>
                  <p className="text-[10px] text-th-sidebar-text-2 leading-tight truncate group-hover:text-th-sidebar-text-1 transition-colors">Mon profil</p>
                </div>
                <svg className="w-3 h-3 text-th-sidebar-text-2 group-hover:text-th-sidebar-text-2 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-th-sidebar-text-1 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Se deconnecter
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
              Se connecter
            </button>
          )}
        </div>
      </aside>

      {/* Main content — .content-area scope les overrides WCAG couleurs */}
      <div className="content-area lg:pl-56 flex-1 min-h-screen pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  )
}
