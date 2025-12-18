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
  }
  status: 'excellent' | 'good' | 'struggling'
}

export class HpService {
  /**
   * Calculate HP from sleep metrics using the Energy Equation
   * Formula:
   * - Base: 60 HP (minimum viable)
   * - Sleep duration: +0-25 HP (7.5h+ = max)
   * - Wake time adherence: +0-10 HP (on time = max)
   * - Subjective quality: +0-5 HP (5/5 = max)
   * - Morning light: +5 HP (outdoor light within 60min of wake)
   * - Alcohol: -15 HP per drink (poison effect)
   * - Late caffeine: -10 HP (within 6h of bed) or -5 HP (after 2pm)
   * - Screen before bed: -5 HP (30+ min in last hour)
   * - Late exercise: -5 HP (within 4h of bed)
   * - Late meal: -5 HP (within 3h of bed)
   * - Total: 0-100 HP
   */
  static calculateHp(metrics: SleepMetrics): HpCalculation {
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

    // ENERGY EQUATION PENALTIES & BONUSES

    // Alcohol penalty (-15 HP per drink)
    // Each standard drink = poison that destroys sleep quality
    if (metrics.alcoholUnits && metrics.alcoholUnits > 0) {
      breakdown.alcoholPenalty = metrics.alcoholUnits * 15
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
    if (metrics.gotMorningLight) {
      breakdown.morningLightBonus = 5
    }

    const totalHp = Math.max(
      0,
      Math.min(
        100,
        breakdown.base +
          breakdown.sleepDurationBonus +
          breakdown.wakeTimeBonus +
          breakdown.qualityBonus +
          breakdown.morningLightBonus -
          breakdown.alcoholPenalty -
          breakdown.caffeinePenalty -
          breakdown.screenPenalty -
          breakdown.lateExercisePenalty -
          breakdown.lateMealPenalty
      )
    )

    // Determine status
    let status: 'excellent' | 'good' | 'struggling'
    if (totalHp >= 85) status = 'excellent'
    else if (totalHp >= 60) status = 'good'
    else status = 'struggling'

    return {
      hp: totalHp,
      breakdown,
      status,
    }
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
   * Create or update sleep log for today
   */
  static async logSleep(
    userId: string,
    metrics: SleepMetrics
  ): Promise<{
    sleepLog: any
    hpCalculation: HpCalculation
    newHp: number
  }> {
    // Calculate HP
    const hpCalc = this.calculateHp(metrics)

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

    // Create or update sleep log
    const sleepLog = await prisma.sleepLog.upsert({
      where: {
        date: today,
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
    }
  }

  /**
   * Get today's sleep log
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
