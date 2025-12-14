import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { fetchDailySummary } from '@/lib/rescuetime.client'
import { yesterdayDateUtcForTimeZone } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    const userId = await requireAuthUserId()
    const conn = await prisma.rescueTimeConnection.findUnique({ where: { userId } })
    if (!conn || !conn.apiKeyEncrypted) {
      return NextResponse.json({ ok: false, error: 'RescueTime is not configured' }, { status: 400 })
    }
    if (!conn.timezone) {
      return NextResponse.json({ ok: false, error: 'Timezone is required' }, { status: 400 })
    }

    const apiKey = decrypt(conn.apiKeyEncrypted)
    const date = yesterdayDateUtcForTimeZone(conn.timezone)
    await fetchDailySummary(apiKey, date, conn.timezone)

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Test failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

