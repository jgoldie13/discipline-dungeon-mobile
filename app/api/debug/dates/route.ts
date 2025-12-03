import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Debug endpoint to check date calculations
export async function GET() {
  try {
    const userId = 'user_default'

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

    // Today calculation (UTC)
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const tomorrow = new Date(today)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

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
