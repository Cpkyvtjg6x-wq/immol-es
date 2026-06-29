import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { sendEmail, emailPaiementConfirme } from '@/lib/email'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe Webhook] Signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, skipped: true })
  }

  const supabase = createAdminClient()

  // ── Idempotence : on bloque les events déjà traités ─────────────────
  // Stripe peut renvoyer le même event en cas de timeout/retry. Sans ce
  // garde-fou : double email "Bienvenue", double update profile, etc.
  // Le PK event_id garantit l'unicité ; un .insert qui foire en 23505
  // = doublon → on répond 200 pour que Stripe arrête de retry.
  const userIdMeta = extractUserId(event)
  const customerMeta = extractCustomer(event)
  const { error: insertErr } = await supabase.from('billing_events').insert({
    event_id: event.id,
    type: event.type,
    livemode: event.livemode,
    user_id: userIdMeta,
    customer: customerMeta,
    payload: event as unknown as Record<string, unknown>,
  })
  if (insertErr) {
    // 23505 = unique_violation Postgres → event déjà traité
    if (insertErr.code === '23505') {
      console.log(`[Stripe Webhook] Event ${event.id} déjà traité, skip`)
      return NextResponse.json({ received: true, deduped: true })
    }
    // Autre erreur (RLS, conn) : on log mais on continue — on préfère
    // double-traiter plutôt que rater un paiement.
    console.error('[Stripe Webhook] billing_events insert error:', insertErr)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, supabase)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription, supabase)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabase)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('[Stripe] Paiement réussi:', invoice.customer)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.error('[Stripe] Paiement échoué:', invoice.customer)
        // L'accès est rétrogradé automatiquement par handleSubscriptionChange dès que
        // l'abonnement passe en 'past_due'/'unpaid' (statut hors active/trialing → 'free').
        // Reste à faire (croissance, non bloquant) : email de relance / dunning.
        break
      }
    }

    return NextResponse.json({ received: true, event: event.type })
  } catch (error) {
    console.error('[Stripe Webhook] Erreur traitement:', error)
    return NextResponse.json({ error: 'Erreur traitement webhook' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createAdminClient>
) {
  if (!session.customer || !session.metadata?.userId) return

  const tier = getTierFromSession(session)

  const { data: profile } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: session.customer as string,
      subscription_tier: tier,
    })
    .eq('id', session.metadata.userId)
    .select('email, full_name')
    .single()

  console.log(`[Stripe] Checkout complété → user ${session.metadata.userId} → ${tier}`)

  // Email de confirmation paiement
  if (profile?.email) {
    const firstName = profile.full_name?.split(' ')[0] || profile.email.split('@')[0]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://immora.fr'
    await sendEmail({
      to: profile.email,
      subject: `Bienvenue dans IMMORA ${tier === 'business' ? 'Agence' : 'Pro'} 🎉`,
      html: emailPaiementConfirme(firstName, tier, appUrl),
    })
  }
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminClient>
) {
  const customerId = subscription.customer as string
  const tier = getTierFromSubscription(subscription)
  const isActive = ['active', 'trialing'].includes(subscription.status)

  await supabase
    .from('profiles')
    .update({ subscription_tier: isActive ? tier : 'free' })
    .eq('stripe_customer_id', customerId)

  console.log(`[Stripe] Subscription ${subscription.status} → customer ${customerId} → ${tier}`)
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: ReturnType<typeof createAdminClient>
) {
  const customerId = subscription.customer as string

  await supabase
    .from('profiles')
    .update({ subscription_tier: 'free' })
    .eq('stripe_customer_id', customerId)

  console.log(`[Stripe] Subscription annulée → customer ${customerId} → free`)
}

function getTierFromSession(session: Stripe.Checkout.Session): string {
  // Fail-closed : on n'accepte QUE des valeurs connues, jamais un fallback payant.
  // (Le tier en metadata provient du body client → ne pas lui faire confiance pour
  // accorder un accès payant.) L'autorité réelle reste getTierFromSubscription,
  // basée sur le priceId réellement facturé, exécutée via subscription.created/updated.
  const tier = session.metadata?.tier
  return tier === 'business' || tier === 'pro' ? tier : 'free'
}

/**
 * Extrait l'userId depuis n'importe quel type d'event Stripe pertinent
 * pour le ranger dans `billing_events`. On regarde dans les metadata
 * (session checkout, subscription) et on retourne null si absent.
 */
function extractUserId(event: Stripe.Event): string | null {
  const obj = event.data.object as Record<string, unknown>
  const directMeta = (obj?.metadata as Record<string, string> | undefined)?.userId
  if (directMeta) return directMeta
  const subData = obj?.subscription_data as { metadata?: Record<string, string> } | undefined
  return subData?.metadata?.userId ?? null
}

/**
 * Extrait l'ID Stripe Customer depuis n'importe quel type d'event.
 */
function extractCustomer(event: Stripe.Event): string | null {
  const obj = event.data.object as { customer?: string | { id?: string } }
  if (!obj?.customer) return null
  if (typeof obj.customer === 'string') return obj.customer
  return obj.customer.id ?? null
}

function getTierFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return 'free'

  // Les price IDs sont publics (préfixe NEXT_PUBLIC_) pour être lisibles par le client (Pricing.tsx).
  // Côté serveur, on lit les mêmes variables.
  const agencyPrices = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY_ANNUAL,
  ].filter(Boolean) as string[]

  const proPrices = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
  ].filter(Boolean) as string[]

  if (agencyPrices.includes(priceId)) return 'business'
  if (proPrices.includes(priceId)) return 'pro'

  // Fail-closed : un priceId inconnu n'accorde JAMAIS un accès payant. On log fort
  // car c'est soit une mauvaise config des NEXT_PUBLIC_STRIPE_PRICE_*, soit un produit
  // Stripe non recensé → à corriger immédiatement (sinon le client paie sans accès).
  console.error(`[Stripe] priceId non reconnu "${priceId}" → tier 'free' (vérifier les env NEXT_PUBLIC_STRIPE_PRICE_*)`)
  return 'free'
}
