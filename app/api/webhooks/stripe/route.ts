import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase-server'

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
        // TODO: envoyer email de relance
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

  await supabase
    .from('profiles')
    .update({
      stripe_customer_id: session.customer as string,
      subscription_tier: tier,
    })
    .eq('id', session.metadata.userId)

  console.log(`[Stripe] Checkout complété → user ${session.metadata.userId} → ${tier}`)
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
  // Le tier peut être stocké dans les metadata de la session
  return session.metadata?.tier ?? 'pro'
}

function getTierFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id
  if (!priceId) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_ID_BUSINESS) return 'business'
  if (priceId === process.env.STRIPE_PRICE_ID_PRO) return 'pro'
  return 'pro'
}
