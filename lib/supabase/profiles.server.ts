/**
 * Profiles helpers (server-side).
 *
 * Note: `public.profiles` rows are auto-created by a DB trigger on signup.
 * Client/server code should never insert into `profiles` directly.
 */

import { createClient, requireCurrentUser } from '@/lib/supabase/server'

export type ProfileRow = {
  id: string
  created_at: string
}

export async function getMyProfile(): Promise<ProfileRow | null> {
  const supabase = await createClient()
  const user = await requireCurrentUser()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Fetches the profile row and throws if it's missing.
 * Missing rows typically indicate the signup trigger is not installed/enabled.
 */
export async function ensureProfileExists(): Promise<ProfileRow> {
  const profile = await getMyProfile()
  if (!profile) {
    throw new Error(
      'Profile row is missing. Expected `public.profiles` to be created by the signup trigger.'
    )
  }
  return profile
}

