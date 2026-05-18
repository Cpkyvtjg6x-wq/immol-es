import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser (client-side) Supabase client
 * Use in Client Components and hooks
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/** Alias for backwards compat */
export const createClient = createBrowserSupabaseClient
