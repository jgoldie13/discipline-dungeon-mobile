import { NextResponse } from 'next/server'
import { HpService } from '@/lib/hp.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// POST /api/sleep/log - Log sleep and calculate HP
export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const { bedtime, waketime, subjectiveRested } = body

    if (!bedtime || !waketime || !subjectiveRested) {
      return NextResponse.json(
        { error: 'Missing required fields: bedtime, waketime, subjectiveRested' },
        { status: 400 }
      )
    }

    // Convert to Date objects
    const bedtimeDate = new Date(bedtime)
    const waketimeDate = new Date(waketime)

    // Validate dates
    if (isNaN(bedtimeDate.getTime()) || isNaN(waketimeDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Log sleep and update HP
    const result = await HpService.logSleep(userId, {
      bedtime: bedtimeDate,
      waketime: waketimeDate,
      subjectiveRested: parseInt(subjectiveRested),
    })

    return NextResponse.json({
      success: true,
      sleepLog: result.sleepLog,
      hpCalculation: result.hpCalculation,
      newHp: result.newHp,
      message: HpService.getHpMessage(result.newHp),
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error logging sleep:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to log sleep', details: errorMessage },
      { status: 500 }
    )
  }
}

// GET /api/sleep/log - Get today's sleep log
export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const sleepLog = await HpService.getTodaySleepLog(userId)

    return NextResponse.json({
      sleepLog: sleepLog || null,
      hasLoggedToday: !!sleepLog,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching sleep log:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch sleep log', details: errorMessage },
      { status: 500 }
    )
  }
}
