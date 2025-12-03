import { NextResponse } from 'next/server'
import { BossService } from '@/lib/boss.service'

// POST /api/boss/suggest - Get AI-suggested HP estimate based on task description
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    const suggestion = BossService.suggestHpEstimate(title, description)

    return NextResponse.json({
      suggestion,
    })
  } catch (error) {
    console.error('Error suggesting HP:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to suggest HP', details: errorMessage },
      { status: 500 }
    )
  }
}
