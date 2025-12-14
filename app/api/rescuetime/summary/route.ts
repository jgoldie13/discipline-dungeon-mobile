import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { dateKeyUtc, yesterdayDateUtcForTimeZone } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const conn = await prisma.rescueTimeConnection.findUnique({ where: { userId } })

    const enabled = conn?.enabled ?? false
    const timezone = conn?.timezone ?? ''
    const lastSyncAt = conn?.lastSyncAt ?? null
    const hasApiKey = Boolean(conn?.apiKeyEncrypted && conn.apiKeyEncrypted.length > 0)

    if (!enabled || !timezone) {
      return NextResponse.json({
        enabled,
        hasApiKey,
        timezone,
        lastSyncAt,
        yesterday: null,
      })
    }

    const date = yesterdayDateUtcForTimeZone(timezone)
    const truth = await prisma.truthCheckDaily.findUnique({
      where: { userId_date: { userId, date } },
    })

    return NextResponse.json({
      enabled,
      hasApiKey,
      timezone,
      lastSyncAt,
      yesterday: {
        date: dateKeyUtc(date),
        status: truth?.status ?? 'missing_verification',
        reportedMinutes: truth?.reportedMinutes ?? null,
        verifiedMinutes: truth?.verifiedMinutes ?? null,
        deltaMinutes: truth?.deltaMinutes ?? null,
      },
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching RescueTime summary:', error)
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}

