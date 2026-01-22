import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { applyBuildPoints } from '@/lib/build'
import { pointsForUrge } from '@/lib/build-policy'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { getUserDayBoundsUtc, resolveUserTimezone } from '@/lib/time'

function normalizeTriggerTags(
  triggerTags: unknown,
  triggerFallback?: unknown
): string | null {
  const tags: string[] = []
  if (Array.isArray(triggerTags)) {
    tags.push(
      ...triggerTags
        .map((tag) => (typeof tag === 'string' ? tag.trim() : ''))
        .filter(Boolean)
    )
  } else if (typeof triggerTags === 'string') {
    tags.push(
      ...triggerTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  }

  if (tags.length === 0 && typeof triggerFallback === 'string') {
    const fallback = triggerFallback.trim()
    if (fallback) tags.push(fallback)
  }

  return tags.length > 0 ? tags.join(',') : null
}

// POST /api/phone/urge - Log an urge with optional micro-task completion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      trigger,
      triggerTags,
      replacementTask,
      completed,
      activeBlockId,
      intensity,
      dedupeKey,
    } = body

    const userId = await requireAuthUserId()

    if (intensity !== undefined) {
      if (!Number.isInteger(intensity) || intensity < 1 || intensity > 5) {
        return NextResponse.json(
          { error: 'Intensity must be an integer between 1 and 5' },
          { status: 400 }
        )
      }
    }

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    let activeBlock = null
    if (activeBlockId) {
      activeBlock = await prisma.phoneFreeBlock.findFirst({
        where: { id: activeBlockId, userId, status: 'ACTIVE' },
      })
      if (!activeBlock) {
        return NextResponse.json(
          { error: 'Active block not found' },
          { status: 400 }
        )
      }
    }

    const triggerValue = normalizeTriggerTags(triggerTags, trigger)

    // Create urge record
    const urge = await prisma.urge.create({
      data: {
        userId,
        trigger: triggerValue,
        replacementTask: replacementTask || null,
        completed: completed || false,
        intensity: intensity ?? null,
        phoneFreeBlockId: activeBlock?.id ?? null,
      },
    })

    const isInActiveBlock = !!activeBlock
    const xpEarned = isInActiveBlock ? 0 : XpService.calculateUrgeXp()
    const dedupeSeed =
      typeof dedupeKey === 'string' && dedupeKey.trim() ? dedupeKey.trim() : urge.id

    const xpResult =
      xpEarned > 0
        ? await XpService.createEvent({
            userId,
            type: 'urge_resist',
            delta: xpEarned,
            relatedModel: 'Urge',
            relatedId: urge.id,
            description: `Resisted urge: ${triggerValue || 'unspecified'}`,
            dedupeKey: `urge:${dedupeSeed}:create`,
          })
        : null

    const buildPoints = isInActiveBlock ? 0 : pointsForUrge({ completed })
    const buildResult = await applyBuildPoints({
      userId,
      points: buildPoints,
      sourceType: 'urge_resist',
      sourceId: urge.id,
      dedupeKey: `urge:${dedupeSeed}:build`,
    })

    return NextResponse.json({
      success: true,
      urge,
      xpEarned,
      newTotalXp: xpResult?.newTotalXp,
      newLevel: xpResult?.newLevel,
      levelUp: xpResult?.levelUp ?? false,
      build: buildResult,
      buildPoints,
      inActiveBlock: isInActiveBlock,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error logging urge:', error)
    return NextResponse.json(
      { error: 'Failed to log urge' },
      { status: 500 }
    )
  }
}

// GET /api/phone/urge - Get today's urges
export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = resolveUserTimezone(user?.timezone)
    const { startUtc: today, endUtc: tomorrow } = getUserDayBoundsUtc(
      timezone,
      new Date()
    )

    const urges = await prisma.urge.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    return NextResponse.json({ urges, count: urges.length })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching urges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch urges' },
      { status: 500 }
    )
  }
}
