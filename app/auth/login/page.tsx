'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createBrowserSupabaseClient } from '@/lib/supabase'

// ── Sous-composant isolé pour useSearchParams (requis par Next.js 14) ─────────
// useSearchParams() doit être dans un <Suspense> — on l'isole ici.
function OAuthErrorBanner({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('error') === 'oauth_failed') {
      onError('La connexion Google a échoué. Réessayez ou utilisez email + mot de passe.')
    }
  }, [searchParams, onError])
  return null
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createBrowserSupabaseClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleGoogleLogin = async () => {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Pointe sur /auth/callback pour l'échange PKCE côté serveur (Safari)
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
      {/* Lit ?error= dans l'URL sans bloquer le prerender */}
      <Suspense fallback={null}>
        <OAuthErrorBanner onError={setError} />
      </Suspense>

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl">IMMO<span className="text-emerald-400">RA</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-th-text-1 mt-4">Bon retour</h1>
          <p className="text-th-text-2 text-sm">Connectez-vous pour accéder à vos simulations</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-th-border bg-th-surface p-8 space-y-5">
          {/* Google login */}
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
              <span className="bg-th-bg px-3">ou</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              required
            />
            <div>
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="mt-1.5 text-right">
                <Link href="/auth/reset" className="text-xs text-th-text-2 hover:text-white transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Se connecter
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-th-text-3">
          Pas encore de compte ?{' '}
          <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Créer un compte gratuit
          </Link>
        </p>
      </div>
    </div>
  )
}
