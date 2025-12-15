/**
 * Server-side auth guardrail.
 *
 * Returns the current authenticated user's id or throws an Unauthorized error.
 * Use in API routes that must be scoped to the current user.
 */

import { requireAuthUserId } from '@/lib/supabase/auth'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { isUnauthorizedError } from '@/lib/supabase/http'

export async function requireUser(): Promise<string> {
  return requireAuthUserId()
}

export const requireUserId = requireUser

export async function requireUserFromRequest(request: Request): Promise<string> {
  try {
    return await requireAuthUserId()
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error
  }

  const auth = request.headers.get('authorization') || request.headers.get('Authorization')
  if (!auth) throw new Error('Unauthorized')

  const match = auth.match(/^Bearer\s+(.+)$/i)
  const accessToken = match?.[1]
  if (!accessToken) throw new Error('Unauthorized')

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data?.user) throw new Error('Unauthorized')

  return data.user.id
}
