import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// XP Reward/Penalty Configuration
// 1 XP = 1 minute of disciplined, phone-resisting behavior
export const XP_CONFIG = {
  // Rewards
  URGE_RESIST: 15, // ~15 min you would have wasted
  PHONE_FREE_BLOCK_PER_MIN: 1, // 1 XP per minute
  TASK_EXPOSURE: 120, // Heavy exposure task
  TASK_JOB_SEARCH: 60, // Medium effort
  TASK_HABIT_PER_MIN: 1, // 1 XP per minute (capped at 60)
  TASK_HABIT_MAX: 60,

  // Penalties
  VIOLATION_PER_MIN: -2, // 2 XP lost per minute over limit

  // Levels
  LEVEL_FORMULA: (totalXp: number) => Math.floor(Math.sqrt(totalXp) / 3),

  // Milestones (XP → hours reclaimed)
  MILESTONES: [
    { xp: 1000, label: 'Reclaimed 16+ hours', hours: 16.7 },
    { xp: 5000, label: 'Reclaimed 83+ hours', hours: 83.3 },
    { xp: 10000, label: 'Reclaimed 166+ hours (1 week)', hours: 166.7 },
    { xp: 50000, label: 'Reclaimed 833+ hours (5 weeks)', hours: 833.3 },
  ],
} as const

export type XpEventType =
  | 'block_complete'
  | 'urge_resist'
  | 'task_complete'
  | 'violation_penalty'
  | 'decay'
  | 'truth_penalty'

export interface CreateXpEventParams {
  userId: string
  type: XpEventType
  delta: number
  relatedModel?: string
  relatedId?: string
  description?: string
  metadata?: unknown
  dedupeKey?: string
}

/**
 * XP Service - Centralized XP event processing
 * All XP changes must go through this service
 */
export class XpService {
  /**
   * Calculate XP for phone-free block completion
   */
  static calculateBlockXp(durationMin: number): number {
    return durationMin * XP_CONFIG.PHONE_FREE_BLOCK_PER_MIN
  }

  /**
   * Calculate XP for urge resistance
   */
  static calculateUrgeXp(): number {
    return XP_CONFIG.URGE_RESIST
  }

  /**
   * Calculate XP for task completion
   */
  static calculateTaskXp(type: string, durationMin?: number): number {
    switch (type) {
      case 'exposure':
        return XP_CONFIG.TASK_EXPOSURE
      case 'job_search':
        return XP_CONFIG.TASK_JOB_SEARCH
      case 'habit':
        if (!durationMin) return 0
        const habitXp = durationMin * XP_CONFIG.TASK_HABIT_PER_MIN
        return Math.min(habitXp, XP_CONFIG.TASK_HABIT_MAX)
      default:
        return 0
    }
  }

  /**
   * Calculate XP penalty for usage violation
   */
  static calculateViolationPenalty(overageMin: number): number {
    return overageMin * XP_CONFIG.VIOLATION_PER_MIN
  }

  /**
   * Calculate user's level from total XP
   */
  static calculateLevel(totalXp: number): number {
    return XP_CONFIG.LEVEL_FORMULA(totalXp)
  }

  /**
   * Get hours reclaimed from XP total
   */
  static getHoursReclaimed(totalXp: number): number {
    return totalXp / 60 // 1 XP = 1 minute
  }

  /**
   * Get next milestone for user
   */
  static getNextMilestone(totalXp: number) {
    return XP_CONFIG.MILESTONES.find((m) => m.xp > totalXp) || null
  }

