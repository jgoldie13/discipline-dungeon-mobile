import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { StreakService } from '@/lib/streak.service'
import { DragonService } from '@/lib/dragon.service'
import { AuditService } from '@/lib/audit.service'
import { requireUserFromRequest } from '@/lib/supabase/requireUser'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { isValidDateOnly } from '@/lib/dateOnly'
import {
  REASON_MIN_LEN,
  RECONCILE_THRESHOLD_MINUTES,
  resolveDateKey,
  safeFindPhoneDailyAutoLog,
  upsertPhoneDailyLog,
  upsertUsageViolation,
} from '@/lib/phone-log.helpers'
import { getUserLocalDayString } from '@/lib/time'
import { Prisma } from '@prisma/client'

type ProcessingStep =
  | 'parse_request'
  | 'resolve_timezone'
  | 'compute_date_key'
  | 'fetch_auto_log'
  | 'ensure_user'
  | 'upsert_daily_log'
  | 'record_audit'
  | 'evaluate_streak'
  | 'upsert_violation'
  | 'apply_xp_penalty'
  | 'apply_dragon_attack'
  | 'apply_auto_repairs'

function logPhoneLogError(label: string, error: unknown, step?: ProcessingStep) {
  const err = error as {
    name?: string
    code?: string
    message?: string
    meta?: { target?: string[]; modelName?: string }
  }
  console.error(`[phone-log] ${label}`, {
    step,
    name: err?.name,
    code: err?.code,
    message: err?.message,
    target: err?.meta?.target,
    model: err?.meta?.modelName,
  })
}

async function safeFindAutoLog(
  userId: string,
  targetDate: Date,
  timezone: string
) {
  return safeFindPhoneDailyAutoLog(userId, targetDate, timezone)
}

