import { NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit.service'
import { XpService } from '@/lib/xp.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// POST /api/audit/override - User admits to breaking rules
export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const { type, description } = body

    if (!type || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, description' },
        { status: 400 }
      )
    }

    const validTypes = ['override', 'cheat_admitted']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: override or cheat_admitted' },
        { status: 400 }
      )
    }

    // Record audit event
    const auditEvent = await AuditService.recordEvent({
      userId,
      type,
      description,
      metadata: {
        userAdmitted: true,
        timestamp: new Date().toISOString(),
      },
    })

    // Apply penalty based on type
    let penalty = 0
    let penaltyDescription = ''

    if (type === 'override') {
      // Rule violation: -30 XP (penalty for breaking self-imposed rule)
      penalty = -30
      penaltyDescription = `Rule violation penalty: ${description}`
    } else if (type === 'cheat_admitted') {
      // Lying/cheating: -100 XP (severe penalty)
      penalty = -100
      penaltyDescription = `Dishonesty penalty: ${description}`
    }

    // Apply XP penalty
    await XpService.createEvent({
      userId,
      type: 'violation_penalty',
      delta: penalty,
      relatedModel: 'AuditEvent',
      relatedId: auditEvent?.id,
      description: penaltyDescription,
    })

    return NextResponse.json({
      success: true,
      auditEvent,
      penalty,
      message: `Recorded ${type}. Applied ${penalty} XP penalty.`,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error recording override:', error)
    return NextResponse.json(
      {
        error: 'Failed to record override',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
