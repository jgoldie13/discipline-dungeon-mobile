import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cron/evaluate-stakes - Automatically evaluate all active stakes
// This endpoint should be called via cron job every Friday evening
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require CRON_SECRET for all cron job requests (fail closed)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results: { stakeId: string; outcome: string; error?: string }[] = []

    // Find all stakes that:
    // 1. Haven't been evaluated yet
    // 2. Have an end date in the past (week is over)
    const stakesToEvaluate = await prisma.stakeCommitment.findMany({
      where: {
        evaluated: false,
        endDate: {
          lte: now,
        },
      },
    })

    console.log(`[Cron] Found ${stakesToEvaluate.length} stakes to evaluate`)

    // Evaluate each stake
    for (const stake of stakesToEvaluate) {
      try {
        // Get stats for this week
        const { startDate, endDate, userId } = stake

        // Count phone logs that exceeded the limit
        const phoneLogs = await prisma.phoneDailyLog.findMany({
          where: {
            userId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        })

        const daysOverLimit = phoneLogs.filter(
          (log) => log.socialMediaMin > stake.maxSocialMediaMin
        ).length

        // Count exposure tasks completed this week
        const exposureTasks = await prisma.task.findMany({
          where: {
            userId,
            type: 'exposure',
            completed: true,
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        })

        // Count phone-free blocks this week
        const phoneFreeBlocks = await prisma.phoneFreeBlock.findMany({
          where: {
            userId,
            startTime: {
              gte: startDate,
              lte: endDate,
            },
          },
        })

        // Determine outcome
        const passedSocialMedia = daysOverLimit === 0
        const passedExposureTasks = exposureTasks.length >= stake.minExposureTasks
        const passedPhoneFreeBlocks = phoneFreeBlocks.length >= stake.minPhoneFreeBlocks

        const outcome =
          passedSocialMedia && passedExposureTasks && passedPhoneFreeBlocks ? 'PASS' : 'FAIL'

        // Update stake (idempotent operation)
        await prisma.stakeCommitment.update({
          where: { id: stake.id },
          data: {
            evaluated: true,
            evaluatedAt: now,
            outcome,
          },
        })

        results.push({ stakeId: stake.id, outcome })
        console.log(`[Cron] Evaluated stake ${stake.id}: ${outcome}`)
      } catch (error) {
        console.error(`[Cron] Error evaluating stake ${stake.id}:`, error)
        results.push({
          stakeId: stake.id,
          outcome: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      evaluatedCount: stakesToEvaluate.length,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Error in stake evaluation cron:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate stakes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
