import { prisma } from './prisma'

/**
 * HP Service - Manages health points (biological capacity)
 * HP represents your daily capacity for focused work and discipline
 * Based on: sleep duration, wake time adherence, subjective quality
 */

export interface SleepMetrics {
  bedtime: Date
  waketime: Date
  subjectiveRested: number // 1-5
  targetWakeTime?: string // "HH:MM" format

  // Energy Equation - Substances
  alcoholUnits?: number // Standard drinks consumed before bed
  caffeinePastNoon?: boolean // Had caffeine after 12pm?
  caffeineHoursBefore?: number // Hours before bed

  // Energy Equation - Light & Screen
  screenMinBefore?: number // Minutes of screen time before bed
  gotMorningLight?: boolean // Got outdoor light in morning

  // Energy Equation - Activity & Food
  exercisedToday?: boolean // Did any exercise today?
  exerciseHoursBefore?: number // Hours before bed
  lastMealHoursBefore?: number // Hours before bed
}

export interface HpCalculation {
  hp: number // 0-100
  breakdown: {
    base: number
    sleepDurationBonus: number
    wakeTimeBonus: number
    qualityBonus: number
    alcoholPenalty: number
    caffeinePenalty: number
    screenPenalty: number
    lateExercisePenalty: number
    lateMealPenalty: number
    morningLightBonus: number
    sleepRegularityBonus: number // NEW: 7-day consistency
    sedationTrapPenalty: number // NEW: alcohol × sleep interaction
  }
  status: 'excellent' | 'good' | 'struggling'
  message?: string // Educational feedback
}

