import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Route OAuth callback — échange le code PKCE Supabase contre une session.
 *
 * IMPORTANT : on utilise @supabase/ssr 0.1.0 qui expose l'ancienne API
 * `get / set / remove` (pas `getAll / setAll`). Le piège : dans un
 * Route Handler Next.js 14, on ne peut PAS poser des cookies via le
 * `cookies()` de next/headers à destination d'un `NextResponse.redirect()`
 * — la redirect crée une nouvelle Response qui n'hérite pas des cookies.
 *
 * Pattern correct : écrire les cookies directement sur la NextResponse
 * de redirect via `response.cookies.set(...)`. C'est ce que fait `set`
 * et `remove` ci-dessous. Le bug précédent (try/catch silencieux) cachait
 * que les cookies n'étaient jamais transmis → boucle OAuth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  // Réponse à laquelle on va attacher les cookies de session
  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error(
      '[OAuth Callback] exchangeCodeForSession error:',
      JSON.stringify({ message: error.message, name: error.name, status: error.status }),
    )
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  return response
}
