'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/lib/hooks/useAuth'
import { createBrowserSupabaseClient } from '@/lib/supabase'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.05]">
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
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
}: {
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange?: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  )
}

const TIER_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  free: { label: 'Gratuit', color: '#71717a', bg: 'rgba(113,113,122,0.1)' },
  pro: { label: 'Pro', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  business: { label: 'Agence', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading, tier, isPro } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      setDisplayName(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        ''
      )
    }
  }, [user])

  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.free
  const firstName = displayName?.split(' ')[0] || user?.email?.split('@')[0] || '?'

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    setSaveMsg(null)
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    })
    if (error) {
      setSaveMsg({ type: 'err', text: error.message })
    } else {
      setSaveMsg({ type: 'ok', text: 'Profil mis à jour ✓' })
      setTimeout(() => setSaveMsg(null), 3000)
    }
    setSaving(false)
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Impossible d\'ouvrir le portail de facturation.')
      }
    } catch {
      alert('Erreur réseau. Veuillez réessayer.')
    }
    setPortalLoading(false)
  }

  async function changePassword() {
    if (!pwForm.next || !pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Veuillez remplir tous les champs.' })
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: 'err', text: 'Le mot de passe doit faire au moins 8 caractères.' })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
    } else {
      setPwMsg({ type: 'ok', text: 'Mot de passe mis à jour ✓' })
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwMsg(null), 3000)
    }
    setPwLoading(false)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="w-8 h-8 border border-white/[0.08] rounded-full" />
          <div className="absolute inset-0 border-t border-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#09090b]">

        {/* ── Top bar ── */}
        <div className="border-b border-white/[0.05] px-8 py-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-0.5">
              Paramètres
            </p>
            <h1 className="text-xl font-black text-white" style={{ letterSpacing: '-0.03em' }}>
              Mon profil
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Retour au dashboard
          </Link>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

          {/* ── Avatar + plan ── */}
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-black text-white uppercase shrink-0">
              {firstName.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-black text-white" style={{ letterSpacing: '-0.03em' }}>
                {displayName || user.email}
              </p>
              <p className="text-sm text-zinc-500">{user.email}</p>
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mt-2"
                style={{ color: tierInfo.color, background: tierInfo.bg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: tierInfo.color }} />
                Plan {tierInfo.label}
              </span>
            </div>
          </div>

          {/* ── Infos personnelles ── */}
          <Section title="Informations personnelles">
            <div className="space-y-4">
              <Field
                label="Nom complet"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Jean Dupont"
              />
              <Field
                label="Adresse e-mail"
                value={user.email ?? ''}
                disabled
              />
              <p className="text-xs text-zinc-600">
                Pour modifier votre adresse e-mail, contactez le support.
              </p>
              {saveMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  saveMsg.type === 'ok'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {saveMsg.text}
                </div>
              )}
              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder les modifications'}
              </button>
            </div>
          </Section>

          {/* ── Abonnement ── */}
          <Section title="Abonnement">
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm font-bold text-white">Plan {tierInfo.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
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
                  <p className="text-xs text-zinc-500">
                    Passez à Pro pour débloquer les exports PDF, le dossier bancaire et les simulations illimitées.
                  </p>
                  <Link
                    href="/#pricing"
                    className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all"
                  >
                    Passer à Pro — 19€/mois
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Gérez vos informations de paiement, consultez vos factures ou annulez votre abonnement depuis le portail de facturation Stripe.
                  </p>
                  <button
                    onClick={openBillingPortal}
                    disabled={portalLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    )}
                    {portalLoading ? 'Redirection…' : 'Gérer mon abonnement'}
                  </button>
                </div>
              )}
            </div>
          </Section>

          {/* ── Sécurité ── */}
          <Section title="Sécurité — Changer le mot de passe">
            <div className="space-y-4">
              <Field
                label="Nouveau mot de passe"
                value={pwForm.next}
                type="password"
                placeholder="8 caractères minimum"
                onChange={v => setPwForm(f => ({ ...f, next: v }))}
              />
              <Field
                label="Confirmer le mot de passe"
                value={pwForm.confirm}
                type="password"
                placeholder="Répétez le nouveau mot de passe"
                onChange={v => setPwForm(f => ({ ...f, confirm: v }))}
              />
              {pwMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  pwMsg.type === 'ok'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {pwMsg.text}
                </div>
              )}
              <button
                onClick={changePassword}
                disabled={pwLoading || !pwForm.next}
                className="w-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-white font-semibold py-3 rounded-xl text-sm transition-all disabled:opacity-40"
              >
                {pwLoading ? 'Mise à jour…' : 'Changer le mot de passe'}
              </button>
            </div>
          </Section>

          {/* ── Danger zone ── */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
            <h2 className="text-sm font-bold text-red-400 mb-2">Zone dangereuse</h2>
            <p className="text-xs text-zinc-500 mb-4">
              La suppression de votre compte est définitive. Toutes vos simulations et données seront effacées.
            </p>
            <button
              className="text-xs font-semibold text-red-500 hover:text-red-400 underline transition-colors"
              onClick={() => {
                if (confirm('Voulez-vous vraiment supprimer votre compte ? Cette action est irréversible.')) {
                  alert('Pour supprimer votre compte, contactez support@immora.fr')
                }
              }}
            >
              Supprimer mon compte
            </button>
          </div>

        </div>
      </div>
    </AppShell>
  )
}
