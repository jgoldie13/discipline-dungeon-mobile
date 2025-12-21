import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { StreakService } from '@/lib/streak.service'
import { DragonService } from '@/lib/dragon.service'
import { AuditService } from '@/lib/audit.service'
import { requireUserFromRequest } from '@/lib/supabase/requireUser'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { fromDateOnly, isValidDateOnly } from '@/lib/dateOnly'
import {
  REASON_MIN_LEN,
  RECONCILE_THRESHOLD_MINUTES,
  resolveDateKey,
  safeFindPhoneDailyAutoLogMinutes,
  upsertPhoneDailyLog,
} from '@/lib/phone-log.helpers'

function logPhoneLogError(label: string, error: unknown) {
  const err = error as { name?: string; code?: string; message?: string }
  console.error(`[phone-log] ${label}`, {
    name: err?.name,
    code: err?.code,
    message: err?.message,
  })
}

// POST /api/phone/log - Log daily phone usage
export async function POST(request: NextRequest) {
  try {
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

    const userId = await requireUserFromRequest(request)
    const dateKey = await resolveDateKey(userId, dateString)
    const targetDate = fromDateOnly(dateKey)

    const overage = Math.max(0, minutes - limit)
    const overLimit = minutes > limit
    const autoMinutes = await safeFindPhoneDailyAutoLogMinutes(userId, targetDate)
    const deltaMinutes = autoMinutes == null ? null : autoMinutes - minutes
    const trimmedReason = typeof reason === 'string' ? reason.trim() : ''
    const needsReason =
      autoMinutes != null && Math.abs(deltaMinutes ?? 0) > RECONCILE_THRESHOLD_MINUTES

    if (needsReason && trimmedReason.length < REASON_MIN_LEN) {
      return NextResponse.json(
        { error: `Reason must be at least ${REASON_MIN_LEN} characters` },
        { status: 400 }
      )
    }

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          dailySocialMediaLimit: limit,
        },
      })
    }

    const log = await upsertPhoneDailyLog({
      userId,
      date: targetDate,
      minutes,
      limit,
      overage,
    })

    if (autoMinutes != null) {
      await AuditService.recordEvent({
        userId,
        type: 'phone_log_reconciled',
        description: `Phone log reconciled for ${dateKey}`,
        metadata: {
          date: dateKey,
          autoMinutes,
          manualMinutes: minutes,
          deltaMinutes,
          reason: trimmedReason || null,
        },
      })
    }

    // Evaluate daily streak performance
    const streakResult = await StreakService.evaluateDailyPerformance(userId, targetDate, {
      date: targetDate,
      underLimit: !overLimit,
      violationCount: overLimit ? 1 : 0,
    })

    // If there's an overage, create a violation record and apply XP penalty
    let xpPenalty = 0
    if (overage > 0) {
      const dayEnd = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
      const existingViolation = await prisma.usageViolation.findFirst({
        where: {
          userId,
          date: { gte: targetDate, lt: dayEnd },
        },
      })

      if (existingViolation) {
        await prisma.usageViolation.update({
          where: { id: existingViolation.id },
          data: {
            totalOverage: overage,
            penalty: `Lost XP and streak - ${overage} minutes over limit`,
            executed: true,
            executedAt: new Date(),
          },
        })
      } else {
        await prisma.usageViolation.create({
          data: {
            userId,
            date: targetDate,
            totalOverage: overage,
            penalty: `Lost XP and streak - ${overage} minutes over limit`,
            executed: true,
            executedAt: new Date(),
          },
        })

        // Calculate and apply XP penalty once per day
        xpPenalty = XpService.calculateViolationPenalty(overage)
        await XpService.createEvent({
          userId,
          type: 'violation_penalty',
          delta: xpPenalty, // Already negative from calculateViolationPenalty
          description: `Went ${overage} min over limit`,
          dedupeKey: `phone:overage:v1:${userId}:${dateKey}`,
        })

        await DragonService.applyUsageViolationAttack(userId, targetDate, overage, limit)
      }
    }

    await DragonService.applyAutoRepairs(userId, targetDate)

    return NextResponse.json({
      success: true,
      log,
      autoMinutes,
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
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logPhoneLogError('POST failed', error)
    const err = error as { code?: string }
    return NextResponse.json(
      { error: 'Failed to log phone usage', code: err?.code },
      { status: 500 }
    )
  }
}

// GET /api/phone/log - Get today's phone usage
export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserFromRequest(request)
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    if (dateParam && !isValidDateOnly(dateParam)) {
      return NextResponse.json({ error: '`date` must be YYYY-MM-DD' }, { status: 400 })
    }
    const dateKey = await resolveDateKey(userId, dateParam)
    const targetDate = fromDateOnly(dateKey)

    const log = await prisma.phoneDailyLog.findFirst({
      where: { userId, date: targetDate },
    })
    const autoMinutes = await safeFindPhoneDailyAutoLogMinutes(userId, targetDate)
    const manualMinutes = log?.socialMediaMin ?? null
    const deltaMinutes = autoMinutes == null || manualMinutes == null
      ? null
      : autoMinutes - manualMinutes

    return NextResponse.json({ log, autoMinutes, manualMinutes, deltaMinutes })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logPhoneLogError('GET failed', error)
    const err = error as { code?: string }
    return NextResponse.json(
      { error: 'Failed to fetch phone log', code: err?.code },
      { status: 500 }
    )
  }
}
