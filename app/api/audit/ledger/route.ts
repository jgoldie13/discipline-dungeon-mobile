import { NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit.service'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

// GET /api/audit/ledger - Get today's audit events
export async function GET() {
  try {
    const userId = await requireAuthUserId()

    const events = await AuditService.getTodayEvents(userId)

    return NextResponse.json({
      events,
      count: events.length,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching ledger:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch ledger',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
