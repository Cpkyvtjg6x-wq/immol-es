import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Route OAuth callback — échange le code PKCE Supabase contre une session.
 *
 * Pourquoi ce fichier est critique :
 * Supabase utilise le flux PKCE (Authorization Code + PKCE) pour OAuth.
 * Sans cette route, le `code` reçu dans l'URL n'est jamais échangé côté
 * serveur, donc aucun cookie de session n'est posé. Chrome tolère parfois
 * l'ancien implicit flow ; Safari refuse catégoriquement — d'où le bug.
 *
 * Usage :
 *   redirectTo: `${origin}/auth/callback?next=/dashboard`
 *
 * Supabase envoie :
 *   GET /auth/callback?code=<pkce_code>&next=/dashboard
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              // Route handler — parfois read-only, on ignore silencieusement
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // idem
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Échec : retour à la page login avec indicateur d'erreur
  return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
}
