import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/**
 * Route OAuth callback — échange le code PKCE Supabase contre une session.
 *
 * Pattern correct pour Next.js 14 + @supabase/ssr :
 * Quand on retourne `NextResponse.redirect(url)`, on crée une nouvelle
 * Response qui N'HÉRITE PAS des cookies posés via `cookies()` de
 * `next/headers`. Il faut donc poser les cookies DIRECTEMENT sur la
 * NextResponse via `response.cookies.set(...)`.
 *
 * C'est exactement ce que la doc officielle Supabase recommande :
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * Bug précédent : on utilisait `cookieStore.set(...)` qui silencieusement
 * échouait, les cookies n'étaient jamais transmis → après OAuth, la
 * session côté serveur était vide → /api/* renvoyait 401 → boucle.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  // Réponse de redirect que l'on va éventuellement re-construire pour
  // y attacher les cookies de session posés par Supabase.
  let response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // 1) Reflète les cookies sur la request (pour les lectures suivantes
          //    dans la même invocation)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          // 2) Re-crée la response de redirect avec les bons cookies dessus
          response = NextResponse.redirect(`${origin}${next}`)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[OAuth Callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(`${origin}/auth/login?error=oauth_failed`)
  }

  return response
}
