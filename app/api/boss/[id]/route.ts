import { NextResponse } from 'next/server'
import { BossService } from '@/lib/boss.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// GET /api/boss/[id] - Get boss task details with attack history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId()
    const { id: bossId } = await params

    const details = await BossService.getBossDetails(userId, bossId)

    return NextResponse.json(details)
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching boss details:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch boss details', details: errorMessage },
      { status: 500 }
    )
  }
}
