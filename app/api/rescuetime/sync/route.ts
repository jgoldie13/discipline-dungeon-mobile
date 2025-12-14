import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { fetchDailySummary } from '@/lib/rescuetime.client'
import { TruthService } from '@/lib/truth.service'
import { dateKeyUtc, yesterdayDateUtcForTimeZone } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST() {
  try {
    const userId = await requireAuthUserId()
    const conn = await prisma.rescueTimeConnection.findUnique({ where: { userId } })
    if (!conn || !conn.enabled) {
      return NextResponse.json({ error: 'RescueTime is not enabled' }, { status: 400 })
    }
    if (!conn.apiKeyEncrypted) {
      return NextResponse.json({ error: 'RescueTime API key not set' }, { status: 400 })
    }
    if (!conn.timezone) {
      return NextResponse.json({ error: 'Timezone is required' }, { status: 400 })
    }

    const apiKey = decrypt(conn.apiKeyEncrypted)
    const date = yesterdayDateUtcForTimeZone(conn.timezone)
    const fetchedAt = new Date()

    const summary = await fetchDailySummary(apiKey, date, conn.timezone)

    await prisma.rescueTimeDaily.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        verifiedMinutes: summary.verifiedMinutes,
        totalMinutes: summary.totalMinutes ?? null,
        raw: summary.raw as any,
        fetchedAt,
      },
      update: {
        verifiedMinutes: summary.verifiedMinutes,
        totalMinutes: summary.totalMinutes ?? null,
        raw: summary.raw as any,
        fetchedAt,
      },
    })

    const truth = await TruthService.computeTruthCheck(userId, date)
    const consequences = await TruthService.applyTruthConsequences(userId, date)

    await prisma.rescueTimeConnection.update({
      where: { userId },
      data: { lastSyncAt: fetchedAt },
    })

    return NextResponse.json({
      ok: true,
      date: dateKeyUtc(date),
      status: truth.status,
      deltaMinutes: truth.deltaMinutes,
      consequences,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Sync failed'
    console.error('Error syncing RescueTime:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

