import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { StreakService } from '@/lib/streak.service'
import { IdentityService } from '@/lib/identity.service'
import { HpService } from '@/lib/hp.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import {
  getUserDayBoundsUtc,
  getUserDayKeyUtc,
  getUserLocalDayString,
  isValidIanaTimezone,
  resolveUserTimezone,
} from '@/lib/time'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/user/stats - Get today's stats for the dashboard
export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const timezoneHeader = req.headers.get('x-user-timezone')
    const shouldSetTimezone = isValidIanaTimezone(timezoneHeader)

    // Get or create user
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          ...(shouldSetTimezone ? { timezone: timezoneHeader } : {}),
        },
      })
    } else if (!user.timezone && shouldSetTimezone) {
      user = await prisma.user.update({
        where: { id: userId },
        data: { timezone: timezoneHeader },
      })
    }

    const userTimezone = resolveUserTimezone(user.timezone)
    const now = new Date()
    const { startUtc: today, endUtc: tomorrow } = getUserDayBoundsUtc(
      userTimezone,
      now
    )
    const dayKey = getUserDayKeyUtc(userTimezone, now)
    const legacyDayKey = new Date(
      `${getUserLocalDayString(userTimezone, now)}T00:00:00.000Z`
    )

    // Get today's phone usage
    const phoneLog = await prisma.phoneDailyLog.findFirst({
      where: {
        userId,
        date: {
          in: [dayKey, legacyDayKey],
        },
      },
      orderBy: { date: 'desc' },
    })

    // Get today's urges
    const urges = await prisma.urge.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Get today's phone-free blocks
    const blocks = await prisma.phoneFreeBlock.findMany({
      where: {
        userId,
        startTime: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Get today's tasks (when implemented)
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
        completed: true,
      },
    })

    // Get XP breakdown from ledger (today)
    let xpBreakdown = { blocks: 0, urges: 0, tasks: 0, penalties: 0 }
    let todayXp = { total: 0 }
    let streak: { current: number; longest: number; lastDate: Date | null } = { current: 0, longest: 0, lastDate: null }
    
    try {
      xpBreakdown = await XpService.getXpBreakdown(userId, today, tomorrow)
      todayXp = await XpService.getDailyXp(userId, today)
    } catch (xpError) {
      console.error('XP Service error:', xpError)
    }

    try {
      streak = await StreakService.getCurrentStreak(userId)
    } catch (streakError) {
      console.error('Streak Service error:', streakError)
    }

    // Calculate XP metadata
    const hoursReclaimed = XpService.getHoursReclaimed(user.totalXp)
    const nextMilestone = XpService.getNextMilestone(user.totalXp)

    // Get user identity
    const identity = IdentityService.getUserIdentity(user.currentLevel, user.currentStreak)
    const identityAffirmation = IdentityService.getIdentityAffirmation(identity.title)

    // Get HP info with full breakdown
    const hpBreakdown = await HpService.getTodayHpBreakdown(userId, today)
    const hpColor = HpService.getHpColor(user.currentHp)
    const hpMessage = HpService.getHpMessage(user.currentHp)

    const stats = {
      phoneUsage: {
        minutes: phoneLog?.socialMediaMin || 0,
        limit: phoneLog?.limitMin || user.dailySocialMediaLimit,
        overage: phoneLog?.overage || 0,
        percentage: phoneLog
          ? Math.round((phoneLog.socialMediaMin / phoneLog.limitMin) * 100)
          : 0,
      },
      urgesResisted: urges.length,
      phoneFreeBlocks: blocks.length,
      phoneFreeMinutes: blocks.reduce((sum, b) => sum + b.durationMin, 0),
      tasksCompleted: tasks.length,

      // XP System
      xp: {
        today: todayXp.total,
        total: user.totalXp,
        level: user.currentLevel,
        hoursReclaimed: Math.round(hoursReclaimed * 10) / 10, // 1 decimal place
        nextMilestone: nextMilestone
          ? {
              xp: nextMilestone.xp,
              label: nextMilestone.label,
              remaining: nextMilestone.xp - user.totalXp,
            }
          : null,
      },
      xpBreakdown: {
        blocks: xpBreakdown.blocks,
        urges: xpBreakdown.urges,
        tasks: xpBreakdown.tasks,
        penalties: xpBreakdown.penalties,
      },

      // Streak System
      streak: {
        current: streak.current,
        longest: streak.longest,
        lastDate: streak.lastDate,
      },

      // Identity System
      identity: {
        title: identity.title,
        description: identity.description,
        emoji: identity.emoji,
        tier: identity.tier,
        affirmation: identityAffirmation,
      },

      // HP System (Earth Scroll) - with detailed breakdown
      hp: {
        current: user.currentHp,
        max: 100,
        color: hpColor,
        message: hpMessage,
        hasLoggedSleepToday: !!hpBreakdown,
        lastUpdate: user.lastHpUpdate,
        // Include full breakdown if available
        breakdown: hpBreakdown
          ? {
              hp: hpBreakdown.hpCalculation.hp,
              status: hpBreakdown.hpCalculation.status,
              factors: hpBreakdown.hpCalculation.breakdown,
              alcohol: hpBreakdown.details.alcohol,
              reconciliation: hpBreakdown.details.reconciliation,
              sleepData: {
                bedtime: hpBreakdown.sleepLog.bedtime,
                waketime: hpBreakdown.sleepLog.waketime,
                durationHours: (hpBreakdown.sleepLog.sleepDurationMin / 60).toFixed(1),
                subjectiveRested: hpBreakdown.sleepLog.subjectiveRested,
              },
              isEdited: hpBreakdown.isEdited,
              editCount: hpBreakdown.sleepLog.editCount,
              updatedAt: hpBreakdown.sleepLog.updatedAt,
            }
          : null,
      },
    }

    return NextResponse.json({ stats, user })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching user stats:', error)
    // Return more detailed error in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch user stats', details: errorMessage },
      { status: 500 }
    )
  }
}
