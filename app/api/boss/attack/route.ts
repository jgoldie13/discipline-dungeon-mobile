import { NextResponse } from 'next/server'
import { BossService } from '@/lib/boss.service'

// POST /api/boss/attack - Attack a boss with a phone-free block
export async function POST(request: Request) {
  try {
    const userId = 'user_default'
    const body = await request.json()

    const { taskId, blockId } = body

    if (!taskId || !blockId) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, blockId' },
        { status: 400 }
      )
    }

    const result = await BossService.attackBoss(taskId, blockId, userId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error attacking boss:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to attack boss', details: errorMessage },
      { status: 500 }
    )
  }
}
