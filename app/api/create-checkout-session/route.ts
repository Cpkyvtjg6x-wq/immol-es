import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const priceId = typeof body?.priceId === 'string' ? body.priceId : ''

    // Liste blanche des price IDs autorisés (env) → on dérive le tier du PRIX RÉEL,
    // jamais du planName envoyé par le client (ferme la faille "Agence au prix Pro").
    const PRICE_TIERS: Record<string, 'pro' | 'business'> = {}
    for (const id of [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY, process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL]) {
      if (id) PRICE_TIERS[id] = 'pro'
    }
    for (const id of [process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY, process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL]) {
      if (id) PRICE_TIERS[id] = 'business'
    }

    const tier = PRICE_TIERS[priceId]
    if (!tier) {
      return NextResponse.json({ error: 'priceId invalide' }, { status: 400 })
    }
    const planName = tier === 'business' ? 'agency' : 'pro'

    // Récupérer l'utilisateur connecté via Supabase SSR
    // (@supabase/ssr 0.1.0 — API get/set/remove, pas getAll/setAll)
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(_name: string, _value: string, _options: CookieOptions) {
            // No-op : on ne rafraîchit pas la session ici, lecture seule
          },
          remove(_name: string, _options: CookieOptions) {
            // No-op
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        planName,
        // tier dérivé du priceId validé (cf. liste blanche ci-dessus) — le webhook
        // recoupe de toute façon via getTierFromSubscription.
        tier,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          tier,
        },
      },
      // Stripe substitue automatiquement {CHECKOUT_SESSION_ID} par l'ID réel.
      // La page /checkout/success retrouve la session côté serveur pour afficher
      // les détails (fin d'essai, plan, etc.).
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planName}`,
      cancel_url: `${appUrl}/#pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] Erreur:', err)
    return NextResponse.json({ error: 'Erreur création session' }, { status: 500 })
  }
}