// POST /api/phone/log - Log daily phone usage
export async function POST(request: NextRequest) {
  let currentStep: ProcessingStep = 'parse_request'
  let timezoneUsed = 'UTC'
  let dateKeyUsed = ''

  try {
    // Step 1: Parse and validate request
    const body = await request.json()
    const { minutes, limit, date, reason } = body

    if (typeof minutes !== 'number' || typeof limit !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: minutes and limit must be numbers' },
        { status: 400 }
      )
    }

    const dateString = typeof date === 'string' ? date : null
    if (dateString && !isValidDateOnly(dateString)) {
      return NextResponse.json({ error: '`date` must be YYYY-MM-DD' }, { status: 400 })
    }

    // Step 2: Authenticate user
    const userId = await requireUserFromRequest(request)

    // Step 3: Resolve timezone and compute date key
    currentStep = 'resolve_timezone'
    const dateResolution = await resolveDateKey(userId, dateString)
    timezoneUsed = dateResolution.timezone
    dateKeyUsed = dateResolution.dateKey
    const targetDate = dateResolution.startOfDay

    currentStep = 'compute_date_key'
    const overage = Math.max(0, minutes - limit)
    const overLimit = minutes > limit

    // Step 4: Fetch auto-log data (iOS Screen Time verification)
    currentStep = 'fetch_auto_log'
    const autoResult = await safeFindAutoLog(userId, targetDate, timezoneUsed)
    const autoMinutes = autoResult.minutes
    const autoStatus = autoResult.status
    const deltaMinutes = autoMinutes == null ? null : autoMinutes - minutes
    const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
    const needsReason =
      autoStatus === 'available' &&
      Math.abs(deltaMinutes ?? 0) > RECONCILE_THRESHOLD_MINUTES

    if (needsReason && trimmedReason.length < REASON_MIN_LEN) {
      return NextResponse.json(
        { error: `Reason must be at least ${REASON_MIN_LEN} characters` },
        { status: 400 }
      )
    }

    // Step 5: Ensure user exists
    currentStep = 'ensure_user'
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          dailySocialMediaLimit: limit,
        },
      })
    }

    // Step 6: Upsert daily log (idempotent)
    currentStep = 'upsert_daily_log'
    const log = await upsertPhoneDailyLog({
      userId,
      date: targetDate,
      minutes,
      limit,
      overage,
      timezone: timezoneUsed,
    })

    // Step 7: Record audit event if reconciliation occurred
    if (autoStatus === 'available') {
      currentStep = 'record_audit'
      await AuditService.recordEvent({
        userId,
        type: 'phone_log_reconciled',
        description: `Phone log reconciled for ${dateKeyUsed}`,
        metadata: {
          date: dateKeyUsed,
          autoMinutes,
          manualMinutes: minutes,
          deltaMinutes,
          reason: trimmedReason || null,
        },
      })
    }

    // Step 8: Evaluate daily streak performance (idempotent)
    currentStep = 'evaluate_streak'
    const streakResult = await StreakService.evaluateDailyPerformance(userId, targetDate, {
      date: targetDate,
      underLimit: !overLimit,
      violationCount: overLimit ? 1 : 0,
    })

    // Step 9: Handle overage violations and penalties (idempotent)
    let xpPenalty = 0
    let isFirstViolation = false

    if (overage > 0) {
      currentStep = 'upsert_violation'

      // Check if this is a new violation (for determining whether to apply penalties)
      const legacyViolationDate = new Date(
        `${getUserLocalDayString(timezoneUsed, targetDate)}T00:00:00.000Z`
      )
      const violationDates =
        legacyViolationDate.getTime() === targetDate.getTime()
          ? [targetDate]
          : [targetDate, legacyViolationDate]
      const existingViolation = await prisma.usageViolation.findFirst({
        where: {
          userId,
          date: {
            in: violationDates,
          },
        },
      })
      isFirstViolation = !existingViolation

      // Upsert violation record (idempotent)
      await upsertUsageViolation({
        userId,
        date: targetDate,
        overage,
        timezone: timezoneUsed,
      })

      // Only apply penalties on first violation to prevent double-penalization
      if (isFirstViolation) {
        // Step 10: Apply XP penalty (idempotent via dedupeKey)
        currentStep = 'apply_xp_penalty'
        xpPenalty = XpService.calculateViolationPenalty(overage)
        await XpService.createEvent({
          userId,
          type: 'violation_penalty',
          delta: xpPenalty, // Already negative from calculateViolationPenalty
          description: `Went ${overage} min over limit`,
          dedupeKey: `phone:overage:v1:${userId}:${dateKeyUsed}`,
        })

        // Step 11: Apply dragon attack (idempotent via internal dedupeKey)
        currentStep = 'apply_dragon_attack'
        await DragonService.applyUsageViolationAttack(userId, targetDate, overage, limit)
      }
    }

    // Step 12: Apply auto-repairs (idempotent via internal dedupeKey)
    currentStep = 'apply_auto_repairs'
    await DragonService.applyAutoRepairs(userId, targetDate)

    return NextResponse.json({
      success: true,
      log,
      autoMinutes,
      autoStatus,
      deltaMinutes,
      violation: overage > 0,
      overage,
      xpPenalty,
      reasonRequired: needsReason,
      streak: {
        current: streakResult.newStreak,
        broken: streakResult.broken,
        reason: streakResult.reason,
      },
      // Diagnostic metadata
      timezoneUsed,
      dateKeyUsed,
      isFirstViolation: overage > 0 ? isFirstViolation : undefined,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logPhoneLogError('POST failed', error, currentStep)

    // Enhanced P2002 error reporting (return 409 for constraint violations)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined
      const model = error.meta?.modelName as string | undefined

      return NextResponse.json(
        {
          error: 'Failed to log phone usage',
          code: 'P2002',
          target: target ?? null,
          model: model ?? null,
          step: currentStep,
          dateKeyUsed: dateKeyUsed || null,
          timezoneUsed: timezoneUsed || null,
        },
        { status: 409 } // Conflict, not Internal Server Error
      )
    }

    const err = error as { code?: string }
    return NextResponse.json(
      {
        error: 'Failed to log phone usage',
        code: err?.code,
        step: currentStep,
        dateKeyUsed: dateKeyUsed || null,
        timezoneUsed: timezoneUsed || null,
      },
      { status: 500 }
    )
  }
}

// GET /api/phone/log - Get today's phone usage
export async function GET(request: NextRequest) {
  let timezoneUsed = 'UTC'
  let dateKeyUsed = ''

  try {
    const userId = await requireUserFromRequest(request)
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    if (dateParam && !isValidDateOnly(dateParam)) {
      return NextResponse.json({ error: '`date` must be YYYY-MM-DD' }, { status: 400 })
    }

    const dateResolution = await resolveDateKey(userId, dateParam)
    timezoneUsed = dateResolution.timezone
    dateKeyUsed = dateResolution.dateKey
    const targetDate = dateResolution.startOfDay

    const log = await prisma.phoneDailyLog.findFirst({
      where: { userId, date: targetDate },
    })
    const autoResult = await safeFindAutoLog(userId, targetDate, timezoneUsed)
    const autoMinutes = autoResult.minutes
    const autoStatus = autoResult.status
    const manualMinutes = log?.socialMediaMin ?? null
    const deltaMinutes =
      autoMinutes == null || manualMinutes == null ? null : autoMinutes - manualMinutes

    return NextResponse.json({
      log,
      autoMinutes,
      autoStatus,
      manualMinutes,
      deltaMinutes,
      timezoneUsed,
      dateKeyUsed,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logPhoneLogError('GET failed', error)
    const err = error as { code?: string }
    return NextResponse.json(
      {
        error: 'Failed to fetch phone log',
        code: err?.code,
        timezoneUsed: timezoneUsed || null,
        dateKeyUsed: dateKeyUsed || null,
      },
      { status: 500 }
    )
  }
}
