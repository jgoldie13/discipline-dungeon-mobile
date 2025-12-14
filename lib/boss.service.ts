import { prisma } from './prisma'
import { XpService } from './xp.service'

/**
 * Boss Service - Manages boss battles (gamified deep work sessions)
 *
 * Boss battles turn large tasks (exams, papers, problem sets) into HP bars
 * that you defeat through focused phone-free work blocks.
 *
 * Time-of-day logic rewards working during peak cognitive hours (morning).
 */

export interface BossTask {
  id: string
  title: string
  description?: string
  bossHp: number
  bossHpRemaining: number
  bossDifficulty: 'easy' | 'medium' | 'hard' | 'brutal'
  optimalWindow?: 'morning' | 'afternoon' | 'evening'
  scheduledTime?: Date
  completed: boolean
}

export interface BossDamageCalculation {
  baseDamage: number
  timeOfDayMultiplier: number
  finalDamage: number
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  explanation: string
}

export class BossService {
  // Damage calculation: 1 minute of phone-free work = 1 base damage
  static readonly BASE_DAMAGE_PER_MIN = 1

  // Time-of-day multipliers (research-backed cognitive peaks)
  static readonly TIME_MULTIPLIERS = {
    morning: 1.2, // 06:00-12:00 - Peak cortisol, peak focus (Huberman)
    afternoon: 1.0, // 12:00-18:00 - Normal
    evening: 0.8, // 18:00-00:00 - Lower energy, wind-down
  }

  // Boss difficulty HP ranges
  static readonly DIFFICULTY_HP_RANGES = {
    easy: { min: 60, max: 120 }, // 1-2 hours
    medium: { min: 120, max: 240 }, // 2-4 hours
    hard: { min: 240, max: 360 }, // 4-6 hours
    brutal: { min: 360, max: 600 }, // 6-10 hours
  }

  // XP rewards by difficulty (on boss defeat)
  static readonly BOSS_XP_REWARDS = {
    easy: 100,
    medium: 250,
    hard: 500,
    brutal: 1000,
  }

