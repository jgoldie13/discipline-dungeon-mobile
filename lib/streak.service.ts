import { prisma } from './prisma'
import { DragonService } from './dragon.service'
import {
  addUserLocalDaysUtcKey,
  getUserDayBoundsUtc,
  getUserDayKeyUtc,
  resolveUserTimezone,
} from './time'

export interface DailyPerformance {
  date: Date
  underLimit: boolean
  violationCount: number
}

/**
 * Streak Service - Manages daily streaks and persistence
 * A streak continues when you stay under your social media limit
 */
export class StreakService {
  /**
   * Evaluate daily performance and update streak
   */
  static async evaluateDailyPerformance(
    userId: string,
    date: Date,
    performance: DailyPerformance
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error(`User ${userId} not found`)

    const timezone = resolveUserTimezone(user.timezone)
    const dayKey = getUserDayKeyUtc(timezone, date)
    const { underLimit, violationCount } = performance
    const previousStreak = user.currentStreak

    // Calculate new streak
    let newStreak = user.currentStreak
    let broken = false
    let reason: string | undefined

    if (!underLimit || violationCount > 0) {
      // Streak broken
      newStreak = 0
      broken = true
      reason = violationCount > 0 ? 'Usage violation' : 'Over social media limit'
    } else {
      // Streak continues
      const yesterday = addUserLocalDaysUtcKey(timezone, dayKey, -1)
      const lastStreakDate = user.lastStreakDate
        ? getUserDayKeyUtc(timezone, user.lastStreakDate)
        : null

      // Check if this is consecutive
      if (
        !lastStreakDate ||
        lastStreakDate.getTime() === yesterday.getTime()
      ) {
        newStreak += 1
      } else {
        // Missed a day, restart
        newStreak = 1
      }
    }

    // Update longest streak if necessary
    const newLongestStreak = Math.max(user.longestStreak, newStreak)

    // Create or update streak history entry (idempotent)
    await prisma.streakHistory.upsert({
      where: {
        userId_date: { userId, date: dayKey },
      },
      create: {
        userId,
        date: dayKey,
        streakCount: newStreak,
        broken,
        reason,
        underLimit,
        violationCount,
      },
      update: {
        streakCount: newStreak,
        broken,
        reason,
        underLimit,
        violationCount,
      },
    })

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastStreakDate: dayKey,
      },
    })

    if (broken && previousStreak > 0) {
      await DragonService.applyStreakBreakAttack(userId, dayKey, previousStreak)
    }

    return {
      newStreak,
      broken,
      reason,
      longestStreak: newLongestStreak,
    }
  }

  /**
   * Get streak history for a user
   */
  static async getHistory(userId: string, startDate: Date, endDate: Date) {
    return prisma.streakHistory.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'desc' },
    })
  }

  /**
   * Get current streak info for display
   */
  static async getCurrentStreak(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error(`User ${userId} not found`)

    return {
      current: user.currentStreak,
      longest: user.longestStreak,
      lastDate: user.lastStreakDate,
    }
  }

  /**
   * Get weekly streak performance
   */
  static async getWeeklyPerformance(userId: string, startDate: Date) {
    const timezone = await this.getUserTimezone(userId)
    const startKey = getUserDayKeyUtc(timezone, startDate)
    const endKey = addUserLocalDaysUtcKey(timezone, startKey, 7)

    const history = await this.getHistory(userId, startKey, endKey)

    return {
      daysTracked: history.length,
      daysUnderLimit: history.filter((h) => h.underLimit).length,
      totalViolations: history.reduce((sum, h) => sum + h.violationCount, 0),
      streakBroken: history.some((h) => h.broken),
    }
  }

  /**
   * Check if user needs streak evaluation for a date
   * (Run this daily to ensure streaks are tracked)
   */
  static async needsEvaluation(userId: string, date: Date): Promise<boolean> {
    const timezone = await this.getUserTimezone(userId)
    const { startUtc, endUtc } = getUserDayBoundsUtc(timezone, date)
    const existing = await prisma.streakHistory.findFirst({
      where: {
        userId,
        date: {
          gte: startUtc,
          lt: endUtc,
        },
      },
    })

    return !existing
  }

  private static async getUserTimezone(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })

    return resolveUserTimezone(user?.timezone)
  }
}
