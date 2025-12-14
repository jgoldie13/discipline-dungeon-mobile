import { NextResponse } from 'next/server'
import { BossService } from '@/lib/boss.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// POST /api/boss/create - Create a new boss task
export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const { title, description, difficulty, estimatedHours, optimalWindow } =
      body

    if (!title || !difficulty || !estimatedHours) {
      return NextResponse.json(
        { error: 'Missing required fields: title, difficulty, estimatedHours' },
        { status: 400 }
      )
    }

    const boss = await BossService.createBoss(userId, {
      title,
      description,
      difficulty,
      estimatedHours: parseFloat(estimatedHours),
      optimalWindow,
    })

    return NextResponse.json({
      boss,
      message: `Boss created: ${boss.title} (${boss.bossHp} HP)`,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating boss:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create boss', details: errorMessage },
      { status: 500 }
    )
  }
}
