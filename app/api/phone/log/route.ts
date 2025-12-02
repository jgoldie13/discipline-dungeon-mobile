import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { StreakService } from '@/lib/streak.service'

// POST /api/phone/log - Log daily phone usage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { minutes, limit } = body

    if (typeof minutes !== 'number' || typeof limit !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: minutes and limit must be numbers' },
        { status: 400 }
      )
    }

    const overage = Math.max(0, minutes - limit)
    const overLimit = minutes > limit
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // For now, we'll use a hardcoded user ID until auth is implemented
    const userId = 'user_default'

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          dailySocialMediaLimit: limit,
        },
      })
    }

    // Check if log already exists for today
    const existingLog = await prisma.phoneDailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    })

    let log
    if (existingLog) {
      // Update existing log
      log = await prisma.phoneDailyLog.update({
        where: { id: existingLog.id },
        data: {
          socialMediaMin: minutes,
          limitMin: limit,
          overage,
          penalty: overage > 0 ? `Lost XP and streak for ${overage}min overage` : null,
        },
      })
    } else {
      // Create new log
      log = await prisma.phoneDailyLog.create({
        data: {
          userId,
          date: today,
          socialMediaMin: minutes,
          limitMin: limit,
          overage,
          penalty: overage > 0 ? `Lost XP and streak for ${overage}min overage` : null,
        },
      })
    }

    // Evaluate daily streak performance
    const streakResult = await StreakService.evaluateDailyPerformance(userId, today, {
      date: today,
      underLimit: !overLimit,
      violationCount: overLimit ? 1 : 0,
    })

    // If there's an overage, create a violation record and apply XP penalty
    let xpPenalty = 0
    if (overage > 0) {
      // Create violation
      await prisma.usageViolation.create({
        data: {
          userId,
          date: today,
          totalOverage: overage,
          penalty: `Lost XP and streak - ${overage} minutes over limit`,
          executed: true,
          executedAt: new Date(),
        },
      })

      // Calculate and apply XP penalty
      xpPenalty = XpService.calculateViolationPenalty(overage)
      await XpService.createEvent({
        userId,
        type: 'violation_penalty',
        delta: xpPenalty, // Already negative from calculateViolationPenalty
        description: `Went ${overage} min over limit`,
      })
    }

    return NextResponse.json({
      success: true,
      log,
      violation: overage > 0,
      overage,
      xpPenalty,
      streak: {
        current: streakResult.newStreak,
        broken: streakResult.broken,
        reason: streakResult.reason,
      },
    })
  } catch (error) {
    console.error('Error logging phone usage:', error)
    return NextResponse.json(
      { error: 'Failed to log phone usage' },
      { status: 500 }
    )
  }
}

// GET /api/phone/log - Get today's phone usage
export async function GET() {
  try {
    const userId = 'user_default'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const log = await prisma.phoneDailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    })

    return NextResponse.json({ log })
  } catch (error) {
    console.error('Error fetching phone log:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phone log' },
      { status: 500 }
    )
  }
}
