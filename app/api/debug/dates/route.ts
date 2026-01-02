import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserDayBoundsUtc, resolveUserTimezone } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Debug endpoint to check date calculations
// SECURITY: Blocked in production, requires DEBUG_API_KEY in non-production
export async function GET(request: NextRequest) {
  try {
    // Block entirely in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Require API key in non-production
    const debugKey = request.headers.get('x-debug-key')
    const requiredKey = process.env.DEBUG_API_KEY

    if (requiredKey && debugKey !== requiredKey) {
      console.warn('[Debug] Unauthorized debug access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = 'user_default'
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = resolveUserTimezone(user?.timezone)

    // Current time info
    const now = new Date()
    const nowInfo = {
      iso: now.toISOString(),
      utc: {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth(),
        date: now.getUTCDate(),
        hours: now.getUTCHours(),
        minutes: now.getUTCMinutes(),
      },
      local: {
        year: now.getFullYear(),
        month: now.getMonth(),
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
      },
    }

    // Today calculation (user timezone)
    const { startUtc: today, endUtc: tomorrow } = getUserDayBoundsUtc(
      timezone,
      now
    )

    // Get recent XP events
    const allXpEvents = await prisma.xpEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        delta: true,
        createdAt: true,
        description: true,
      },
    })

    // Get today's XP events
    const todayXpEvents = await prisma.xpEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        type: true,
        delta: true,
        createdAt: true,
        description: true,
      },
    })

    // Get phone logs
    const phoneLogs = await prisma.phoneDailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5,
      select: {
        id: true,
        date: true,
        socialMediaMin: true,
        limitMin: true,
      },
    })

    return NextResponse.json({
      serverTime: nowInfo,
      timezone,
      dateRanges: {
        todayStart: today.toISOString(),
        todayEnd: tomorrow.toISOString(),
      },
      xpEvents: {
        all: allXpEvents.map(e => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
          isToday: e.createdAt >= today && e.createdAt < tomorrow,
        })),
        todayCount: todayXpEvents.length,
        todayTotal: todayXpEvents.reduce((sum, e) => sum + e.delta, 0),
        today: todayXpEvents.map(e => ({
          ...e,
          createdAt: e.createdAt.toISOString(),
        })),
      },
      phoneLogs: phoneLogs.map(log => ({
        ...log,
        date: log.date.toISOString(),
        isToday: log.date >= today && log.date < tomorrow,
      })),
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
