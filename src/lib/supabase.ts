import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Avoid constructing the admin client in the browser bundle.
// This prevents "supabaseKey is required" when client components import this module.
let supabaseAdminInternal: SupabaseClient | undefined
if (typeof window === 'undefined') {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) as string
  if (!url || !key) {
    // Keep undefined so any accidental client-side import doesn't throw.
    // Server routes that need this will fail fast when they try to use it without envs.
    // eslint-disable-next-line no-console
    console.warn('[supabase] Service role env vars are missing; admin client not initialized')
  } else {
    supabaseAdminInternal = createClient(url, key, { auth: { persistSession: false } })
  }
}
export const supabaseAdmin = supabaseAdminInternal as SupabaseClient

// Create a server-scoped client for Route Handlers by forwarding Authorization header
export function createServerClientFromHeaders(headers: Headers): SupabaseClient {
  const authHeader = headers.get('authorization') || ''
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) as string
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: authHeader ? { Authorization: authHeader } : {} }
  })
}

// Browser client factory (for client components)
export function createBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  return createClient(url, anon)
}

// Helper: get authenticated user from a Request (expects Authorization: Bearer <token>)
export async function getUserFromRequest(req: Request) {
  const supabase = createServerClientFromHeaders(new Headers(req.headers))
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}
