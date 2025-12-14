/**
 * Server-side auth guardrail.
 *
 * Returns the current authenticated user's id or throws an Unauthorized error.
 * Use in API routes that must be scoped to the current user.
 */

import { requireAuthUserId } from '@/lib/supabase/auth'

export async function requireUser(): Promise<string> {
  return requireAuthUserId()
}

export const requireUserId = requireUser

