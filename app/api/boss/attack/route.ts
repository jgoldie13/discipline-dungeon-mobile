import { NextResponse } from 'next/server'
import { BossService } from '@/lib/boss.service'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// POST /api/boss/attack - Attack a boss with a phone-free block
export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId()

    // SECURITY: Rate limit boss attacks (max 20 per minute per user)
    const rateLimitResult = rateLimit(`boss-attack:${userId}`, {
      maxRequests: 20,
      windowMs: 60000, // 1 minute
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: new Date(rateLimitResult.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    const body = await request.json()

    const { taskId, blockId } = body

    if (!taskId || !blockId) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, blockId' },
        { status: 400 }
      )
    }

    const result = await BossService.attackBoss(taskId, blockId, userId)

    return NextResponse.json(result, {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error attacking boss:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to attack boss', details: errorMessage },
      { status: 500 }
    )
  }
}
