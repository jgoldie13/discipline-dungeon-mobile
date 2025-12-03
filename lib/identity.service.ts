/**
 * Identity Service - Provides identity-based titles and archetypes
 * Supports identity-based habit formation (SDT + James Clear)
 */

export interface UserIdentity {
  title: string
  description: string
  emoji: string
  tier: number
}

export class IdentityService {
  /**
   * Get user's identity title based on level and streak
   * Progression: Apprentice → Ronin → Scholar → Master → Sage
   */
  static getUserIdentity(level: number, streak: number): UserIdentity {
    // Sage - Ultimate mastery
    if (level >= 20 && streak >= 90) {
      return {
        title: 'Sage',
        description: 'Master of self, walker of the Void',
        emoji: '🧙',
        tier: 5,
      }
    }

    // Master - Deep discipline
    if (level >= 15 && streak >= 60) {
      return {
        title: 'Master',
        description: 'Disciplined mind, unwavering focus',
        emoji: '⚔️',
        tier: 4,
      }
    }

    // Scholar - Consistent effort
    if (level >= 10 && streak >= 30) {
      return {
        title: 'Scholar',
        description: 'Student of the Way, building mastery',
        emoji: '📖',
        tier: 3,
      }
    }

    // Ronin - Building momentum
    if (level >= 5 && streak >= 7) {
      return {
        title: 'Ronin',
        description: 'Wandering warrior, finding the path',
        emoji: '🗡️',
        tier: 2,
      }
    }

    // Apprentice - Just starting
    return {
      title: 'Apprentice',
      description: 'Beginning the journey of discipline',
      emoji: '🎯',
      tier: 1,
    }
  }

  /**
   * Get identity affirmation message based on title
   * Uses "I am the type of person who..." framing
   */
  static getIdentityAffirmation(title: string): string {
    const affirmations: Record<string, string> = {
      Sage: 'I am the type of person who has mastered themselves and walks the Void with intrinsic purpose.',
      Master:
        'I am the type of person who honors commitments and maintains unwavering discipline.',
      Scholar:
        'I am the type of person who chooses growth over comfort, every single day.',
      Ronin:
        'I am the type of person who resists distraction and builds momentum through action.',
      Apprentice:
        'I am the type of person who takes the first step and commits to the path.',
    }

    return affirmations[title] || affirmations.Apprentice
  }

  /**
   * Get progress to next tier
   */
  static getProgressToNextTier(
    level: number,
    streak: number
  ): {
    currentTier: UserIdentity
    nextTier: UserIdentity | null
    levelProgress: number // 0-100
    streakProgress: number // 0-100
  } {
    const current = this.getUserIdentity(level, streak)

    // Define tier requirements
    const tiers: Array<{
      minLevel: number
      minStreak: number
      identity: UserIdentity
    }> = [
      {
        minLevel: 0,
        minStreak: 0,
        identity: this.getUserIdentity(0, 0),
      },
      {
        minLevel: 5,
        minStreak: 7,
        identity: this.getUserIdentity(5, 7),
      },
      {
        minLevel: 10,
        minStreak: 30,
        identity: this.getUserIdentity(10, 30),
      },
      {
        minLevel: 15,
        minStreak: 60,
        identity: this.getUserIdentity(15, 60),
      },
      {
        minLevel: 20,
        minStreak: 90,
        identity: this.getUserIdentity(20, 90),
      },
    ]

    // Find next tier
    const nextTier = tiers.find(
      (t) => t.minLevel > level || t.minStreak > streak
    )

    if (!nextTier) {
      // Max tier reached
      return {
        currentTier: current,
        nextTier: null,
        levelProgress: 100,
        streakProgress: 100,
      }
    }

    // Calculate progress
    const prevTier = tiers[tiers.indexOf(nextTier) - 1]
    const levelProgress = prevTier
      ? Math.min(
          100,
          ((level - prevTier.minLevel) /
            (nextTier.minLevel - prevTier.minLevel)) *
            100
        )
      : (level / nextTier.minLevel) * 100

    const streakProgress = prevTier
      ? Math.min(
          100,
          ((streak - prevTier.minStreak) /
            (nextTier.minStreak - prevTier.minStreak)) *
            100
        )
      : (streak / nextTier.minStreak) * 100

    return {
      currentTier: current,
      nextTier: nextTier.identity,
      levelProgress,
      streakProgress,
    }
  }

  /**
   * Get Musashi scroll alignment based on recent activity
   * Returns which scroll the user is currently "practicing"
   */
  static getScrollAlignment(stats: {
    sleepConsistency?: number // 0-100
    recoveryActions?: number // count last week
    exposureTasks?: number // count last week
    phoneFreeBlocks?: number // count last week
  }): {
    primaryScroll: string
    emoji: string
    description: string
  } {
    // Simple heuristic for now - can be enhanced with actual scroll progression later
    const {
      sleepConsistency = 0,
      recoveryActions = 0,
      exposureTasks = 0,
      phoneFreeBlocks = 0,
    } = stats

    if (sleepConsistency > 80) {
      return {
        primaryScroll: 'Earth',
        emoji: '🌍',
        description: 'Mastering circadian foundations',
      }
    }

    if (recoveryActions > 3) {
      return {
        primaryScroll: 'Water',
        emoji: '💧',
        description: 'Flowing with adaptability and recovery',
      }
    }

    if (exposureTasks > 3) {
      return {
        primaryScroll: 'Fire',
        emoji: '🔥',
        description: 'Forging will through exposure',
      }
    }

    if (phoneFreeBlocks > 5) {
      return {
        primaryScroll: 'Wind',
        emoji: '💨',
        description: 'Cutting through distraction',
      }
    }

    // Default to Fire (motivation/will)
    return {
      primaryScroll: 'Fire',
      emoji: '🔥',
      description: 'Beginning the path of discipline',
    }
  }
}