export class HpService {
  /**
   * Calculate HP from sleep metrics using the Energy Equation
   * Research-backed formula (β coefficients from logistic regression studies)
   *
   * POSITIVE CONTRIBUTIONS (Max +40 HP):
   * - Base: 60 HP (minimum viable)
   * - Sleep duration: +0-25 HP (β=+0.60, 7.5h+ = max)
   * - Wake time adherence: +0-10 HP (circadian consistency)
   * - Subjective quality: +0-5 HP (self-reported 1-5 scale)
   * - Morning light: +5 HP (β=+0.40, Process C anchor)
   * - Sleep regularity: +0-10 HP (β=+0.55, 7-day consistency)
   *
   * PENALTIES (Can be severe):
   * - Alcohol: -12 to -60 HP (β=-0.85, graduated scale)
   * - "Sedation Trap": additional penalty (β=-0.15, alcohol × sleep interaction)
   * - Late caffeine: -10 HP (within 6h) or -5 HP (after 2pm)
   * - Screen before bed: -5 HP (30+ min, blue light disruption)
   * - Late exercise: -5 HP (within 4h, cortisol spike)
   * - Late meal: -5 HP (within 3h, digestive interference)
   *
   * Total: 0-100 HP (capped)
   */
  static async calculateHp(
    metrics: SleepMetrics,
    userId?: string
  ): Promise<HpCalculation> {
    const breakdown = {
      base: 60,
      sleepDurationBonus: 0,
      wakeTimeBonus: 0,
      qualityBonus: 0,
      alcoholPenalty: 0,
      caffeinePenalty: 0,
      screenPenalty: 0,
      lateExercisePenalty: 0,
      lateMealPenalty: 0,
      morningLightBonus: 0,
      sleepRegularityBonus: 0,
      sedationTrapPenalty: 0,
    }

    // Calculate sleep duration in hours
    const durationMs = metrics.waketime.getTime() - metrics.bedtime.getTime()
    const hoursSlept = durationMs / (1000 * 60 * 60)

    // Sleep duration bonus (0-25 HP)
    if (hoursSlept >= 7.5) {
      breakdown.sleepDurationBonus = 25
    } else if (hoursSlept >= 7.0) {
      breakdown.sleepDurationBonus = 20
    } else if (hoursSlept >= 6.5) {
      breakdown.sleepDurationBonus = 15
    } else if (hoursSlept >= 6.0) {
      breakdown.sleepDurationBonus = 10
    } else if (hoursSlept >= 5.5) {
      breakdown.sleepDurationBonus = 5
    }
    // < 5.5 hours = 0 bonus (you're struggling)

    // Wake time adherence bonus (0-10 HP)
    if (metrics.targetWakeTime) {
      const varianceMin = this.calculateWakeVariance(
        metrics.waketime,
        metrics.targetWakeTime
      )
      if (Math.abs(varianceMin) <= 15) {
        // Within ±15 min = full bonus
        breakdown.wakeTimeBonus = 10
      } else if (Math.abs(varianceMin) <= 30) {
        // Within ±30 min = half bonus
        breakdown.wakeTimeBonus = 5
      }
    }

    // Subjective quality bonus (0-5 HP)
    // Direct mapping: 1→1, 2→2, 3→3, 4→4, 5→5
    breakdown.qualityBonus = Math.max(
      0,
      Math.min(5, metrics.subjectiveRested)
    )

    // ==========================================
    // ENERGY EQUATION PENALTIES & BONUSES
    // Research: β coefficients from sleep science
    // ==========================================

    // Alcohol penalty (β=-0.85, strongest negative predictor)
    // Graduated scale: REM suppression increases non-linearly
    // Research: "Sedation is NOT sleep" - alcohol degrades architecture
    const drinks = metrics.alcoholUnits || 0
    if (drinks === 0) {
      breakdown.alcoholPenalty = 0
    } else if (drinks === 1) {
      breakdown.alcoholPenalty = 12 // Slight mercy for one drink
    } else if (drinks === 2) {
      breakdown.alcoholPenalty = 26 // -12 + -14
    } else {
      // 3+ drinks: accelerating penalty (REM rebound fragmentation)
      breakdown.alcoholPenalty = 26 + (drinks - 2) * 17
    }

    // Caffeine penalty (-10 HP for caffeine close to bed, -5 HP for afternoon)
    if (metrics.caffeineHoursBefore && metrics.caffeineHoursBefore < 6) {
      breakdown.caffeinePenalty = 10 // Caffeine within 6h of bed - worse!
    } else if (metrics.caffeinePastNoon) {
      breakdown.caffeinePenalty = 5 // Had caffeine after 2pm
    }

    // Screen time penalty (-5 HP for 30+ min screen before bed)
    if (metrics.screenMinBefore && metrics.screenMinBefore >= 30) {
      breakdown.screenPenalty = 5
    }

    // Late exercise penalty (-5 HP for exercise within 4h of bed)
    if (metrics.exerciseHoursBefore && metrics.exerciseHoursBefore < 4 && metrics.exerciseHoursBefore > 0) {
      breakdown.lateExercisePenalty = 5
    }

    // Late meal penalty (-5 HP for eating within 3h of bed)
    if (metrics.lastMealHoursBefore && metrics.lastMealHoursBefore < 3 && metrics.lastMealHoursBefore > 0) {
      breakdown.lateMealPenalty = 5
    }

    // Morning light bonus (+5 HP for outdoor light within 60min of wake)
    // Research: β=+0.40 (Process C circadian anchor)
    if (metrics.gotMorningLight) {
      breakdown.morningLightBonus = 5
    }

    // ==========================================
    // INTERACTION TERMS (Research: non-linear biology)
    // ==========================================

    // "Sedation Trap" (β=-0.15): Alcohol × Sleep Duration
    // Research finding: More sleep doesn't help as much when alcohol is present
    // Alcohol degrades sleep architecture (REM suppression, fragmentation)
    if (drinks > 0 && hoursSlept > 6) {
      // Each drink reduces sleep benefit by 3 HP
      // 2 drinks + 8h sleep: -6 HP penalty (sleep less restorative)
      breakdown.sedationTrapPenalty = drinks * 3
    }

    // Sleep Regularity Index (SRI) bonus (β=+0.55)
    // Research: Almost as powerful as sleep duration itself
    // Requires 7+ days of history to calculate
    if (userId) {
      const last7Days = await this.getLast7DaysSleepLogs(userId)
      if (last7Days.length >= 7) {
        const sri = this.calculateSleepRegularityIndex(last7Days)

        // SRI Scale: 0-100
        // 90+ = excellent consistency (+10 HP)
        // 80-89 = good consistency (+5 HP)
        // <80 = inconsistent (0 HP)
        if (sri >= 90) breakdown.sleepRegularityBonus = 10
        else if (sri >= 80) breakdown.sleepRegularityBonus = 5
      }
    }

    const totalHp = Math.max(
      0,
      Math.min(
        100,
        breakdown.base +
          breakdown.sleepDurationBonus +
          breakdown.wakeTimeBonus +
          breakdown.qualityBonus +
          breakdown.morningLightBonus +
          breakdown.sleepRegularityBonus -
          breakdown.alcoholPenalty -
          breakdown.caffeinePenalty -
          breakdown.screenPenalty -
          breakdown.lateExercisePenalty -
          breakdown.lateMealPenalty -
          breakdown.sedationTrapPenalty
      )
    )

    // Determine status
    let status: 'excellent' | 'good' | 'struggling'
    if (totalHp >= 85) status = 'excellent'
    else if (totalHp >= 60) status = 'good'
    else status = 'struggling'

    // Generate educational message based on breakdown
    const message = this.generateHpMessage(totalHp, breakdown, drinks, hoursSlept)

    return {
      hp: totalHp,
      breakdown,
      status,
      message,
    }
  }

