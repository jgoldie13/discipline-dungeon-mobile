import { prisma } from './prisma'
import {
  getUserDayKeyUtc,
  getUserLocalDayString,
  isValidIanaTimezone,
  resolveUserTimezone,
} from './time'

export const REASON_MIN_LEN = 10
export const RECONCILE_THRESHOLD_MINUTES = 5

export type AutoLogStatus = 'available' | 'missing' | 'unavailable'

export type AutoLogResult = {
  minutes: number | null
  status: AutoLogStatus
}

export function isMissingTableError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  if (err?.code === 'P2021') return true
  if (typeof err?.message === 'string') {
    const msg = err.message.toLowerCase()
    if (msg.includes('relation') && msg.includes('does not exist')) return true
    if (msg.includes('does not exist') && msg.includes('phonedailyautolog')) {
      return true
    }
    if (msg.includes('does not exist') && msg.includes('iosscreentimeconnection')) {
      return true
    }
  }
  return false
}

export function isMissingUniqueConstraintError(error: unknown): boolean {
  const err = error as { code?: string; message?: string }
  if (err?.code === 'P2002') return true
  if (typeof err?.message === 'string') {
    const msg = err.message.toLowerCase()
    if (msg.includes('on conflict') && msg.includes('no unique')) return true
    if (msg.includes('no unique or exclusion constraint')) return true
  }
  return false
}

export async function safeFindPhoneDailyAutoLog(
  userId: string,
  date: Date,
  timezone?: string
): Promise<AutoLogResult> {
  try {
    const rows = await prisma.$queryRaw<{ minutes: number }[]>`
      SELECT minutes FROM "PhoneDailyAutoLog"
      WHERE "userId" = ${userId} AND "date" = ${date}
      LIMIT 1
    `
    if (!rows[0]) {
      const legacyDate =
        timezone && timezone.length > 0
          ? getLegacyUtcDayKey(timezone, date)
          : null
      if (legacyDate && legacyDate.getTime() !== date.getTime()) {
        const legacyRows = await prisma.$queryRaw<{ minutes: number }[]>`
          SELECT minutes FROM "PhoneDailyAutoLog"
          WHERE "userId" = ${userId} AND "date" = ${legacyDate}
          LIMIT 1
        `
        if (legacyRows[0]) {
          return { minutes: legacyRows[0].minutes, status: 'available' }
        }
      }
      return { minutes: null, status: 'missing' }
    }
    return { minutes: rows[0].minutes, status: 'available' }
  } catch (error) {
    if (isMissingTableError(error)) {
      return { minutes: null, status: 'unavailable' }
    }
    throw error
  }
}

export async function safeFindUserTimezone(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    if (isValidIanaTimezone(user?.timezone)) {
      return user.timezone
    }
  } catch (error) {
    if (isMissingTableError(error)) return resolveUserTimezone(null)
    throw error
  }

  try {
    const conn = await prisma.iosScreenTimeConnection.findUnique({
      where: { userId },
      select: { timezone: true },
    })
    if (isValidIanaTimezone(conn?.timezone)) {
      return conn.timezone
    }
    return resolveUserTimezone(null)
  } catch (error) {
    if (isMissingTableError(error)) return resolveUserTimezone(null)
    throw error
  }
}

export type DateKeyResolution = {
  dateKey: string // YYYY-MM-DD
  timezone: string // IANA timezone used
  startOfDay: Date // UTC Date representing start of day in user timezone
}

/**
 * Resolves the date key for a given user, accounting for their timezone
 * Returns both the date key string and the timezone used for diagnostics
 */
export async function resolveDateKey(
  userId: string,
  dateString?: string | null
): Promise<DateKeyResolution> {
  let timezone: string
  let dateKey: string
  const now = new Date()

  if (dateString) {
    // If explicit date provided, use UTC as timezone reference
    dateKey = dateString
    timezone = 'UTC'
  } else {
    // Get user's timezone from their iOS connection settings
    timezone = await safeFindUserTimezone(userId)
    try {
      dateKey = getUserLocalDayString(timezone, now)
    } catch (error) {
      if (error instanceof RangeError) {
        // Invalid timezone, fallback to UTC
        timezone = resolveUserTimezone(null)
        dateKey = getUserLocalDayString(timezone, now)
      } else {
        throw error
      }
    }
  }

  const startOfDay =
    timezone === 'UTC' && dateString
      ? new Date(`${dateKey}T00:00:00.000Z`)
      : getUserDayKeyUtc(timezone, now)

  return {
    dateKey,
    timezone,
    startOfDay,
  }
}

