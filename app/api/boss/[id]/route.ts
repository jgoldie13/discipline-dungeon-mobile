import { NextResponse } from 'next/server'
import { BossService } from '@/lib/boss.service'

// GET /api/boss/[id] - Get boss task details with attack history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bossId } = await params

    const details = await BossService.getBossDetails(bossId)

    return NextResponse.json(details)
  } catch (error) {
    console.error('Error fetching boss details:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch boss details', details: errorMessage },
      { status: 500 }
    )
  }
}
