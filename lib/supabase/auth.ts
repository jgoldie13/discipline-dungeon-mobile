/**
 * Auth Utilities
 * Helpers for getting authenticated user in API routes
 */

import { createClient } from './server'

/**
 * Get authenticated user ID for API routes
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      return user.id
    }
  } catch (error) {
    console.error('[Auth] Error getting user:', error)
  }

  return null
}

/**
 * Require authentication - returns user ID or throws
 */
export async function requireAuthUserId(): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Unauthorized')
  }

  return user.id
}