  /**
   * Generate educational HP message based on breakdown
   * Provides actionable feedback on sleep quality
   */
  private static generateHpMessage(
    hp: number,
    breakdown: any,
    drinks: number,
    hoursSlept: number
  ): string {
    // Critical issues (alcohol)
    if (breakdown.alcoholPenalty > 20) {
      return `Alcohol severely degraded sleep quality (${drinks} drinks). REM suppression detected. "Sedation is not sleep."`
    }

    // Excellent performance
    if (hp >= 85 && breakdown.sleepRegularityBonus === 10) {
      return 'Peak biological readiness. Excellent sleep consistency. Full XP gains enabled.'
    }

    if (hp >= 85) {
      return 'Excellent! Peak performance state. Go crush those boss battles.'
    }

    // Good but with room for improvement
    if (hp >= 60 && breakdown.sleepRegularityBonus === 0 && hoursSlept >= 7) {
      return 'Good energy, but inconsistent sleep timing. Build a 7-day streak for +10 HP bonus.'
    }

    // Struggling - need recovery
    if (hp < 60 && breakdown.sleepDurationBonus < 15) {
      return 'Acute sleep debt detected. HP reduced. Prioritize recovery today. Consider NSDR.'
    }

    if (hp < 60) {
      return 'Low HP. System is protecting you from overexertion. Light tasks only today.'
    }

    return 'Good energy. You can work effectively, but not at peak.'
  }

  /**
   * Calculate Sleep Regularity Index (SRI) from last 7 days
   * SRI measures day-to-day consistency in sleep/wake times
   * Returns 0-100 (100 = perfect consistency)
   * Research: β=+0.55 (almost as powerful as sleep duration)
   */
  private static calculateSleepRegularityIndex(logs: any[]): number {
    if (logs.length < 7) return 0

    const last7Days = logs.slice(-7)

    // Calculate variance in wake times (minutes from mean)
    const wakeTimes = last7Days.map((log) => {
      const wake = new Date(log.waketime)
      return wake.getHours() * 60 + wake.getMinutes()
    })

    const meanWake = wakeTimes.reduce((a, b) => a + b) / wakeTimes.length
    const wakeVariance =
      wakeTimes.reduce((sum, time) => sum + Math.pow(time - meanWake, 2), 0) /
      wakeTimes.length
    const wakeStdDev = Math.sqrt(wakeVariance)

    // Calculate variance in bedtimes
    const bedTimes = last7Days.map((log) => {
      const bed = new Date(log.bedtime)
      return bed.getHours() * 60 + bed.getMinutes()
    })

    const meanBed = bedTimes.reduce((a, b) => a + b) / bedTimes.length
    const bedVariance =
      bedTimes.reduce((sum, time) => sum + Math.pow(time - meanBed, 2), 0) /
      bedTimes.length
    const bedStdDev = Math.sqrt(bedVariance)

    // SRI formula (simplified)
    // Perfect consistency (±15 min) = 100
    // High variance (>60 min) = 0
    const avgStdDev = (wakeStdDev + bedStdDev) / 2

    if (avgStdDev <= 15) return 100
    if (avgStdDev <= 30) return 85
    if (avgStdDev <= 45) return 70
    if (avgStdDev <= 60) return 50
    return Math.max(0, 50 - (avgStdDev - 60))
  }

