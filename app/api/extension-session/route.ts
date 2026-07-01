import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { effectiveTier } from '@/lib/owner'
import type { SubscriptionTier } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic' // jamais mis en cache : session lue à chaque appel

/**
 * Endpoint appelé par le content script de l'extension qui tourne SUR immora.app
 * (même origine → le cookie de session part tout seul). Le serveur lit la session
 * côté serveur et renvoie access_token + tier à l'extension, qui les met en cache
 * dans chrome.storage.local.
 *
 * POURQUOI : le service worker MV3 de l'extension ne peut PAS lire les cookies
 * d'immora.app via chrome.cookies (permission non effective au runtime). On passe
 * donc par un appel same-origin, où c'est la requête HTTP elle-même qui porte le
 * cookie — aucune permission d'extension requise, fonctionne même si le cookie
 * était httpOnly.
 *
 * @supabase/ssr 0.1.0 → API cookies get/set/remove (pas getAll/setAll).
 */
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(_name: string, _value: string, _options: CookieOptions) {},
          remove(_name: string, _options: CookieOptions) {},
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const dbTier = (profile?.subscription_tier ?? 'free') as SubscriptionTier
    const tier = effectiveTier(user.email, dbTier)

    return NextResponse.json(
      {
        authenticated: true,
        access_token: session?.access_token ?? null,
        userId: user.id,
        email: user.email ?? null,
        tier,
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
