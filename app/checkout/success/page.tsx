import { redirect } from 'next/navigation'
import Link from 'next/link'
import Stripe from 'stripe'
import { BrandLogo } from '@/components/app/BrandLogo'

/**
 * Page d'atterrissage après un Stripe Checkout réussi.
 *
 * Stripe redirige ici via `success_url` avec `?session_id={CHECKOUT_SESSION_ID}`.
 * On retrouve la session côté serveur pour afficher :
 *  - Le plan acheté (Pro / Agence)
 *  - La date de fin d'essai (subscription.trial_end)
 *  - Un CTA fort vers /analyse + /dashboard
 *
 * Note : on N'attend PAS le webhook ici. Le tier sera mis à jour
 * de façon asynchrone par /api/webhooks/stripe. Si la mise à jour DB
 * traîne, le dashboard affiche le tier précédent quelques secondes.
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; plan?: string }
}) {
  const sessionId = searchParams.session_id
  const planParam = (searchParams.plan ?? 'pro').toLowerCase()

  // Pas de session_id ? On considère que l'utilisateur a atterri ici par hasard.
  if (!sessionId) {
    redirect('/dashboard')
  }

  let session: Stripe.Checkout.Session | null = null
  let subscription: Stripe.Subscription | null = null

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })
    if (session.subscription && typeof session.subscription !== 'string') {
      subscription = session.subscription
    }
  } catch (err) {
    console.error('[Checkout Success] Session retrieve error:', err)
    redirect('/dashboard?checkout=success')
  }

  // Mode safety : si le checkout n'est pas en mode subscription ou pas payé.
  if (!session || session.payment_status === 'unpaid') {
    redirect('/dashboard?checkout=pending')
  }

  const planLabel = planParam === 'agency' ? 'Agence' : 'Pro'
  const isAgency = planParam === 'agency'

  const trialEndDate = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null

  const formattedTrialEnd = trialEndDate
    ? trialEndDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const trialDaysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const customerEmail =
    session.customer_details?.email ??
    (typeof session.customer_email === 'string' ? session.customer_email : null)

  const features = isAgency
    ? [
        'Simulations illimitées',
        'PDF pro & dossier bancaire complet',
        'Rapports white-label (votre logo)',
        'Comparaison illimitée de biens',
        'Analyse IA avancée incluse',
        'Support prioritaire 24h',
      ]
    : [
        'Simulations illimitées',
        'PDF pro & dossier bancaire complet',
        'Analyse IA avancée incluse',
        'Comparaison multi-biens',
        'Patrimoine & suivi des biens détenus',
        'Données marché complètes',
      ]

  return (
    <div className="min-h-screen bg-th-bg relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-emerald-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16 sm:py-24">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandLogo size={34} textSize={22} />
          </Link>
        </div>

        {/* Check icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center space-y-3 mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-th-text-1">
            Bienvenue dans IMMORA{' '}
            <span className="text-emerald-400">{planLabel}</span>
          </h1>
          <p className="text-th-text-2 text-base sm:text-lg max-w-md mx-auto">
            {trialDaysRemaining !== null && trialDaysRemaining > 0 ? (
              <>
                Votre essai gratuit de{' '}
                <strong className="text-th-text-1">{trialDaysRemaining} jours</strong> commence
                maintenant. Première facture le{' '}
                <strong className="text-th-text-1">{formattedTrialEnd}</strong>.
              </>
            ) : (
              <>Votre abonnement {planLabel} est activé. Tout est prêt.</>
            )}
          </p>
          {customerEmail && (
            <p className="text-xs text-th-text-3">
              Reçu envoyé à <span className="text-th-text-2">{customerEmail}</span>
            </p>
          )}
        </div>

        {/* Features unlocked */}
        <div className="rounded-2xl border border-th-border bg-th-surface p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-bold text-th-text-1 uppercase tracking-wide">
              Vos accès débloqués
            </h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-th-text-1">
                <svg
                  className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Link
            href="/analyse"
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-4 px-6 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            Lancer ma 1ʳᵉ simulation
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 flex items-center justify-center gap-2 bg-th-surface2 hover:bg-th-surface3 border border-th-border text-th-text-1 font-semibold py-4 px-6 rounded-xl text-sm transition-all"
          >
            Voir le dashboard
          </Link>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-th-text-3 max-w-md mx-auto">
          {trialDaysRemaining !== null && trialDaysRemaining > 0 ? (
            <>
              Vous pouvez annuler à tout moment avant le {formattedTrialEnd} depuis{' '}
              <Link href="/settings" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Paramètres → Abonnement
              </Link>
              . Aucun prélèvement avant la fin de l&apos;essai.
            </>
          ) : (
            <>
              Vous pouvez gérer ou résilier votre abonnement depuis{' '}
              <Link href="/settings" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Paramètres → Abonnement
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </div>
  )
}