  /**
   * Get last 7 days of sleep logs for SRI calculation
   */
  private static async getLast7DaysSleepLogs(userId: string) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    return prisma.sleepLog.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
      take: 7,
    })
  }

  /**
   * Calculate wake time variance in minutes
   * Positive = woke up late, Negative = woke up early
   */
  static calculateWakeVariance(
    actualWake: Date,
    targetTimeStr: string
  ): number {
    const [targetHour, targetMin] = targetTimeStr.split(':').map(Number)

    const targetWake = new Date(actualWake)
    targetWake.setHours(targetHour, targetMin, 0, 0)

    const diffMs = actualWake.getTime() - targetWake.getTime()
    return Math.round(diffMs / (1000 * 60)) // minutes
  }

  /**
   * Apply HP modulation to XP gain
   * - HP >= 85: 100% XP (excellent state)
   * - HP >= 60: 85% XP (good, but not optimal)
   * - HP < 60: 70% XP (struggling, shouldn't be pushing hard)
   */
  static modulateXpGain(baseXp: number, currentHp: number): number {
    if (currentHp >= 85) return baseXp // Full XP
    if (currentHp >= 60) return Math.floor(baseXp * 0.85) // 85%
    return Math.floor(baseXp * 0.7) // 70% - you need rest
  }

  /**
   * Get HP color for UI
   */
  static getHpColor(hp: number): string {
    if (hp >= 85) return 'green'
    if (hp >= 60) return 'yellow'
    return 'red'
  }

  /**
   * Get HP message for UI
   */
  static getHpMessage(hp: number): string {
    if (hp >= 85)
      return 'Excellent! Peak performance state. Go crush those boss battles.'
    if (hp >= 60)
      return 'Good energy. You can work effectively, but not at peak.'
    return 'Low HP. Prioritize recovery today. NSDR and light tasks only.'
  }

  /**
   * Create or update sleep log for today (with audit trail for edits)
   */
  static async logSleep(
    userId: string,
    metrics: SleepMetrics
  ): Promise<{
    sleepLog: any
    hpCalculation: HpCalculation
    newHp: number
    wasEdited: boolean
  }> {
    // Calculate HP (pass userId for SRI calculation)
    const hpCalc = await this.calculateHp(metrics, userId)

    // Calculate sleep duration
    const durationMs =
      metrics.waketime.getTime() - metrics.bedtime.getTime()
    const sleepDurationMin = Math.round(durationMs / (1000 * 60))

    // Calculate wake variance
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const wakeVarianceMin = user?.targetWakeTime
      ? this.calculateWakeVariance(metrics.waketime, user.targetWakeTime)
      : 0
    const wakeOnTime = Math.abs(wakeVarianceMin) <= 15

    // Get today's date (use waketime as "today")
    const today = new Date(metrics.waketime)
    today.setHours(0, 0, 0, 0)

    // Check if log already exists (to determine create vs edit)
    const existingLog = await prisma.sleepLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    })

    const wasEdited = !!existingLog
    const newEditCount = existingLog ? existingLog.editCount + 1 : 0

    // Create or update sleep log
    const sleepLog = await prisma.sleepLog.upsert({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      create: {
        userId,
        date: today,
        bedtime: metrics.bedtime,
        waketime: metrics.waketime,
        sleepDurationMin,
        subjectiveRested: metrics.subjectiveRested,
        sleepQuality: hpCalc.hp,
        wakeOnTime,
        wakeVarianceMin,
        hpCalculated: hpCalc.hp,
        editCount: 0,
        // Energy Equation fields
        alcoholUnits: metrics.alcoholUnits || 0,
        caffeinePastNoon: metrics.caffeinePastNoon || false,
        caffeineHoursBefore: metrics.caffeineHoursBefore || 0,
        screenMinBefore: metrics.screenMinBefore || 0,
        gotMorningLight: metrics.gotMorningLight || false,
        exercisedToday: metrics.exercisedToday || false,
        exerciseHoursBefore: metrics.exerciseHoursBefore || 0,
        lastMealHoursBefore: metrics.lastMealHoursBefore || 0,
      },
      update: {
        bedtime: metrics.bedtime,
        waketime: metrics.waketime,
        sleepDurationMin,
        subjectiveRested: metrics.subjectiveRested,
        sleepQuality: hpCalc.hp,
        wakeOnTime,
        wakeVarianceMin,
        hpCalculated: hpCalc.hp,
        editCount: newEditCount,
        // Energy Equation fields
        alcoholUnits: metrics.alcoholUnits || 0,
        caffeinePastNoon: metrics.caffeinePastNoon || false,
        caffeineHoursBefore: metrics.caffeineHoursBefore || 0,
        screenMinBefore: metrics.screenMinBefore || 0,
        gotMorningLight: metrics.gotMorningLight || false,
        exercisedToday: metrics.exercisedToday || false,
        exerciseHoursBefore: metrics.exerciseHoursBefore || 0,
        lastMealHoursBefore: metrics.lastMealHoursBefore || 0,
      },
    })

    // Create audit event if this was an edit (not initial creation)
    if (wasEdited) {
      await prisma.auditEvent.create({
        data: {
          userId,
          type: 'SLEEP_LOG_EDIT',
          description: `Edited sleep log for ${today.toISOString().split('T')[0]}`,
          entityType: 'SleepLog',
          entityId: sleepLog.id,
          metadata: {
            editCount: newEditCount,
            oldHp: existingLog.hpCalculated,
            newHp: hpCalc.hp,
            hpChange: hpCalc.hp - existingLog.hpCalculated,
          },
        },
      })
    }

    // Update user's current HP
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentHp: hpCalc.hp,
        lastHpUpdate: new Date(),
      },
    })

    return {
      sleepLog,
      hpCalculation: hpCalc,
      newHp: hpCalc.hp,
      wasEdited,
    }
  }

  /**
   * Get today's sleep log with full HP breakdown
   */
  static async getTodaySleepLog(userId: string, date?: Date) {
    const today = date || new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return prisma.sleepLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })
  }

  /**
   * Get today's sleep log with calculated HP breakdown
   * Returns null if no sleep log exists for today
   */
  static async getTodayHpBreakdown(userId: string, date?: Date): Promise<{
    sleepLog: any
    hpCalculation: HpCalculation
    isEdited: boolean
  } | null> {
    const sleepLog = await this.getTodaySleepLog(userId, date)
    if (!sleepLog) return null

    // Recalculate HP from sleep log data (pass userId for SRI)
    const hpCalc = await this.calculateHp({
      bedtime: sleepLog.bedtime,
      waketime: sleepLog.waketime,
      subjectiveRested: sleepLog.subjectiveRested,
      alcoholUnits: sleepLog.alcoholUnits,
      caffeinePastNoon: sleepLog.caffeinePastNoon,
      caffeineHoursBefore: sleepLog.caffeineHoursBefore,
      screenMinBefore: sleepLog.screenMinBefore,
      gotMorningLight: sleepLog.gotMorningLight,
      exercisedToday: sleepLog.exercisedToday,
      exerciseHoursBefore: sleepLog.exerciseHoursBefore,
      lastMealHoursBefore: sleepLog.lastMealHoursBefore,
    }, userId)

    return {
      sleepLog,
      hpCalculation: hpCalc,
      isEdited: sleepLog.editCount > 0,
    }
  }

  /**
   * Get sleep log for a specific date
   */
  static async getSleepLog(userId: string, date: Date) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    return prisma.sleepLog.findFirst({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    })
  }

  /**
   * Get sleep consistency (last 7 days)
   */
  static async getSleepConsistency(
    userId: string
  ): Promise<{
    consistency: number // 0-100
    avgDuration: number // hours
    avgHp: number // 0-100
  }> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const logs = await prisma.sleepLog.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { date: 'desc' },
    })

    if (logs.length === 0) {
      return { consistency: 0, avgDuration: 0, avgHp: 60 }
    }

    // Calculate average duration
    const avgDurationMin =
      logs.reduce((sum, log) => sum + log.sleepDurationMin, 0) / logs.length
    const avgDuration = avgDurationMin / 60

    // Calculate average HP
    const avgHp =
      logs.reduce((sum, log) => sum + log.hpCalculated, 0) / logs.length

    // Calculate consistency (based on wake time variance)
    const avgVariance =
      logs.reduce((sum, log) => sum + Math.abs(log.wakeVarianceMin), 0) /
      logs.length
    // Perfect consistency = 0 min variance = 100
    // 60+ min variance = 0 consistency
    const consistency = Math.max(0, Math.min(100, 100 - avgVariance * 1.67))

    return {
      consistency: Math.round(consistency),
      avgDuration: Math.round(avgDuration * 10) / 10,
      avgHp: Math.round(avgHp),
    }
  }
}
