import { NextResponse } from 'next/server'
import { ProtocolService } from '@/lib/protocol.service'

// GET /api/protocol - Get today's protocol
export async function GET() {
  try {
    const userId = 'user_default'
    const protocol = await ProtocolService.getTodayProtocol(userId)

    return NextResponse.json({
      protocol,
      hasCompletedToday: protocol.completed,
    })
  } catch (error) {
    console.error('Error fetching protocol:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch protocol', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/protocol - Update protocol checklist item
export async function POST(request: Request) {
  try {
    const userId = 'user_default'
    const body = await request.json()

    const { item, value } = body

    if (!item || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: item, value' },
        { status: 400 }
      )
    }

    const today = new Date()
    const result = await ProtocolService.updateChecklistItem(
      userId,
      today,
      item,
      value
    )

    return NextResponse.json({
      protocol: result.protocol,
      completed: result.completed,
      xpEarned: result.completed ? result.xpEarned : 0,
      hpBonus: result.completed ? result.hpBonus : 0,
    })
  } catch (error) {
    console.error('Error updating protocol:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update protocol', details: errorMessage },
      { status: 500 }
    )
  }
}
