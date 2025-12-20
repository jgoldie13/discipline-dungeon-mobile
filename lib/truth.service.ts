import { prisma } from './prisma'
import { XpService } from './xp.service'
import { DragonService } from './dragon.service'

export const TRUTH_DELTA_THRESHOLD_MINUTES = 5 as const
export const TRUTH_POLICY_VERSION = 'v1' as const

export type TruthStatus =
  | 'match'
  | 'mismatch'
  | 'missing_report'
  | 'missing_verification'

export type TruthSource = 'ios_screentime' | (string & {})

function startOfDayUtc(date: Date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function isoDateOnly(date: Date) {
  return startOfDayUtc(date).toISOString().slice(0, 10)
}

function daysBackFrom(date: Date, days: number) {
  const d = startOfDayUtc(date)
  d.setUTCDate(d.getUTCDate() - days)
  return d
}

function dayRangeUtc(date: Date) {
  const start = startOfDayUtc(date)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

export class TruthService {
  static async computeTruthCheck(
    userId: string,
    date: Date,
    source: TruthSource = 'ios_screentime'
  ) {
    const day = startOfDayUtc(date)
    const { start, end } = dayRangeUtc(day)

    const [reportedLog, verified] = await Promise.all([
      prisma.phoneDailyLog.findFirst({
        where: { userId, date: { gte: start, lt: end } },
        orderBy: { date: 'desc' },
      }),
      prisma.iosScreenTimeDaily.findUnique({
        where: { userId_date: { userId, date: day } },
      }),
    ])

    const reportedMinutes = reportedLog?.socialMediaMin ?? null
    const verifiedMinutes = verified?.verifiedMinutes ?? null

    let deltaMinutes: number | null = null
    let status: TruthStatus

    if (reportedMinutes == null) {
      status = 'missing_report'
    } else if (verifiedMinutes == null) {
      status = 'missing_verification'
    } else {
      deltaMinutes = reportedMinutes - verifiedMinutes
      status =
        Math.abs(deltaMinutes) <= TRUTH_DELTA_THRESHOLD_MINUTES ? 'match' : 'mismatch'
    }

    const truthCheck = await prisma.truthCheckDaily.upsert({
      where: { userId_date: { userId, date: day } },
      create: {
        userId,
        date: day,
        reportedMinutes,
        verifiedMinutes,
        deltaMinutes,
        status,
        source,
        sourceRecordId: verified?.id ?? null,
      },
      update: {
        reportedMinutes,
        verifiedMinutes,
        deltaMinutes,
        status,
        source,
        sourceRecordId: verified?.id ?? null,
      },
    })

    return truthCheck
  }

  static async applyTruthConsequences(
    userId: string,
    date: Date,
    source: TruthSource = 'ios_screentime'
  ) {
    const day = startOfDayUtc(date)
    const truthCheck = await this.computeTruthCheck(userId, day, source)

    const reportedMinutes = truthCheck.reportedMinutes
    const verifiedMinutes = truthCheck.verifiedMinutes
    const deltaMinutes = truthCheck.deltaMinutes

    const attemptDragon = async () => {
      if (
        truthCheck.status === 'mismatch' &&
        reportedMinutes != null &&
        verifiedMinutes != null
      ) {
        await DragonService.applyTruthMismatchAttack(
          userId,
          day,
          reportedMinutes,
          verifiedMinutes
        )
      }
    }

    const attemptRepair = async () => {
      await DragonService.applyAutoRepairs(userId, day)
    }

    if (truthCheck.status !== 'mismatch') {
      await attemptRepair()
      return { truthCheck, applied: false }
    }

    if (truthCheck.violationId) {
      await attemptDragon()
      await attemptRepair()
      return { truthCheck, applied: false }
    }

    if (reportedMinutes == null || verifiedMinutes == null || deltaMinutes == null) {
      await attemptRepair()
      return { truthCheck, applied: false }
    }

    const absDelta = Math.abs(deltaMinutes)
    if (absDelta <= TRUTH_DELTA_THRESHOLD_MINUTES) {
      await attemptRepair()
      return { truthCheck, applied: false }
    }

    const penaltyXp = -2 * absDelta
    const dateKey = isoDateOnly(day)
    const dedupeKey = `truth:${TRUTH_POLICY_VERSION}:${source}:${userId}:${dateKey}`

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.truthCheckDaily.findUnique({
        where: { userId_date: { userId, date: day } },
      })

      if (!current) throw new Error('TruthCheckDaily missing')
      if (current.violationId) return { truthCheck: current, applied: false }

      const violation = await tx.truthViolation.upsert({
        where: {
          userId_date_source_policyVersion: {
            userId,
            date: day,
            source,
            policyVersion: TRUTH_POLICY_VERSION,
          },
        },
        create: {
          userId,
          date: day,
          source,
          policyVersion: TRUTH_POLICY_VERSION,
          thresholdMinutes: TRUTH_DELTA_THRESHOLD_MINUTES,
          reportedMinutes,
          verifiedMinutes,
          deltaMinutes,
          penaltyXp,
        },
        update: {
          thresholdMinutes: TRUTH_DELTA_THRESHOLD_MINUTES,
          reportedMinutes,
          verifiedMinutes,
          deltaMinutes,
          penaltyXp,
        },
      })

      await XpService.createEvent(
        {
          userId,
          type: 'truth_penalty',
          delta: penaltyXp,
          relatedModel: 'TruthViolation',
          relatedId: violation.id,
          dedupeKey,
          description: `Truth mismatch (${dateKey}): reported ${reportedMinutes}m vs verified ${verifiedMinutes}m`,
          metadata: {
            source,
            date: dateKey,
            reportedMinutes,
            verifiedMinutes,
            deltaMinutes,
            threshold: TRUTH_DELTA_THRESHOLD_MINUTES,
            policyVersion: TRUTH_POLICY_VERSION,
          },
        },
        tx
      )

      const updated = await tx.truthCheckDaily.update({
        where: { userId_date: { userId, date: day } },
        data: { violationId: violation.id },
      })

      return { truthCheck: updated, applied: true }
    })

    await attemptDragon()
    await attemptRepair()
    return result
  }

  static async getLastDaysTruth(
    userId: string,
    days: number,
    source: TruthSource = 'ios_screentime'
  ) {
    const today = startOfDayUtc(new Date())
    const dates = Array.from({ length: days }, (_, i) => daysBackFrom(today, i))

    const rows = await Promise.all(dates.map((d) => this.computeTruthCheck(userId, d, source)))

    rows.sort((a, b) => b.date.getTime() - a.date.getTime())
    return rows
  }
}
