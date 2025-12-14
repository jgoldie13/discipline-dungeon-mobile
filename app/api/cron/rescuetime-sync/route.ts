import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { fetchDailySummary } from '@/lib/rescuetime.client'
import { TruthService } from '@/lib/truth.service'
import { dateKeyUtc, yesterdayDateUtcForTimeZone } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    const isVercelCron = authHeader?.startsWith('Bearer ') && process.env.VERCEL === '1'
    const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isVercelCron && !hasValidSecret) {
      console.warn('[Cron] Unauthorized access attempt', {
        hasAuth: !!authHeader,
        isVercel: process.env.VERCEL === '1',
        hasSecret: !!cronSecret,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conns = await prisma.rescueTimeConnection.findMany({
      where: { enabled: true },
    })

    const results: Array<{ userId: string; date: string; ok: boolean; error?: string }> =
      []

    for (const conn of conns) {
      const userId = conn.userId
      const tz = conn.timezone
      try {
        if (!tz) throw new Error('Missing timezone')
        if (!conn.apiKeyEncrypted) throw new Error('Missing API key')

        const date = yesterdayDateUtcForTimeZone(tz)
        const fetchedAt = new Date()
        const apiKey = decrypt(conn.apiKeyEncrypted)

        const summary = await fetchDailySummary(apiKey, date, tz)

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

        await TruthService.computeTruthCheck(userId, date)
        await TruthService.applyTruthConsequences(userId, date)

        await prisma.rescueTimeConnection.update({
          where: { userId },
          data: { lastSyncAt: fetchedAt },
        })

        results.push({ userId, date: dateKeyUtc(date), ok: true })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[Cron] RescueTime sync error', { userId, error: message })
        results.push({
          userId,
          date: tz ? dateKeyUtc(yesterdayDateUtcForTimeZone(tz)) : 'unknown',
          ok: false,
          error: message,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      processed: conns.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Error in RescueTime sync cron:', error)
    return NextResponse.json(
      { error: 'Failed to run rescuetime sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

