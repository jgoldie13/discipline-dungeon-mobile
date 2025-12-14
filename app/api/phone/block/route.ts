import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { applyBuildPoints } from '@/lib/build'
import { pointsForPhoneBlock } from '@/lib/build-policy'
import { getAuthUserId } from '@/lib/supabase/auth'
import { getUserSettingsServer } from '@/lib/settings/getUserSettings.server'
import { createEngine } from '@/lib/policy/PolicyEngine'

// POST /api/phone/block - Log a completed phone-free block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { durationMin, startTime, endTime, pomodoroConfig } = body

    if (typeof durationMin !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: durationMin must be a number' },
        { status: 400 }
      )
    }

    const userId = await getAuthUserId()
    const { settings } = await getUserSettingsServer()
    const engine = createEngine(settings)

    const { min, max } = engine.getBlockDurationOptions()
    if (durationMin < min || durationMin > max) {
      return NextResponse.json(
        { error: `Duration not allowed. Choose between ${min} and ${max} minutes.` },
        { status: 400 }
      )
    }

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    // Calculate XP using policy (server authority)
    const xpResult = engine.calculateBlockXp(durationMin, { isBossBlock: false })
    const xpEarned = xpResult.totalXp

    // Create the block
    const block = await prisma.phoneFreeBlock.create({
      data: {
        userId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        durationMin,
        verified: true, // Honor system for now
        verifyMethod: 'honor_system',
        xpEarned,
        // Pomodoro config
        pomodoroEnabled: pomodoroConfig?.enabled ?? false,
        pomodoroFocusMin: pomodoroConfig?.enabled ? pomodoroConfig.focusMinutes : null,
        pomodoroBreakMin: pomodoroConfig?.enabled ? pomodoroConfig.breakMinutes : null,
      },
    })

    // Record XP event in ledger
    const { newTotalXp, newLevel, levelUp } = await XpService.createEvent({
      userId,
      type: 'block_complete',
      delta: xpEarned,
      relatedModel: 'PhoneFreeBlock',
      relatedId: block.id,
      description: `Phone-free block: ${durationMin} minutes`,
    })

    const buildPoints = pointsForPhoneBlock(durationMin)
    const buildResult = await applyBuildPoints({
      userId,
      points: buildPoints,
      sourceType: 'phone_block',
      sourceId: block.id,
    })

    return NextResponse.json({
      success: true,
      block,
      xpEarned,
      newTotalXp,
      newLevel,
      levelUp,
      build: buildResult,
      buildPoints,
    })
  } catch (error) {
    console.error('Error logging phone-free block:', error)
    return NextResponse.json(
      { error: 'Failed to log phone-free block' },
      { status: 500 }
    )
  }
}

// GET /api/phone/block - Get today's phone-free blocks
export async function GET() {
  try {
    const userId = await getAuthUserId()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const blocks = await prisma.phoneFreeBlock.findMany({
      where: {
        userId,
        startTime: {
          gte: today,
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMin, 0)
    const totalXP = blocks.reduce((sum, block) => sum + block.xpEarned, 0)

    return NextResponse.json({
      blocks,
      count: blocks.length,
      totalMinutes,
      totalXP,
    })
  } catch (error) {
    console.error('Error fetching phone-free blocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phone-free blocks' },
      { status: 500 }
    )
  }
}
