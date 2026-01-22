import { NextRequest, NextResponse } from 'next/server'
import { PhoneBlockService } from '@/lib/phone-block.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { getUserSettingsServer } from '@/lib/settings/getUserSettings.server'
import { createEngine } from '@/lib/policy/PolicyEngine'

// POST /api/phone/block/start - Start a phone-free block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plannedDurationMin, pomodoroConfig } = body

    if (typeof plannedDurationMin !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: plannedDurationMin must be a number' },
        { status: 400 }
      )
    }

    const userId = await requireAuthUserId()
    const { settings } = await getUserSettingsServer()
    const engine = createEngine(settings)
    const { min, max } = engine.getBlockDurationOptions()
    if (plannedDurationMin < min || plannedDurationMin > max) {
      return NextResponse.json(
        { error: `Duration not allowed. Choose between ${min} and ${max} minutes.` },
        { status: 400 }
      )
    }

    const result = await PhoneBlockService.startBlock(
      userId,
      plannedDurationMin,
      pomodoroConfig
    )

    return NextResponse.json({
      block: result.block,
      wasExisting: result.wasExisting,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error starting phone-free block:', error)
    return NextResponse.json(
      { error: 'Failed to start phone-free block' },
      { status: 500 }
    )
  }
}
