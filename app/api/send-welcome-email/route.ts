import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail, emailBienvenue } from '@/lib/email'

export const runtime = 'nodejs'

// Route appelée côté client juste après l'inscription
// (ou déclenchée via un Supabase Auth hook)
export async function POST(req: NextRequest) {
  try {
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
    if (!user?.email) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const firstName =
      user.user_metadata?.full_name?.split(' ')[0] ||
      user.email.split('@')[0]

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://immora.fr'

    const sent = await sendEmail({
      to: user.email,
      subject: 'Bienvenue sur IMMORA 👋 — Analysez votre premier bien',
      html: emailBienvenue(firstName, appUrl),
    })

    return NextResponse.json({ sent })
  } catch (err) {
    console.error('[Welcome email] Erreur:', err)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}