/**
 * Legacy helper for backwards compatibility
 * @deprecated Use resolveDateKey instead
 */
export async function resolveDateKeyString(
  userId: string,
  dateString?: string | null
): Promise<string> {
  const result = await resolveDateKey(userId, dateString)
  return result.dateKey
}

/**
 * Upserts a usage violation record (idempotent)
 * Uses the composite unique key (userId, date) to prevent duplicates
 */
export async function upsertUsageViolation(params: {
  userId: string
  date: Date
  overage: number
  timezone?: string
}) {
  const penalty = `Lost XP and streak - ${params.overage} minutes over limit`
  const legacyDate =
    params.timezone && params.timezone.length > 0
      ? getLegacyUtcDayKey(params.timezone, params.date)
      : null

  if (legacyDate && legacyDate.getTime() !== params.date.getTime()) {
    const existing = await prisma.usageViolation.findFirst({
      where: {
        userId: params.userId,
        date: {
          in: [params.date, legacyDate],
        },
      },
      orderBy: { date: 'desc' },
    })
    if (existing) {
      const nextDate =
        existing.date.getTime() === params.date.getTime()
          ? params.date
          : existing.date
      return prisma.usageViolation.update({
        where: { id: existing.id },
        data: {
          date: nextDate,
          totalOverage: params.overage,
          penalty,
          executed: true,
          executedAt: new Date(),
        },
      })
    }
  }

  return await prisma.usageViolation.upsert({
    where: {
      userId_date: { userId: params.userId, date: params.date },
    },
    create: {
      userId: params.userId,
      date: params.date,
      totalOverage: params.overage,
      penalty,
      executed: true,
      executedAt: new Date(),
    },
    update: {
      totalOverage: params.overage,
      penalty,
      executed: true,
      executedAt: new Date(),
    },
  })
}

export async function upsertPhoneDailyLog(params: {
  userId: string
  date: Date
  minutes: number
  limit: number
  overage: number
  timezone?: string
}) {
  try {
    const legacyDate =
      params.timezone && params.timezone.length > 0
        ? getLegacyUtcDayKey(params.timezone, params.date)
        : null
    if (legacyDate && legacyDate.getTime() !== params.date.getTime()) {
      const existing = await prisma.phoneDailyLog.findFirst({
        where: {
          userId: params.userId,
          date: {
            in: [params.date, legacyDate],
          },
        },
        orderBy: { date: 'desc' },
      })
      if (existing) {
        const nextDate =
          existing.date.getTime() === params.date.getTime()
            ? params.date
            : existing.date
        return prisma.phoneDailyLog.update({
          where: { id: existing.id },
          data: {
            date: nextDate,
            socialMediaMin: params.minutes,
            limitMin: params.limit,
            overage: params.overage,
            penalty:
              params.overage > 0
                ? `Lost XP and streak for ${params.overage}min overage`
                : null,
          },
        })
      }
    }

    return await prisma.phoneDailyLog.upsert({
      where: { userId_date: { userId: params.userId, date: params.date } },
      create: {
        userId: params.userId,
        date: params.date,
        socialMediaMin: params.minutes,
        limitMin: params.limit,
        overage: params.overage,
        penalty:
          params.overage > 0
            ? `Lost XP and streak for ${params.overage}min overage`
            : null,
      },
      update: {
        socialMediaMin: params.minutes,
        limitMin: params.limit,
        overage: params.overage,
        penalty:
          params.overage > 0
            ? `Lost XP and streak for ${params.overage}min overage`
            : null,
      },
    })
  } catch (error) {
    if (!isMissingUniqueConstraintError(error)) throw error
    const existing = await prisma.phoneDailyLog.findFirst({
      where: { userId: params.userId, date: params.date },
    })
    if (existing) {
      return prisma.phoneDailyLog.update({
        where: { id: existing.id },
        data: {
          socialMediaMin: params.minutes,
          limitMin: params.limit,
          overage: params.overage,
          penalty:
            params.overage > 0
              ? `Lost XP and streak for ${params.overage}min overage`
              : null,
        },
      })
    }
    return prisma.phoneDailyLog.create({
      data: {
        userId: params.userId,
        date: params.date,
        socialMediaMin: params.minutes,
        limitMin: params.limit,
        overage: params.overage,
        penalty:
          params.overage > 0
            ? `Lost XP and streak for ${params.overage}min overage`
            : null,
      },
    })
  }
}

function getLegacyUtcDayKey(timezone: string, dayKeyUtc: Date): Date {
  const dateKey = getUserLocalDayString(timezone, dayKeyUtc)
  return new Date(`${dateKey}T00:00:00.000Z`)
}
