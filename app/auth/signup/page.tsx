'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { BrandLogo } from '@/components/app/BrandLogo'
import { ForceDark } from '@/components/app/ForceDark'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  // Destination post-auth (ex : `/checkout/start?plan=pro&cycle=annual`)
  const [nextPath, setNextPath] = useState<string>('/dashboard')

  // Lit ?next=, ou ?redirect=checkout&plan=&cycle= (compat ancienne Pricing).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const explicitNext = sp.get('next')
    if (explicitNext && explicitNext.startsWith('/')) {
      setNextPath(explicitNext)
      return
    }
    if (sp.get('redirect') === 'checkout') {
      const plan = sp.get('plan') ?? 'pro'
      const cycle = sp.get('cycle') ?? 'annual'
      setNextPath(`/checkout/start?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle)}`)
    }
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      setLoading(false)
      return
    }

    const supabase = createBrowserSupabaseClient()
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        // Si la confirmation email est activée côté Supabase, l'utilisateur
        // arrive sur /auth/callback?next=… puis sur la destination voulue.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // Déclencher l'email de bienvenue (fire & forget)
    fetch('/api/send-welcome-email', { method: 'POST' }).catch(() => null)

    // Si la confirmation email est désactivée, Supabase crée une session immédiate
    // → on saute l'écran "vérifiez votre email" et on file directement à destination.
    if (data?.session) {
      router.push(nextPath)
      return
    }

    setSuccess(true)
  }

  const handleGoogleLogin = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-3xl mx-auto">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-th-text-1">Vérifiez votre email</h2>
          <p className="text-th-text-2">
            Nous avons envoyé un lien de confirmation à <strong className="text-white">{form.email}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Button variant="ghost" onClick={() => router.push('/auth/login')} className="mt-4">
            Retour à la connexion
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
      <ForceDark />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size={34} textSize={22} />
          </Link>
          <h1 className="text-2xl font-bold text-th-text-1 mt-4">Créer votre compte</h1>
          <p className="text-th-text-2 text-sm">
            Gratuit · Pas de carte bancaire
          </p>
          <Badge variant="emerald" className="mt-1">14 jours Pro offerts</Badge>
        </div>

        <div className="rounded-2xl border border-th-border bg-th-surface p-8 space-y-5">
          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-th-text-1 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuer avec Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs text-th-text-3">
              <span className="bg-zinc-900 px-3">ou par email</span>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Nom complet"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Jean Dupont"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="vous@exemple.com"
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Au moins 8 caractères"
              hint="Minimum 8 caractères"
              required
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Créer mon compte gratuit
            </Button>
          </form>

          <p className="text-xs text-th-text-3 text-center">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/cgu" className="underline hover:text-th-text-2">CGU</Link>
            {' '}et notre{' '}
            <Link href="/confidentialite" className="underline hover:text-th-text-2">politique de confidentialité</Link>.
          </p>
        </div>

        <p className="text-center text-sm text-th-text-3">
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
