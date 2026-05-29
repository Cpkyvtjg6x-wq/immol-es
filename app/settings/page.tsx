'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/lib/hooks/useAuth'
import { useSettings } from '@/lib/hooks/useSettings'
import { useTheme } from '@/components/app/ThemeProvider'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { DEFAULT_PARAMS } from '@/lib/calculator'
import {
  CALC_DEFAULT_KEYS,
  type CalculatorDefaults,
  type DefaultAnalysisMode,
  type UserSettings,
} from '@/lib/settings'
import type { InvestmentParams } from '@/lib/types'

// ─── Primitives UI ─────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-th-border bg-th-surface overflow-hidden">
      {children}
    </div>
  )
}

function CardHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="px-6 py-4 border-b border-th-border">
      <h2 className="text-sm font-bold text-th-text-1">{title}</h2>
      {desc && <p className="text-xs text-th-text-2 mt-0.5">{desc}</p>}
    </div>
  )
}

function Field({
  label,
  value,
  type = 'text',
  placeholder,
  onChange,
  disabled,
  hint,
}: {
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange?: (v: string) => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-th-input-bg border border-th-border-med rounded-xl px-4 py-3 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      />
      {hint && <p className="text-[11px] text-th-text-3 mt-1.5">{hint}</p>}
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  step,
  unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  unit?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          step={step ?? 1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-th-input-bg border border-th-border-med rounded-xl px-4 py-2.5 pr-12 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50 transition-colors tabular-nums"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-th-text-3">
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-th-text-2 uppercase tracking-wider mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-th-input-bg border border-th-border-med rounded-xl px-4 py-2.5 text-sm text-th-text-1 focus:outline-none focus:border-emerald-500/50 transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-th-text-1">{label}</p>
        {desc && <p className="text-xs text-th-text-2 mt-0.5">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-10 h-6 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
        style={{ background: checked ? '#10b981' : 'var(--c-border-med, #3f3f46)' }}
        aria-label={label}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all"
    >
      {children}
    </button>
  )
}

// ─── Métadonnées des champs calculateur ──────────────────────────────────────

const TMI_OPTIONS = [
  { value: 0, label: '0 % — non imposable' },
  { value: 11, label: '11 %' },
  { value: 30, label: '30 %' },
  { value: 41, label: '41 %' },
  { value: 45, label: '45 %' },
]

const STRUCTURE_OPTIONS: { value: InvestmentParams['structure']; label: string }[] = [
  { value: 'nom-propre', label: 'Nom propre' },
  { value: 'sci-ir', label: 'SCI à l’IR' },
  { value: 'sci-is', label: 'SCI à l’IS' },
  { value: 'sarl-famille', label: 'SARL de famille' },
]

const LOCTYPE_OPTIONS: { value: InvestmentParams['locType']; label: string }[] = [
  { value: 'nu', label: 'Location nue' },
  { value: 'meuble', label: 'Meublé (LMNP)' },
  { value: 'coloc', label: 'Colocation' },
  { value: 'saisonnier', label: 'Saisonnier (Airbnb)' },
  { value: 'immeuble', label: 'Immeuble de rapport' },
]

const LOANTYPE_OPTIONS: { value: InvestmentParams['loanType']; label: string }[] = [
  { value: 'amortissable', label: 'Amortissable' },
  { value: 'in-fine', label: 'In fine' },
]

const TIER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: 'Gratuit', color: '#71717a', bg: 'rgba(113,113,122,0.1)' },
  pro: { label: 'Pro', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  business: { label: 'Agence', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
}

type SectionId =
  | 'compte'
  | 'securite'
  | 'preferences'
  | 'calculateur'
  | 'facturation'
  | 'danger'

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'compte',
    label: 'Compte',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: 'securite',
    label: 'Sécurité',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: 'preferences',
    label: 'Préférences',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
  {
    id: 'calculateur',
    label: 'Calculateur',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m-6 4h6m-6 4h3m-7 5h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'facturation',
    label: 'Abonnement',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'danger',
    label: 'Zone dangereuse',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
      </svg>
    ),
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading: authLoading, tier } = useAuth()
  const { settings, loading: settingsLoading, save } = useSettings()
  const { theme, setTheme } = useTheme()
  const toast = useToast()

  const [section, setSection] = useState<SectionId>('compte')

  // Compte
  const [displayName, setDisplayName] = useState('')
  const [savingName, setSavingName] = useState(false)
  // Sécurité
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  // Facturation
  const [portalLoading, setPortalLoading] = useState(false)

  // Préférences (état local)
  const [defaultMode, setDefaultMode] = useState<DefaultAnalysisMode>('express')
  const [confirmLeave, setConfirmLeave] = useState(true)
  // Calculateur (état local — base DEFAULT_PARAMS écrasée par les défauts perso)
  const [calc, setCalc] = useState<InvestmentParams>(DEFAULT_PARAMS)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [savingCalc, setSavingCalc] = useState(false)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  // Hydrate display name
  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || '')
    }
  }, [user])

  // Hash deep-link (#calculateur, etc.)
  useEffect(() => {
    const h = (typeof window !== 'undefined' ? window.location.hash.slice(1) : '') as SectionId
    if (SECTIONS.some((s) => s.id === h)) setSection(h)
  }, [])

  // Hydrate préférences + calc depuis settings
  useEffect(() => {
    if (settingsLoading) return
    setDefaultMode(settings.preferences.defaultAnalysisMode ?? 'express')
    setConfirmLeave(settings.preferences.confirmBeforeLeave ?? true)
    setCalc({ ...DEFAULT_PARAMS, ...settings.calculatorDefaults })
  }, [settingsLoading, settings])

  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.free
  const firstName = displayName?.split(' ')[0] || user?.email?.split('@')[0] || '?'

  // Diff calc vs DEFAULT_PARAMS → ne stocke que ce qui diffère
  const customCount = useMemo(() => {
    let n = 0
    for (const k of CALC_DEFAULT_KEYS) {
      if (calc[k] !== DEFAULT_PARAMS[k]) n++
    }
    return n
  }, [calc])

  async function saveName() {
    if (!user) return
    setSavingName(true)
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName } })
    if (error) toast.error(error.message)
    else toast.success('Profil mis à jour ✓')
    setSavingName(false)
  }

  async function changePassword() {
    if (!pwForm.next || !pwForm.confirm) {
      toast.warning('Veuillez remplir tous les champs.')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (pwForm.next.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    setPwLoading(true)
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) toast.error(error.message)
    else {
      toast.success('Mot de passe mis à jour ✓')
      setPwForm({ next: '', confirm: '' })
    }
    setPwLoading(false)
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || 'Impossible d’ouvrir le portail de facturation.')
    } catch {
      toast.error('Erreur réseau. Veuillez réessayer.')
    }
    setPortalLoading(false)
  }

  async function savePreferences() {
    setSavingPrefs(true)
    const next: UserSettings = {
      ...settings,
      preferences: {
        defaultAnalysisMode: defaultMode,
        confirmBeforeLeave: confirmLeave,
      },
    }
    const { error } = await save(next)
    if (error) toast.error(error)
    else toast.success('Préférences enregistrées ✓')
    setSavingPrefs(false)
  }

  async function saveCalc() {
    setSavingCalc(true)
    const defaults: CalculatorDefaults = {}
    for (const k of CALC_DEFAULT_KEYS) {
      if (calc[k] !== DEFAULT_PARAMS[k]) {
        ;(defaults as Record<string, unknown>)[k] = calc[k]
      }
    }
    const next: UserSettings = { ...settings, calculatorDefaults: defaults }
    const { error } = await save(next)
    if (error) toast.error(error)
    else toast.success('Valeurs par défaut enregistrées ✓')
    setSavingCalc(false)
  }

  function resetCalc() {
    setCalc(DEFAULT_PARAMS)
    toast.info('Valeurs réinitialisées — pensez à enregistrer.')
  }

  const setCalcField = <K extends keyof InvestmentParams>(k: K, v: InvestmentParams[K]) =>
    setCalc((prev) => ({ ...prev, [k]: v }))

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border border-th-border-med rounded-full" />
          <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-th-bg">
        {/* Top bar */}
        <div className="border-b border-th-border px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-th-text-3 uppercase tracking-widest mb-0.5">
              Paramètres
            </p>
            <h1 className="text-xl font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
              Réglages
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-th-text-2 hover:text-th-text-1 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour au dashboard
          </Link>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
          {/* Nav latérale */}
          <nav className="md:w-56 shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:sticky md:top-6">
              {SECTIONS.map((s) => {
                const active = section === s.id
                const isDanger = s.id === 'danger'
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSection(s.id)
                      if (typeof window !== 'undefined') {
                        history.replaceState(null, '', `#${s.id}`)
                      }
                    }}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-left ${
                      active
                        ? isDanger
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-th-surface2 text-th-text-1'
                        : isDanger
                          ? 'text-red-500/80 hover:text-red-400 hover:bg-red-500/[0.06]'
                          : 'text-th-text-2 hover:text-th-text-1 hover:bg-th-surface2'
                    }`}
                  >
                    <span className="shrink-0">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Contenu */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* ── Compte ── */}
            {section === 'compte' && (
              <>
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-black text-white uppercase shrink-0">
                    {firstName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-black text-th-text-1" style={{ letterSpacing: '-0.03em' }}>
                      {displayName || user.email}
                    </p>
                    <p className="text-sm text-th-text-2">{user.email}</p>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mt-2"
                      style={{ color: tierInfo.color, background: tierInfo.bg }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierInfo.color }} />
                      Plan {tierInfo.label}
                    </span>
                  </div>
                </div>

                <Card>
                  <CardHead title="Informations personnelles" />
                  <div className="p-6 space-y-4">
                    <Field label="Nom complet" value={displayName} onChange={setDisplayName} placeholder="Jean Dupont" />
                    <Field
                      label="Adresse e-mail"
                      value={user.email ?? ''}
                      disabled
                      hint="Pour modifier votre adresse e-mail, contactez le support."
                    />
                    <PrimaryBtn onClick={saveName} disabled={savingName}>
                      {savingName ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
                    </PrimaryBtn>
                  </div>
                </Card>
              </>
            )}

            {/* ── Sécurité ── */}
            {section === 'securite' && (
              <Card>
                <CardHead title="Changer le mot de passe" desc="Au moins 8 caractères." />
                <div className="p-6 space-y-4">
                  <Field
                    label="Nouveau mot de passe"
                    value={pwForm.next}
                    type="password"
                    placeholder="8 caractères minimum"
                    onChange={(v) => setPwForm((f) => ({ ...f, next: v }))}
                  />
                  <Field
                    label="Confirmer le mot de passe"
                    value={pwForm.confirm}
                    type="password"
                    placeholder="Répétez le nouveau mot de passe"
                    onChange={(v) => setPwForm((f) => ({ ...f, confirm: v }))}
                  />
                  <button
                    onClick={changePassword}
                    disabled={pwLoading || !pwForm.next}
                    className="w-full bg-th-surface2 hover:bg-th-surface3 border border-th-border text-th-text-1 font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-40"
                  >
                    {pwLoading ? 'Mise à jour…' : 'Changer le mot de passe'}
                  </button>
                </div>
              </Card>
            )}

            {/* ── Préférences ── */}
            {section === 'preferences' && (
              <>
                <Card>
                  <CardHead title="Apparence" />
                  <div className="p-6">
                    <Toggle
                      label="Mode sombre"
                      desc="Bascule l’interface entre thème clair et sombre."
                      checked={theme === 'dark'}
                      onChange={(v) => setTheme(v ? 'dark' : 'light')}
                    />
                  </div>
                </Card>

                <Card>
                  <CardHead title="Analyse" desc="Comportement de l’écran d’analyse." />
                  <div className="p-6 space-y-5">
                    <SelectField<DefaultAnalysisMode>
                      label="Mode d’analyse par défaut"
                      value={defaultMode}
                      onChange={setDefaultMode}
                      options={[
                        { value: 'express', label: 'Express — saisie rapide' },
                        { value: 'expert', label: 'Expert — tous les paramètres' },
                      ]}
                    />
                    <Toggle
                      label="Confirmer avant de quitter"
                      desc="Demander confirmation si une analyse non sauvegardée est en cours."
                      checked={confirmLeave}
                      onChange={setConfirmLeave}
                    />
                    <PrimaryBtn onClick={savePreferences} disabled={savingPrefs}>
                      {savingPrefs ? 'Enregistrement…' : 'Enregistrer les préférences'}
                    </PrimaryBtn>
                  </div>
                </Card>
              </>
            )}

            {/* ── Calculateur ── */}
            {section === 'calculateur' && (
              <>
                <Card>
                  <CardHead
                    title="Valeurs par défaut du calculateur"
                    desc="Ces valeurs pré-remplissent chaque nouvelle analyse. Vous pouvez toujours les modifier ensuite, bien par bien."
                  />
                  <div className="p-6 space-y-7">
                    {/* Financement */}
                    <div>
                      <p className="text-[11px] font-bold text-th-text-3 uppercase tracking-widest mb-3">
                        Financement
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <NumField label="Taux du prêt" unit="%" step={0.01} value={calc.taux} onChange={(v) => setCalcField('taux', v)} />
                        <NumField label="Durée du prêt" unit="ans" value={calc.duree} onChange={(v) => setCalcField('duree', v)} />
                        <NumField label="Assurance emprunteur" unit="%" step={0.01} value={calc.assuranceTaux} onChange={(v) => setCalcField('assuranceTaux', v)} />
                        <SelectField<InvestmentParams['loanType']>
                          label="Type de prêt"
                          value={calc.loanType}
                          options={LOANTYPE_OPTIONS}
                          onChange={(v) => setCalcField('loanType', v)}
                        />
                        <NumField label="Frais de garantie" unit="%" step={0.1} value={calc.fraisGarantiePct} onChange={(v) => setCalcField('fraisGarantiePct', v)} />
                        <NumField label="Frais de dossier" unit="€" value={calc.fraisDossier} onChange={(v) => setCalcField('fraisDossier', v)} />
                      </div>
                      <div className="mt-4">
                        <Toggle
                          label="Frais de notaire automatiques"
                          desc="Calcule les frais de notaire selon le prix et le type de bien."
                          checked={calc.fraisNotaireAuto}
                          onChange={(v) => setCalcField('fraisNotaireAuto', v)}
                        />
                      </div>
                    </div>

                    {/* Location & charges */}
                    <div>
                      <p className="text-[11px] font-bold text-th-text-3 uppercase tracking-widest mb-3">
                        Location & charges
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField<InvestmentParams['locType']>
                          label="Type de location"
                          value={calc.locType}
                          options={LOCTYPE_OPTIONS}
                          onChange={(v) => setCalcField('locType', v)}
                        />
                        <NumField label="Vacance locative" unit="mois/an" step={0.5} value={calc.vacance} onChange={(v) => setCalcField('vacance', v)} />
                        <NumField label="Frais de gestion" unit="%" step={0.5} value={calc.fraisGestionPct} onChange={(v) => setCalcField('fraisGestionPct', v)} />
                        <NumField label="Provision travaux" unit="%" step={0.5} value={calc.provisionPct} onChange={(v) => setCalcField('provisionPct', v)} />
                        <NumField label="Assurance loyers (GLI)" unit="%" step={0.1} value={calc.gliPct} onChange={(v) => setCalcField('gliPct', v)} />
                        <NumField label="Revalorisation loyer (IRL)" unit="%/an" step={0.1} value={calc.irl} onChange={(v) => setCalcField('irl', v)} />
                      </div>
                    </div>

                    {/* Fiscalité & projection */}
                    <div>
                      <p className="text-[11px] font-bold text-th-text-3 uppercase tracking-widest mb-3">
                        Fiscalité & projection
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField<string>
                          label="TMI (tranche d’imposition)"
                          value={String(calc.tmi)}
                          options={TMI_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
                          onChange={(v) => setCalcField('tmi', parseInt(v, 10))}
                        />
                        <SelectField<InvestmentParams['structure']>
                          label="Structure juridique"
                          value={calc.structure}
                          options={STRUCTURE_OPTIONS}
                          onChange={(v) => setCalcField('structure', v)}
                        />
                        <NumField label="Valorisation annuelle du bien" unit="%/an" step={0.1} value={calc.valorisationAnnuelle} onChange={(v) => setCalcField('valorisationAnnuelle', v)} />
                        <NumField label="Horizon de revente" unit="ans" value={calc.horizonRevente} onChange={(v) => setCalcField('horizonRevente', v)} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={resetCalc}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-th-text-2 hover:text-th-text-1 bg-th-surface2 hover:bg-th-surface3 border border-th-border transition-all"
                      >
                        Réinitialiser
                      </button>
                      <button
                        onClick={saveCalc}
                        disabled={savingCalc}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-2.5 rounded-xl text-sm transition-all"
                      >
                        {savingCalc
                          ? 'Enregistrement…'
                          : customCount > 0
                            ? `Enregistrer (${customCount} personnalisé${customCount > 1 ? 's' : ''})`
                            : 'Enregistrer'}
                      </button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ── Abonnement ── */}
            {section === 'facturation' && (
              <Card>
                <CardHead title="Abonnement & facturation" />
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-th-surface2 border border-th-border">
                    <div>
                      <p className="text-sm font-bold text-th-text-1">Plan {tierInfo.label}</p>
                      <p className="text-xs text-th-text-2 mt-0.5">
                        {tier === 'free'
                          ? '3 simulations · Fonctionnalités de base'
                          : tier === 'pro'
                            ? 'Simulations illimitées · PDF pro · Dossier bancaire'
                            : '5 utilisateurs · White-label · API access'}
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ color: tierInfo.color, background: tierInfo.bg }}
                    >
                      {tierInfo.label}
                    </span>
                  </div>

                  {tier === 'free' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-th-text-2">
                        Passez à Pro pour débloquer les exports PDF, le dossier bancaire et les simulations illimitées.
                      </p>
                      <Link
                        href="/#pricing"
                        className="flex items-center justify-center gap-2 w-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 font-semibold py-3 rounded-xl text-sm transition-all"
                      >
                        Passer à Pro — 19€/mois
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-th-text-2">
                        Gérez vos informations de paiement, consultez vos factures ou annulez votre abonnement depuis le portail Stripe.
                      </p>
                      <button
                        onClick={openBillingPortal}
                        disabled={portalLoading}
                        className="w-full flex items-center justify-center gap-2 bg-th-surface2 hover:bg-th-surface3 border border-th-border text-th-text-1 font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
                      >
                        {portalLoading ? 'Redirection…' : 'Gérer mon abonnement'}
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ── Zone dangereuse ── */}
            {section === 'danger' && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
                <h2 className="text-sm font-bold text-red-400 mb-2">Supprimer mon compte</h2>
                <p className="text-xs text-th-text-2 mb-4">
                  La suppression de votre compte est définitive. Toutes vos simulations et données seront effacées.
                </p>
                <button
                  className="text-xs font-semibold text-red-500 hover:text-red-400 underline transition-colors"
                  onClick={() => {
                    if (confirm('Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.')) {
                      toast.info('Pour supprimer votre compte, contactez support@immora.fr')
                    }
                  }}
                >
                  Supprimer mon compte
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