  /**
   * Create a new boss task
   */
  static async createBoss(
    userId: string,
    data: {
      title: string
      description?: string
      difficulty: 'easy' | 'medium' | 'hard' | 'brutal'
      estimatedHours: number
      optimalWindow?: 'morning' | 'afternoon' | 'evening'
      scheduledTime?: Date
    }
  ) {
    const bossHp = data.estimatedHours * 60 // Convert hours to HP (1 min = 1 HP)

    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        type: 'boss',
        isBoss: true,
        bossHp,
        bossHpRemaining: bossHp,
        bossDifficulty: data.difficulty,
        optimalWindow: data.optimalWindow,
        scheduledTime: data.scheduledTime,
        durationMin: data.estimatedHours * 60,
      },
    })

    return task
  }

  /**
   * Calculate damage dealt to boss from a phone-free block
   */
  static calculateDamage(
    blockDurationMin: number,
    blockStartTime: Date
  ): BossDamageCalculation {
    // Determine time of day
    const hour = blockStartTime.getHours()
    let timeOfDay: 'morning' | 'afternoon' | 'evening'
    if (hour >= 6 && hour < 12) {
      timeOfDay = 'morning'
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = 'afternoon'
    } else {
      timeOfDay = 'evening'
    }

    const multiplier = this.TIME_MULTIPLIERS[timeOfDay]
    const baseDamage = blockDurationMin * this.BASE_DAMAGE_PER_MIN
    const finalDamage = Math.floor(baseDamage * multiplier)

    let explanation = `${blockDurationMin} min block`
    if (multiplier !== 1.0) {
      explanation += ` × ${multiplier}x (${timeOfDay})`
    }
    explanation += ` = ${finalDamage} damage`

    return {
      baseDamage,
      timeOfDayMultiplier: multiplier,
      finalDamage,
      timeOfDay,
      explanation,
    }
  }

  /**
   * Attack a boss with a phone-free block
   * Returns true if boss was defeated
   */
  static async attackBoss(
    taskId: string,
    blockId: string,
    userId: string
  ): Promise<{
    boss: BossTask
    damage: BossDamageCalculation
    defeated: boolean
    xpEarned: number
    message: string
  }> {
    // Get boss task (must belong to the current user)
    const task = await prisma.task.findFirst({ where: { id: taskId, userId } })
    if (!task || !task.isBoss) {
      throw new Error('Task is not a boss')
    }

    // Get phone-free block (must belong to the current user)
    const block = await prisma.phoneFreeBlock.findFirst({
      where: { id: blockId, userId },
    })
    if (!block) {
      throw new Error('Block not found')
    }

    if (!block.endTime) {
      throw new Error('Block not yet completed')
    }

    // Calculate damage
    const damage = this.calculateDamage(block.durationMin, block.startTime)

    // Get user HP for analytics
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const userHp = user?.currentHp || 100

    // Apply damage to boss
    const newHpRemaining = Math.max(
      0,
      (task.bossHpRemaining || task.bossHp || 0) - damage.finalDamage
    )
    const defeated = newHpRemaining === 0

    // Create BossBlock record
    await prisma.bossBlock.create({
      data: {
        taskId,
        blockId,
        damageDealt: damage.finalDamage,
        timeOfDay: damage.timeOfDay,
        multiplier: damage.timeOfDayMultiplier,
        userHp,
        blockDurationMin: block.durationMin,
      },
    })

    // Update block to link to boss
    await prisma.phoneFreeBlock.update({
      where: { id: blockId },
      data: {
        isBossBlock: true,
        linkedBossId: taskId,
        timeOfDay: damage.timeOfDay,
        damageDealt: damage.finalDamage,
      },
    })

    let xpEarned = 0
    let message = `Dealt ${damage.finalDamage} damage to ${task.title}!`

    // Update task
    if (defeated) {
      // Boss defeated!
      await prisma.task.update({
        where: { id: taskId },
        data: {
          bossHpRemaining: 0,
          completed: true,
          completedAt: new Date(),
        },
      })

      // Grant completion XP
      const difficultyXp =
        this.BOSS_XP_REWARDS[
          task.bossDifficulty as keyof typeof this.BOSS_XP_REWARDS
        ] || 100
      xpEarned = difficultyXp

      await XpService.createEvent({
        userId,
        type: 'task_complete',
        delta: xpEarned,
        relatedModel: 'Task',
        relatedId: taskId,
        description: `Defeated boss: ${task.title} (${task.bossDifficulty})`,
      })

      message = `🎉 BOSS DEFEATED! ${task.title} has been vanquished! +${xpEarned} XP`
    } else {
      // Update remaining HP
      await prisma.task.update({
        where: { id: taskId },
        data: {
          bossHpRemaining: newHpRemaining,
        },
      })

      message += ` ${newHpRemaining}/${task.bossHp} HP remaining.`
    }

    const updatedTask = await prisma.task.findFirst({ where: { id: taskId, userId } })

    return {
      boss: updatedTask as BossTask,
      damage,
      defeated,
      xpEarned,
      message,
    }
  }

  /**
   * Get boss task details with attack history
   */
  static async getBossDetails(userId: string, taskId: string) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        bossBlocks: {
          include: {
            block: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!task || !task.isBoss) {
      throw new Error('Task is not a boss')
    }

    // Calculate stats
    const totalDamageDealt = task.bossBlocks.reduce(
      (sum, bb) => sum + bb.damageDealt,
      0
    )
    const totalBlocksUsed = task.bossBlocks.length
    const averageDamagePerBlock =
      totalBlocksUsed > 0 ? totalDamageDealt / totalBlocksUsed : 0

    const hpPercentRemaining =
      ((task.bossHpRemaining || 0) / (task.bossHp || 1)) * 100

    return {
      task,
      stats: {
        totalDamageDealt,
        totalBlocksUsed,
        averageDamagePerBlock: Math.round(averageDamagePerBlock),
        hpPercentRemaining: Math.round(hpPercentRemaining),
      },
      attacks: task.bossBlocks,
    }
  }

  /**
   * Get all active bosses for a user
   */
  static async getActiveBosses(userId: string) {
    const bosses = await prisma.task.findMany({
      where: {
        userId,
        isBoss: true,
        completed: false,
      },
      include: {
        bossBlocks: {
          select: {
            damageDealt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return bosses.map((boss) => {
      const totalDamage = boss.bossBlocks.reduce(
        (sum, bb) => sum + bb.damageDealt,
        0
      )
      const hpPercent = ((boss.bossHpRemaining || 0) / (boss.bossHp || 1)) * 100

      return {
        ...boss,
        totalDamageDealt: totalDamage,
        hpPercentRemaining: Math.round(hpPercent),
      }
    })
  }

  /**
   * Get recommended time window for a boss based on difficulty
   */
  static getRecommendedWindow(
    difficulty: 'easy' | 'medium' | 'hard' | 'brutal'
  ): {
    window: 'morning' | 'afternoon' | 'evening'
    reason: string
  } {
    if (difficulty === 'brutal' || difficulty === 'hard') {
      return {
        window: 'morning',
        reason: 'Peak cognitive performance (06:00-12:00). 1.2x damage bonus.',
      }
    } else if (difficulty === 'medium') {
      return {
        window: 'morning',
        reason: 'Morning focus helps. 1.2x damage bonus.',
      }
    } else {
      return {
        window: 'afternoon',
        reason: 'Standard window. Normal damage.',
      }
    }
  }

  /**
   * Suggest HP estimate based on task description
   * Simple heuristic for common academic tasks
   */
  static suggestHpEstimate(title: string, description?: string): {
    estimatedHours: number
    difficulty: 'easy' | 'medium' | 'hard' | 'brutal'
    reasoning: string
  } {
    const text = (title + ' ' + (description || '')).toLowerCase()

    // Brutal (6-10 hours)
    if (
      text.includes('final exam') ||
      text.includes('midterm') ||
      text.includes('research paper') ||
      text.includes('thesis')
    ) {
      return {
        estimatedHours: 8,
        difficulty: 'brutal',
        reasoning: 'Major exam/paper - requires sustained deep focus',
      }
    }

    // Hard (4-6 hours)
    if (
      text.includes('problem set') ||
      text.includes('assignment') ||
      text.includes('essay') ||
      text.includes('project')
    ) {
      return {
        estimatedHours: 5,
        difficulty: 'hard',
        reasoning: 'Substantial academic work - multiple hours required',
      }
    }

    // Medium (2-4 hours)
    if (
      text.includes('reading') ||
      text.includes('study') ||
      text.includes('review') ||
      text.includes('homework')
    ) {
      return {
        estimatedHours: 3,
        difficulty: 'medium',
        reasoning: 'Standard academic task - focused session needed',
      }
    }

    // Easy (1-2 hours)
    return {
      estimatedHours: 1.5,
      difficulty: 'easy',
      reasoning: 'Light task - single focused session',
    }
  }
}
