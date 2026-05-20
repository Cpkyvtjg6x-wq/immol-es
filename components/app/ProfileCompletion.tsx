'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  id: string
  label: string
  done: boolean
  href?: string
  icon: React.ReactNode
}

interface ProfileCompletionProps {
  hasName: boolean
  hasEmail: boolean
  simulationCount: number
  isPro: boolean
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ label, icon, unlocked, description }: {
  label: string
  icon: string
  unlocked: boolean
  description: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative flex flex-col items-center gap-1.5 cursor-default"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div className={`
        w-10 h-10 rounded-xl flex items-center justify-center text-xl
        border transition-all duration-300
        ${unlocked
          ? 'border-emerald-500/30 bg-emerald-500/10 scale-100 opacity-100'
          : 'border-white/[0.06] bg-white/[0.02] opacity-30 grayscale'
        }
      `}>
        {icon}
      </div>
      <p className={`text-[9px] font-semibold uppercase tracking-wider text-center leading-tight ${
        unlocked ? 'text-zinc-300' : 'text-zinc-600'
      }`}>
        {label}
      </p>

      {/* Tooltip */}
      {show && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-36 bg-[#1c1c1f] border border-white/[0.1] rounded-xl px-3 py-2.5 shadow-2xl pointer-events-none">
          <p className="text-[11px] font-semibold text-white mb-0.5">{label}</p>
          <p className="text-[10px] text-zinc-500 leading-snug">{description}</p>
          {!unlocked && (
            <p className="text-[10px] text-zinc-600 mt-1 italic">Non débloqué</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileCompletion({ hasName, hasEmail, simulationCount, isPro }: ProfileCompletionProps) {
  const steps: Step[] = [
    {
      id: 'email',
      label: 'Compte créé',
      done: hasEmail,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
        </svg>
      ),
    },
    {
      id: 'name',
      label: 'Nom renseigné',
      done: hasName,
      href: '/profile',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      id: 'simulation',
      label: '1re simulation',
      done: simulationCount >= 1,
      href: '/analyse',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'pro',
      label: 'Plan Pro',
      done: isPro,
      href: '/#pricing',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)
  const isComplete = doneCount === steps.length

  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  const badges = [
    { id: 'first_sim', label: '1ère analyse', icon: '🏠', unlocked: simulationCount >= 1, description: 'Lancez votre première simulation immobilière.' },
    { id: 'five_sims', label: 'Explorateur', icon: '🔍', unlocked: simulationCount >= 5, description: 'Analysez 5 biens différents.' },
    { id: 'pro_user', label: 'Pro', icon: '⭐', unlocked: isPro, description: 'Passez au plan Pro pour débloquer toutes les fonctionnalités.' },
    { id: 'portfolio', label: 'Portefeuille', icon: '💼', unlocked: simulationCount >= 3, description: 'Constituez un portefeuille de 3 biens ou plus.' },
    { id: 'optimizer', label: 'Optimiseur', icon: '🎯', unlocked: simulationCount >= 10, description: 'Analysez 10 biens — vous êtes un investisseur sérieux.' },
  ]

  if (isComplete) return null // Ne plus afficher une fois terminé

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Complétez votre profil
          </p>
          <p className="text-sm font-bold text-white mt-0.5">
            {doneCount}/{steps.length} étapes — {pct}%
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black tabular-nums"
          style={{
            background: `conic-gradient(#10b981 ${animPct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
            transition: 'background 0.8s ease',
          }}
        >
          <div className="w-8 h-8 rounded-full bg-[#09090b] flex items-center justify-center">
            <span className="text-[10px] font-black text-emerald-400">{pct}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000 ease-out"
          style={{ width: `${animPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {steps.map(step => {
          const inner = (
            <div className={`
              flex items-center gap-2.5 p-2.5 rounded-lg border transition-all
              ${step.done
                ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                : step.href
                ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] cursor-pointer'
                : 'border-white/[0.06] bg-white/[0.02]'
              }
            `}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all ${
                step.done
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-white/[0.04] text-zinc-600'
              }`}>
                {step.done ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.icon}
              </div>
              <p className={`text-[11px] font-semibold leading-tight ${
                step.done ? 'text-emerald-400' : 'text-zinc-500'
              }`}>
                {step.label}
              </p>
            </div>
          )

          return step.href && !step.done ? (
            <Link key={step.id} href={step.href}>{inner}</Link>
          ) : (
            <div key={step.id}>{inner}</div>
          )
        })}
      </div>

      {/* Badges */}
      <div className="pt-2 border-t border-white/[0.05]">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">Badges</p>
        <div className="flex items-center gap-4 flex-wrap">
          {badges.map(b => (
            <Badge key={b.id} label={b.label} icon={b.icon} unlocked={b.unlocked} description={b.description} />
          ))}
        </div>
      </div>
    </div>
  )
}
