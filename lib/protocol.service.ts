import { prisma } from './prisma'
import { XpService } from './xp.service'
import {
  addUserLocalDaysUtcKey,
  getUserDayBoundsUtc,
  getUserDayKeyUtc,
  resolveUserTimezone,
} from './time'

/**
 * Protocol Service - Manages daily morning protocol (Earth Scroll)
 * Morning protocol establishes circadian rhythm and sets the day's foundation
 */

export interface ProtocolChecklist {
  wokeOnTime: boolean
  gotMorningLight: boolean
  drankWater: boolean
  delayedCaffeine: boolean
}

export class ProtocolService {
  static readonly MORNING_PROTOCOL_XP = 30 // XP for completing full protocol
  static readonly MORNING_PROTOCOL_HP_BONUS = 0 // HP is recomputed via EnergyService
  static readonly PARTIAL_PROTOCOL_XP = 15 // XP for 2-3 items

  /**
   * Get today's protocol (creates if doesn't exist)
   */
  static async getTodayProtocol(userId: string, date?: Date) {
    const timezone = await this.getUserTimezone(userId)
    const targetDate = date ?? new Date()
    const dayKey = getUserDayKeyUtc(timezone, targetDate)

    let protocol = await this.findProtocolForLocalDay(
      userId,
      timezone,
      targetDate
    )

    if (!protocol) {
      protocol = await prisma.dailyProtocol.create({
        data: {
          userId,
          date: dayKey,
        },
      })
    }

    return protocol
  }

  /**
   * Update protocol checklist item
   */
  static async updateChecklistItem(
    userId: string,
    date: Date,
    item: keyof ProtocolChecklist,
    value: boolean
  ) {
    const protocol = await this.getTodayProtocol(userId, date)

    const updated = await prisma.dailyProtocol.update({
      where: { id: protocol.id },
      data: {
        [item]: value,
      },
    })

    // Check if protocol is now complete
    const allComplete =
      updated.wokeOnTime &&
      updated.gotMorningLight &&
      updated.drankWater
    // delayedCaffeine is optional

    if (allComplete && !updated.completed) {
      // Complete the protocol!
      return await this.completeProtocol(userId, date)
    }

    return {
      protocol: updated,
      completed: false,
    }
  }

  /**
   * Complete the morning protocol and grant rewards
   */
  static async completeProtocol(userId: string, date: Date) {
    const protocol = await this.getTodayProtocol(userId, date)

    if (protocol.completed) {
      return {
        protocol,
        completed: true,
        xpEarned: protocol.xpEarned,
        hpBonus: protocol.hpBonus,
      }
    }

    // Check completion criteria
    const allComplete =
      protocol.wokeOnTime && protocol.gotMorningLight && protocol.drankWater

    if (!allComplete) {
      throw new Error('Protocol not complete - missing required items')
    }

    // Calculate XP reward (bonus if caffeine delayed)
    let xpReward = this.MORNING_PROTOCOL_XP
    if (protocol.delayedCaffeine) {
      xpReward += 5 // Bonus for delayed caffeine
    }

    // Grant XP
    await XpService.createEvent({
      userId,
      type: 'block_complete', // Reuse existing type or add 'protocol_complete'
      delta: xpReward,
      relatedModel: 'DailyProtocol',
      relatedId: protocol.id,
      description: `Completed morning protocol${protocol.delayedCaffeine ? ' (with delayed caffeine bonus)' : ''}`,
      dedupeKey: `protocol:${protocol.id}:complete`,
    })

    // Mark protocol as complete
    const completed = await prisma.dailyProtocol.update({
      where: { id: protocol.id },
      data: {
        completed: true,
        completedAt: new Date(),
        xpEarned: xpReward,
        hpBonus: this.MORNING_PROTOCOL_HP_BONUS,
      },
    })

    return {
      protocol: completed,
      completed: true,
      xpEarned: xpReward,
      hpBonus: this.MORNING_PROTOCOL_HP_BONUS,
    }
  }

  /**
   * Get protocol completion rate (last 7 days)
   */
  static async getCompletionRate(userId: string): Promise<{
    rate: number // 0-100
    completedDays: number
    totalDays: number
  }> {
    const timezone = await this.getUserTimezone(userId)
    const todayKey = getUserDayKeyUtc(timezone, new Date())
    const sevenDaysAgo = addUserLocalDaysUtcKey(timezone, todayKey, -6)
    const tomorrowKey = addUserLocalDaysUtcKey(timezone, todayKey, 1)

    const protocols = await prisma.dailyProtocol.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
          lt: tomorrowKey,
        },
      },
    })

    const completedDays = protocols.filter((p) => p.completed).length
    const totalDays = protocols.length

    const rate = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

    return {
      rate: Math.round(rate),
      completedDays,
      totalDays,
    }
  }

  /**
   * Check if user completed protocol today
   */
  static async hasCompletedToday(userId: string): Promise<boolean> {
    const protocol = await this.getTodayProtocol(userId)
    return protocol.completed
  }

  /**
   * Get protocol stats for display
   */
  static async getProtocolStats(userId: string) {
    const today = await this.getTodayProtocol(userId)
    const completionRate = await this.getCompletionRate(userId)

    const itemsComplete = [
      today.wokeOnTime,
      today.gotMorningLight,
      today.drankWater,
      today.delayedCaffeine,
    ].filter(Boolean).length

    return {
      today: {
        ...today,
        itemsComplete,
        totalItems: 4,
        progress: Math.round((itemsComplete / 3) * 100), // 3 required items
      },
      weeklyRate: completionRate,
    }
  }

  private static async getUserTimezone(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })

    return resolveUserTimezone(user?.timezone)
  }

  private static async findProtocolForLocalDay(
    userId: string,
    timezone: string,
    when: Date
  ) {
    const dayKey = getUserDayKeyUtc(timezone, when)
    const { startUtc, endUtc } = getUserDayBoundsUtc(timezone, when)

    const canonical = await prisma.dailyProtocol.findUnique({
      where: {
        userId_date: {
          userId,
          date: dayKey,
        },
      },
    })

    if (canonical) return canonical

    const legacy = await prisma.dailyProtocol.findFirst({
      where: {
        userId,
        date: {
          gte: startUtc,
          lt: endUtc,
        },
      },
      orderBy: { date: 'desc' },
    })

    if (!legacy) return null

    if (legacy.date.getTime() === dayKey.getTime()) {
      return legacy
    }

    try {
      const updated = await prisma.dailyProtocol.update({
        where: { id: legacy.id },
        data: { date: dayKey },
      })
      return updated
    } catch (error) {
      console.warn('[Protocol] Failed to repair daily protocol dayKey', error)
      return legacy
    }
  }
}
