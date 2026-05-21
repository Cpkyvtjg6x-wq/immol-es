import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser (client-side) Supabase client — singleton pattern.
 * Calling createBrowserSupabaseClient() multiple times always returns the
 * same instance, which ensures there is only ONE auth listener at a time
 * and prevents React error #310 ("Cannot update a component while rendering
 * a different component").
 */
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createBrowserSupabaseClient() {
  // On the server there is no window — never cache server-side.
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  if (!_browserClient) {
    _browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _browserClient
}

/** Alias for backwards compat */
export const createClient = createBrowserSupabaseClient
