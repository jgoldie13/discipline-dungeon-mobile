import { NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit.service'
import { getAuthUserId } from '@/lib/supabase/auth'

// GET /api/audit/ledger - Get today's audit events
export async function GET() {
  try {
    const userId = await getAuthUserId()

    const events = await AuditService.getTodayEvents(userId)

    return NextResponse.json({
      events,
      count: events.length,
    })
  } catch (error) {
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
