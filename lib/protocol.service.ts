import { prisma } from './prisma'
import { XpService } from './xp.service'

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
  static readonly MORNING_PROTOCOL_HP_BONUS = 5 // HP bonus for completion
  static readonly PARTIAL_PROTOCOL_XP = 15 // XP for 2-3 items

  /**
   * Get today's protocol (creates if doesn't exist)
   */
  static async getTodayProtocol(userId: string, date?: Date) {
    const today = date || new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find existing protocol
    let protocol = await prisma.dailyProtocol.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Create if doesn't exist
    if (!protocol) {
      protocol = await prisma.dailyProtocol.create({
        data: {
          userId,
          date: today,
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
    })

    // Grant HP bonus
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user) {
      const newHp = Math.min(100, user.currentHp + this.MORNING_PROTOCOL_HP_BONUS)
      await prisma.user.update({
        where: { id: userId },
        data: { currentHp: newHp },
      })
    }

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
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const protocols = await prisma.dailyProtocol.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
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
}
