/**
 * Events API Route
 * POST: Log microtask events (scroll_intent, microtask_selected)
 * GET: Retrieve recent events for analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit.service'
import type { MicrotaskEventPayload } from '@/lib/events/eventTypes'
import { prisma } from '@/lib/prisma'
import { getAuthUserId } from '@/lib/supabase/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId()
    const payload: MicrotaskEventPayload = await request.json()

    if (!payload.type) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
    }

    if (payload.type === 'scroll_intent') {
      await AuditService.recordEvent({
        userId,
        type: 'scroll_intent',
        description: `User expressed scroll impulse from ${payload.source}`,
        metadata: {
          source: payload.source,
          page: payload.page,
        },
      })
    } else if (payload.type === 'microtask_selected') {
      await AuditService.recordEvent({
        userId,
        type: 'microtask_selected',
        description: `User chose ${payload.choice} instead of scrolling`,
        metadata: {
          choice: payload.choice,
          source: payload.source,
          page: payload.page,
        },
      })
    } else {
      return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Events API] POST error:', error)
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const events = await prisma.auditEvent.findMany({
      where: {
        userId,
        type: {
          in: ['scroll_intent', 'microtask_selected'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 100),
      select: {
        id: true,
        type: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('[Events API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
