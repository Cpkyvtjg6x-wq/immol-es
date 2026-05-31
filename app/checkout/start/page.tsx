'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase'

/**
 * Route de bascule signup → Stripe Checkout.
 *
 * Appelée depuis :
 *   - /auth/signup?redirect=checkout&plan=pro  (après confirmation email)
 *   - directement par la landing si l'utilisateur est déjà connecté
 *
 * Lit `?plan=pro|agency` + `?cycle=monthly|annual` (défaut annual),
 * récupère le bon priceId via les env NEXT_PUBLIC_*, appelle l'API
 * create-checkout-session, et redirige sur la session Stripe.
 *
 * Si l'utilisateur n'est pas connecté, redirige vers /auth/login en
 * conservant l'intention (?redirect=checkout&plan=…&cycle=…).
 */
export default function CheckoutStartPage() {
  // Next.js 14 exige un <Suspense> autour de useSearchParams() pour permettre
  // le prerender statique. On wrap le composant qui le consomme.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      }
    >
      <CheckoutStartInner />
    </Suspense>
  )
}

function CheckoutStartInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('Préparation de votre commande…')

  useEffect(() => {
    const plan = (params.get('plan') ?? 'pro').toLowerCase()
    const cycle = (params.get('cycle') ?? 'annual').toLowerCase()

    if (plan !== 'pro' && plan !== 'agency') {
      setError(`Plan inconnu : ${plan}`)
      return
    }

    const priceMap: Record<string, Record<string, string | undefined>> = {
      pro: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
      },
      agency: {
        monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY,
        annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL,
      },
    }

    const priceId = priceMap[plan]?.[cycle === 'monthly' ? 'monthly' : 'annual']

    if (!priceId) {
      setError(
        `Prix Stripe non configuré pour ${plan} (${cycle}). ` +
          `Vérifiez les variables NEXT_PUBLIC_STRIPE_PRICE_${plan.toUpperCase()}_${cycle === 'monthly' ? 'MONTHLY' : 'ANNUAL'} sur Vercel.`,
      )
      return
    }

    void (async () => {
      try {
        // Vérifie d'abord que l'utilisateur est connecté
        const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setStatus('Redirection vers la connexion…')
          // Conserve l'intention dans l'URL — la page login renverra ici
          const next = `/checkout/start?plan=${plan}&cycle=${cycle}`
          router.replace(`/auth/login?next=${encodeURIComponent(next)}`)
          return
        }

        setStatus('Création de la session de paiement…')
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, planName: plan }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: 'erreur réseau' }))
          throw new Error(data.error ?? 'Erreur création session Stripe')
        }

        const data = await res.json()
        if (!data.url) throw new Error('Réponse Stripe invalide (pas d\'URL)')

        setStatus('Redirection vers Stripe…')
        window.location.href = data.url
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        setError(msg)
      }
    })()
  }, [params, router])

  return (
    <div className="min-h-screen bg-th-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {!error ? (
          <>
            <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto" />
            <h1 className="text-xl font-bold text-th-text-1">{status}</h1>
            <p className="text-sm text-th-text-2">
              Vous allez être redirigé vers la page de paiement sécurisée Stripe dans un instant.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400 text-3xl mx-auto">
              !
            </div>
            <h1 className="text-xl font-bold text-th-text-1">Impossible de lancer le paiement</h1>
            <p className="text-sm text-th-text-2">{error}</p>
            <div className="flex flex-col gap-2">
              <Link
                href="/#pricing"
                className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-3 px-4 rounded-xl text-sm transition-all"
              >
                Voir les offres
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 text-th-text-2 hover:text-th-text-1 text-sm transition-colors"
              >
                Contacter le support
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
