import { prisma } from './prisma'
import { HpService, type SleepMetrics } from './hp.service'
import { DEFAULT_TIMEZONE, getUserDayBoundsUtc, getUserDayKeyUtc } from './time'

export class EnergyService {
  static async recomputeDailyHp(userId: string, date: Date = new Date()) {
    const dayKey = getUserDayKeyUtc(DEFAULT_TIMEZONE, date)
    const { startUtc, endUtc } = getUserDayBoundsUtc(DEFAULT_TIMEZONE, date)

    const canonicalSleepLog = await prisma.sleepLog.findUnique({
      where: {
        userId_date: {
          userId,
          date: dayKey,
        },
      },
    })

    const sleepLog =
      canonicalSleepLog ??
      (await prisma.sleepLog.findFirst({
        where: {
          userId,
          date: {
            gte: startUtc,
            lt: endUtc,
          },
        },
        orderBy: { date: 'desc' },
      }))

    if (!sleepLog) {
      return { updated: false, reason: 'no_sleep_log' as const }
    }

    const canonicalProtocol = await prisma.dailyProtocol.findUnique({
      where: {
        userId_date: {
          userId,
          date: dayKey,
        },
      },
    })

    const protocol =
      canonicalProtocol ??
      (await prisma.dailyProtocol.findFirst({
        where: {
          userId,
          date: {
            gte: startUtc,
            lt: endUtc,
          },
        },
        orderBy: { date: 'desc' },
      }))

    const metrics: SleepMetrics = {
      bedtime: sleepLog.bedtime,
      waketime: sleepLog.waketime,
      subjectiveRested: sleepLog.subjectiveRested,
      alcoholUnits: sleepLog.alcoholUnits,
      caffeinePastNoon: sleepLog.caffeinePastNoon,
      caffeineHoursBefore: sleepLog.caffeineHoursBefore,
      screenMinBefore: sleepLog.screenMinBefore,
      gotMorningLight: !!(sleepLog.gotMorningLight || protocol?.gotMorningLight),
      exercisedToday: sleepLog.exercisedToday,
      exerciseHoursBefore: sleepLog.exerciseHoursBefore,
      lastMealHoursBefore: sleepLog.lastMealHoursBefore,
    }

    const hpCalculation = await HpService.calculateHp(metrics, userId)

    await prisma.user.update({
      where: { id: userId },
      data: {
        currentHp: hpCalculation.hp,
        lastHpUpdate: new Date(),
      },
    })

    return {
      updated: true,
      hpCalculation,
      hp: hpCalculation.hp,
      sleepLog,
      protocol: protocol ?? null,
    }
  }
}
