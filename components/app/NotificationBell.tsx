'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string
  type: 'info' | 'warning' | 'success' | 'tip'
  title: string
  body: string
  cta?: { label: string; href: string }
  time: string
  read: boolean
}

interface NotificationBellProps {
  simulationCount: number
  isPro: boolean
  isTrial?: boolean
  trialDaysLeft?: number
  /**
   * Où le panneau s'ouvre par rapport à la cloche.
   * - `top-right` (défaut) : au-dessus, ancré à droite → s'étend vers la gauche
   *   (usage : topbar mobile, header centré)
   * - `top-left` : au-dessus, ancré à gauche → s'étend vers la droite
   *   (usage : sidebar gauche — évite que le panneau sorte de l'écran)
   * - `right-side` : à droite de la cloche, ouvert sur le côté
   *   (usage : sidebar pinnée si bell tout en bas)
   */
  placement?: 'top-right' | 'top-left' | 'right-side'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  info: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  success: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  tip: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
}

const TYPE_COLORS = {
  info:    { icon: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
  warning: { icon: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  success: { icon: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  tip:     { icon: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell({ simulationCount, isPro, isTrial, trialDaysLeft, placement = 'top-right' }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  // Charger les IDs lus depuis localStorage après le mount (évite erreur hydratation SSR)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('immora_notif_read')
      if (stored) setReadIds(new Set(JSON.parse(stored) as string[]))
    } catch { /* noop */ }
  }, [])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Generate contextual notifications
  const notifications: Notification[] = []

  if (isTrial && trialDaysLeft !== undefined && trialDaysLeft <= 3) {
    notifications.push({
      id: 'trial_expiring',
      type: 'warning',
      title: 'Essai Pro — encore ' + trialDaysLeft + ' jour' + (trialDaysLeft > 1 ? 's' : ''),
      body: 'Votre période d\'essai se termine bientôt. Abonnez-vous pour conserver l\'accès Pro.',
      cta: { label: 'Voir les offres', href: '/#pricing' },
      time: 'Aujourd\'hui',
      read: readIds.has('trial_expiring'),
    })
  }

  if (simulationCount === 0) {
    notifications.push({
      id: 'first_sim',
      type: 'tip',
      title: 'Analysez votre premier bien',
      body: 'Entrez l\'adresse et les paramètres d\'un bien pour obtenir en 30 secondes : rendement, cashflow et score IA.',
      cta: { label: 'Lancer l\'analyse', href: '/analyse' },
      time: 'Nouveau',
      read: readIds.has('first_sim'),
    })
  }

  if (simulationCount >= 1 && simulationCount < 3 && !isPro) {
    notifications.push({
      id: 'limit_warning',
      type: 'info',
      title: `${simulationCount}/3 simulations utilisées`,
      body: 'En plan gratuit, vous pouvez sauvegarder 3 simulations. Passez Pro pour un accès illimité.',
      cta: { label: 'Passer Pro', href: '/#pricing' },
      time: 'Info',
      read: readIds.has('limit_warning'),
    })
  }

  if (simulationCount >= 1) {
    notifications.push({
      id: 'tip_revente',
      type: 'tip',
      title: 'Conseil : fiscalité de la revente',
      body: 'Utilisez le simulateur de revente pour estimer la plus-value nette après abattement fiscal selon la durée de détention.',
      cta: { label: 'Simuler la revente', href: '/revente' },
      time: 'Conseil',
      read: readIds.has('tip_revente'),
    })
  }

  if (!isPro) {
    notifications.push({
      id: 'dossier_pro',
      type: 'tip',
      title: 'Générez un dossier bancaire pro',
      body: 'Avec le plan Pro, exportez un PDF complet pour votre banquier : ratios d\'endettement, capacité d\'emprunt, taux d\'effort.',
      cta: { label: 'Découvrir Pro', href: '/#pricing' },
      time: 'Fonctionnalité',
      read: readIds.has('dossier_pro'),
    })
  }

  if (simulationCount >= 3) {
    notifications.push({
      id: 'compare_tip',
      type: 'success',
      title: 'Comparez vos meilleures opportunités',
      body: 'Vous avez plusieurs simulations — utilisez le comparateur pour mettre 2 ou 3 biens côte à côte.',
      cta: { label: 'Comparer', href: '/comparer' },
      time: 'Conseil',
      read: readIds.has('compare_tip'),
    })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  function markAllRead() {
    const newSet = new Set(Array.from(readIds).concat(notifications.map(n => n.id)))
    setReadIds(newSet)
    try {
      localStorage.setItem('immora_notif_read', JSON.stringify(Array.from(newSet)))
    } catch { /* noop */ }
  }

  function markRead(id: string) {
    const newSet = new Set(Array.from(readIds).concat(id))
    setReadIds(newSet)
    try {
      localStorage.setItem('immora_notif_read', JSON.stringify(Array.from(newSet)))
    } catch { /* noop */ }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead() }}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-th-text-2 hover:text-th-text-1 hover:bg-th-surface2 transition-all"
        title="Notifications"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-th-text-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — position calculée selon `placement` */}
      {open && (
        <div className={`absolute w-80 rounded-2xl border border-th-border-med bg-th-surface shadow-2xl z-50 overflow-hidden ${
          placement === 'top-left'
            // Au-dessus, ancré à gauche → ouvre vers la droite (sidebar)
            ? 'bottom-full mb-2 left-0'
            : placement === 'right-side'
              // À droite de la cloche, ouvre sur le côté (sidebar — alternative)
              ? 'bottom-0 left-full ml-2'
              // Défaut : mobile centré, lg ancré à droite
              : 'bottom-full mb-2 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:right-0'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-th-border">
            <p className="text-sm font-bold text-th-text-1">Notifications</p>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-semibold text-th-text-2 hover:text-th-text-1 transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-th-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-th-surface2 border border-th-border flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-th-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm text-th-text-2">Aucune notification</p>
                <p className="text-xs text-th-text-3 mt-1">Tout est à jour !</p>
              </div>
            ) : (
              notifications.map(notif => {
                const colors = TYPE_COLORS[notif.type]
                return (
                  <div
                    key={notif.id}
                    className={`px-4 py-3.5 transition-colors ${
                      !notif.read ? 'bg-th-surface' : ''
                    }`}
                    onClick={() => markRead(notif.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${colors.bg} ${colors.border} ${colors.icon}`}>
                        {TYPE_ICONS[notif.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[12px] font-bold text-th-text-1 leading-snug flex-1">{notif.title}</p>
                          {!notif.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-th-text-2 leading-relaxed">{notif.body}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-th-text-3">{notif.time}</span>
                          {notif.cta && (
                            <Link
                              href={notif.cta.href}
                              onClick={() => { markRead(notif.id); setOpen(false) }}
                              className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${colors.bg} ${colors.icon} border ${colors.border} hover:opacity-80`}
                            >
                              {notif.cta.label} →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
