import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'

export const TRUTH_DELTA_THRESHOLD_MINUTES = 5

type TruthStatus = 'match' | 'mismatch' | 'missing_report' | 'missing_verification'

function dateKeyUtc(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const TruthService = {
  /**
   * Compute the TruthCheckDaily row for a given user/date (date-only).
   *
   * deltaMinutes = reportedMinutes - verifiedMinutes
   * - positive means user reported MORE than RescueTime (over-report)
   * - negative means user reported LESS than RescueTime (under-report)
   */
  async computeTruthCheck(userId: string, date: Date) {
    const start = new Date(date)
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    const [phoneLog, rescueDaily] = await Promise.all([
      prisma.phoneDailyLog.findFirst({
        where: {
          userId,
          date: { gte: start, lt: end },
        },
      }),
      prisma.rescueTimeDaily.findUnique({
        where: {
          userId_date: {
            userId,
            date: start,
          },
        },
      }),
    ])

    const reportedMinutes = phoneLog?.socialMediaMin ?? null
    const verifiedMinutes = rescueDaily?.verifiedMinutes ?? null

    let status: TruthStatus
    let deltaMinutes: number | null = null

    if (reportedMinutes === null && verifiedMinutes !== null) {
      status = 'missing_report'
    } else if (reportedMinutes !== null && verifiedMinutes === null) {
      status = 'missing_verification'
    } else if (reportedMinutes === null && verifiedMinutes === null) {
      status = 'missing_verification'
    } else {
      const r = reportedMinutes as number
      const v = verifiedMinutes as number
      deltaMinutes = r - v
      status =
        Math.abs(deltaMinutes) <= TRUTH_DELTA_THRESHOLD_MINUTES ? 'match' : 'mismatch'
    }

    return prisma.truthCheckDaily.upsert({
      where: {
        userId_date: { userId, date: start },
      },
      create: {
        userId,
        date: start,
        reportedMinutes,
        verifiedMinutes,
        deltaMinutes,
        status,
      },
      update: {
        reportedMinutes,
        verifiedMinutes,
        deltaMinutes,
        status,
      },
    })
  },

  /**
   * Apply deterministic consequences for a given TruthCheckDaily (idempotent).
   *
   * Idempotency:
   * - If TruthCheckDaily.violationId is set -> no-op
   * - Otherwise uses deterministic IDs to prevent duplicate writes under retries.
   */
  async applyTruthConsequences(userId: string, date: Date) {
    const start = new Date(date)
    start.setUTCHours(0, 0, 0, 0)
    const key = dateKeyUtc(start)

    return prisma.$transaction(async (tx) => {
      const truth = await tx.truthCheckDaily.findUnique({
        where: { userId_date: { userId, date: start } },
      })
      if (!truth) {
        throw new Error('Truth check not found (computeTruthCheck must run first)')
      }
      if (truth.violationId) {
        return { applied: false, reason: 'already_applied' as const }
      }

      const reportedMinutes = truth.reportedMinutes ?? null
      const verifiedMinutes = truth.verifiedMinutes ?? null
      const deltaMinutes = truth.deltaMinutes ?? null

      if (reportedMinutes === null || verifiedMinutes === null) {
        return { applied: false, reason: 'missing_data' as const }
      }
      if (truth.status !== 'mismatch' || deltaMinutes === null) {
        return { applied: false, reason: 'no_mismatch' as const }
      }

      const absDelta = Math.abs(deltaMinutes)
      if (absDelta <= TRUTH_DELTA_THRESHOLD_MINUTES) {
        return { applied: false, reason: 'within_threshold' as const }
      }

      const violationId = `truth:${userId}:${key}`
      const penaltyXp = -2 * absDelta

      await tx.usageViolation.upsert({
        where: { id: violationId },
        create: {
          id: violationId,
          userId,
          date: start,
          totalOverage: absDelta,
          penalty: `Truth mismatch (${absDelta} min)`,
          executed: true,
          executedAt: new Date(),
        },
        update: {},
      })

      // XP penalty via ledger/service only.
      await XpService.createEvent({
        userId,
        type: 'lie_penalty',
        delta: penaltyXp,
        relatedModel: 'UsageViolation',
        relatedId: violationId,
        description: `Truth mismatch on ${key}: reported ${reportedMinutes}m vs verified ${verifiedMinutes}m (Δ ${deltaMinutes}m, threshold ${TRUTH_DELTA_THRESHOLD_MINUTES}m)`,
        idempotencyKey: `truth:${userId}:${key}`,
      }, { tx })

      await tx.auditEvent.upsert({
        where: { id: `truthaudit:${userId}:${key}` },
        create: {
          id: `truthaudit:${userId}:${key}`,
          userId,
          type: 'truth_check',
          description: `Truth mismatch on ${key}`,
          entityType: 'UsageViolation',
          entityId: violationId,
          metadata: {
            date: key,
            reportedMinutes,
            verifiedMinutes,
            deltaMinutes,
            threshold: TRUTH_DELTA_THRESHOLD_MINUTES,
            penaltyXp,
            policyVersion: 'v1',
            source: 'rescuetime',
          },
        },
        update: {},
      })

      await tx.truthCheckDaily.update({
        where: { userId_date: { userId, date: start } },
        data: {
          violationId,
        },
      })

      return { applied: true, violationId, penaltyXp }
    })
  },
}
