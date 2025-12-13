/**
 * Auth Utilities
 * Helpers for getting authenticated user in API routes
 */

import { createClient } from './server'

/**
 * Get authenticated user ID for API routes
 * Falls back to 'user_default' if not authenticated (for backwards compatibility during migration)
 */
export async function getAuthUserId(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      return user.id
    }
  } catch (error) {
    console.error('[Auth] Error getting user:', error)
  }

  // Fallback for unauthenticated requests during transition
  return 'user_default'
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
