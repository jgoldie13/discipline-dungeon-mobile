import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { applyBuildPoints } from '@/lib/build'
import { pointsForUrge } from '@/lib/build-policy'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// POST /api/phone/urge - Log an urge with optional micro-task completion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trigger, replacementTask, completed } = body

    const userId = await requireAuthUserId()

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    // Create urge record
    const urge = await prisma.urge.create({
      data: {
        userId,
        trigger: trigger || null,
        replacementTask: replacementTask || null,
        completed: completed || false,
      },
    })

    // Award XP using centralized service
    const xpEarned = XpService.calculateUrgeXp()
    const { newTotalXp, newLevel, levelUp } = await XpService.createEvent({
      userId,
      type: 'urge_resist',
      delta: xpEarned,
      relatedModel: 'Urge',
      relatedId: urge.id,
      description: `Resisted urge: ${trigger || 'unspecified'}`,
    })

    const buildPoints = pointsForUrge({ completed })
    const buildResult = await applyBuildPoints({
      userId,
      points: buildPoints,
      sourceType: 'urge_resist',
      sourceId: urge.id,
    })

    return NextResponse.json({
      success: true,
      urge,
      xpEarned,
      newTotalXp,
      newLevel,
      levelUp,
      build: buildResult,
      buildPoints,
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
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const urges = await prisma.urge.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
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
