import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/supabase/auth'
import { UserSettingsV1Schema, safeParseSettings } from '@/lib/policy/settings.schema'

/**
 * Server-side settings fetcher
 * - fetches from Prisma User.settings JSON
 * - merges partials with defaults
 * - validates with zod
 */
export async function getUserSettingsServer() {
  const userId = await getAuthUserId()

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { settings: true },
  })

  const stored = user?.settings ?? {}
  // Merge with defaults and validate
  const validated = safeParseSettings(stored)

  // Ensure shape matches schema (full defaults)
  const settings = UserSettingsV1Schema.parse(validated)

  return { settings, userId }
}
