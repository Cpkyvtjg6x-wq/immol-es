'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createBrowserSupabaseClient()
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
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
            <span className="text-white font-bold text-xl">IMMORA</span>
          </Link>
          <h1 className="text-2xl font-bold text-th-text-1 mt-4">Mot de passe oublié</h1>
          <p className="text-th-text-2 text-sm">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="rounded-2xl border border-th-border bg-th-surface p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Email envoyé !</p>
                <p className="text-th-text-2 text-sm">
                  Vérifiez votre boîte mail à <strong className="text-white">{email}</strong>.
                  Le lien expire dans 1 heure.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors mt-2"
              >
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-th-text-1 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full bg-th-surface2 border border-th-border-med rounded-xl px-4 py-3 text-sm text-th-text-1 placeholder:text-th-text-3 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl text-sm transition-all"
              >
                {loading ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-th-text-3">
          Vous vous souvenez ?{' '}
          <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
