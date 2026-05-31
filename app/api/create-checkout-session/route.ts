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
    const { priceId, planName } = await req.json()

    if (!priceId) {
      return NextResponse.json({ error: 'priceId manquant' }, { status: 400 })
    }

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
        planName: planName ?? 'pro',
        // Le webhook lit metadata.tier (cf. getTierFromSession) — mapping
        // plan UI → tier DB : 'pro' → 'pro', 'agency' → 'business'.
        tier: planName === 'agency' ? 'business' : 'pro',
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id,
          tier: planName === 'agency' ? 'business' : 'pro',
        },
      },
      // Stripe substitue automatiquement {CHECKOUT_SESSION_ID} par l'ID réel.
      // La page /checkout/success retrouve la session côté serveur pour afficher
      // les détails (fin d'essai, plan, etc.).
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&plan=${planName ?? 'pro'}`,
      cancel_url: `${appUrl}/#pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] Erreur:', err)
    return NextResponse.json({ error: 'Erreur création session' }, { status: 500 })
  }
}
