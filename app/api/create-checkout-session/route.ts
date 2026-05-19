import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
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
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
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
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: user.id },
      },
      success_url: `${appUrl}/dashboard?checkout=success&plan=${planName ?? 'pro'}`,
      cancel_url: `${appUrl}/#pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Checkout] Erreur:', err)
    return NextResponse.json({ error: 'Erreur création session' }, { status: 500 })
  }
}
