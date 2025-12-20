import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DragonService } from '@/lib/dragon.service'

// GET /api/cron/dragon-repair - Apply dragon auto-repairs for yesterday
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.NODE_ENV === 'production'

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (isProduction) {
      console.warn('[Cron] Missing CRON_SECRET in production environment')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    } else if (authHeader) {
      console.warn('[Cron] Ignoring auth header in non-production (no CRON_SECRET set)')
    }

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const targetDate = new Date(today)
    targetDate.setUTCDate(targetDate.getUTCDate() - 1)

    const activeUsers = await prisma.userProject.findMany({
      where: { active: true },
      select: { userId: true },
      distinct: ['userId'],
    })

    let appliedCount = 0
    const results: { userId: string; repairsApplied: number }[] = []

    for (const { userId } of activeUsers) {
      const repairs = await DragonService.applyAutoRepairs(userId, targetDate)
      const repairsApplied = repairs.filter((r) => r.applied).length
      if (repairsApplied > 0) appliedCount += repairsApplied
      results.push({ userId, repairsApplied })
    }

    return NextResponse.json({
      success: true,
      processedUsers: activeUsers.length,
      appliedRepairs: appliedCount,
      targetDate: targetDate.toISOString().slice(0, 10),
      results,
    })
  } catch (error) {
    console.error('[Cron] Error in dragon repair cron:', error)
    return NextResponse.json(
      {
        error: 'Failed to apply dragon repairs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
