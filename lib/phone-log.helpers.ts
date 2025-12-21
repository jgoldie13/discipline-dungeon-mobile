import { prisma } from './prisma'
import { dateOnlyInTZ } from './dateOnly'

export const REASON_MIN_LEN = 10
export const RECONCILE_THRESHOLD_MINUTES = 5

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

export async function safeFindPhoneDailyAutoLogMinutes(userId: string, date: Date) {
  try {
    const rows = await prisma.$queryRaw<{ minutes: number }[]>`
      SELECT minutes FROM "PhoneDailyAutoLog"
      WHERE "userId" = ${userId} AND "date" = ${date}
      LIMIT 1
    `
    return rows[0]?.minutes ?? null
  } catch (error) {
    if (isMissingTableError(error)) return null
    throw error
  }
}

export async function safeFindUserTimezone(userId: string) {
  try {
    const conn = await prisma.iosScreenTimeConnection.findUnique({
      where: { userId },
      select: { timezone: true },
    })
    return conn?.timezone ?? 'UTC'
  } catch (error) {
    if (isMissingTableError(error)) return 'UTC'
    throw error
  }
}

export async function resolveDateKey(userId: string, dateString?: string | null) {
  if (dateString) return dateString
  const tz = await safeFindUserTimezone(userId)
  try {
    return dateOnlyInTZ(new Date(), tz)
  } catch (error) {
    if (error instanceof RangeError) {
      return dateOnlyInTZ(new Date(), 'UTC')
    }
    throw error
  }
}

export async function upsertPhoneDailyLog(params: {
  userId: string
  date: Date
  minutes: number
  limit: number
  overage: number
}) {
  try {
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