  /**
   * Create an XP event and update user's total XP
   * HP modulation: Positive XP gains are reduced based on current HP
   * - HP >= 85: 100% XP (excellent state)
   * - HP >= 60: 85% XP (good, but not optimal)
   * - HP < 60: 70% XP (struggling, shouldn't be pushing hard)
   */
  static async createEvent(
    params: CreateXpEventParams,
    tx?: Prisma.TransactionClient
  ) {
    const { userId, type, delta, relatedModel, relatedId, description, metadata, dedupeKey } =
      params
    const db = tx ?? prisma

    // Get user to check HP
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error(`User ${userId} not found`)

    // Apply HP modulation to positive XP gains only
    let modulatedDelta = delta
    let hpModulationApplied = false

    if (delta > 0) {
      // Calculate modulated XP based on HP
      if (user.currentHp >= 85) {
        modulatedDelta = delta // Full XP
      } else if (user.currentHp >= 60) {
        modulatedDelta = Math.floor(delta * 0.85) // 85%
        hpModulationApplied = true
      } else {
        modulatedDelta = Math.floor(delta * 0.7) // 70%
        hpModulationApplied = true
      }
    }

    // Create the XP event in the ledger (store both original and modulated)
    let event
    try {
      event = await db.xpEvent.create({
        data: {
          userId,
          type,
          delta: modulatedDelta,
          relatedModel,
          relatedId,
          dedupeKey,
          metadata: metadata as any,
          description: hpModulationApplied
            ? `${description} (HP modulated: ${delta} → ${modulatedDelta} @ ${user.currentHp} HP)`
            : description,
        },
      })
    } catch (error) {
      if (
        dedupeKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await db.xpEvent.findUnique({ where: { dedupeKey } })
        if (!existing) throw error
        const current = await db.user.findUnique({ where: { id: userId } })
        if (!current) throw new Error(`User ${userId} not found`)
        return {
          event: existing,
          newTotalXp: current.totalXp,
          newLevel: current.currentLevel,
          levelUp: false,
          hpModulated: false,
          originalDelta: delta,
          modulatedDelta: existing.delta,
          deduped: true,
        }
      }
      throw error
    }

    // Update user's total XP and level
    const newTotalXp = Math.max(0, user.totalXp + modulatedDelta) // Can't go below 0
    const newLevel = this.calculateLevel(newTotalXp)

    await db.user.update({
      where: { id: userId },
      data: {
        totalXp: newTotalXp,
        currentLevel: newLevel,
      },
    })

    return {
      event,
      newTotalXp,
      newLevel,
      levelUp: newLevel > user.currentLevel,
      hpModulated: hpModulationApplied,
      originalDelta: delta,
      modulatedDelta,
      deduped: false,
    }
  }

  /**
   * Get XP events for a user within a date range
   */
  static async getEvents(userId: string, startDate: Date, endDate: Date) {
    return prisma.xpEvent.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get daily XP summary
   */
  static async getDailyXp(userId: string, date: Date) {
    // The 'date' parameter is expected to be the user's start-of-day in UTC terms
    // Just use it directly as the start, and add 24 hours for the end
    const startOfDay = new Date(date)
    const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000)

    const events = await this.getEvents(userId, startOfDay, endOfDay)

    return {
      total: events.reduce((sum, e) => sum + e.delta, 0),
      events: events.length,
      breakdown: events.reduce(
        (acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + e.delta
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }

  /**
   * Get XP breakdown by source for display
   */
  static async getXpBreakdown(userId: string, startDate: Date, endDate: Date) {
    const events = await this.getEvents(userId, startDate, endDate)

    return {
      blocks: events
        .filter((e) => e.type === 'block_complete')
        .reduce((sum, e) => sum + e.delta, 0),
      urges: events
        .filter((e) => e.type === 'urge_resist')
        .reduce((sum, e) => sum + e.delta, 0),
      tasks: events
        .filter((e) => e.type === 'task_complete')
        .reduce((sum, e) => sum + e.delta, 0),
      penalties: events
        .filter((e) => e.type === 'violation_penalty' || e.type === 'truth_penalty')
        .reduce((sum, e) => sum + e.delta, 0),
      decay: events
        .filter((e) => e.type === 'decay')
        .reduce((sum, e) => sum + e.delta, 0),
    }
  }
}
