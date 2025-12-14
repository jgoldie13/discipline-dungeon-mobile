/**
 * Events API Route
 * POST: Log microtask events (scroll_intent, microtask_selected)
 * GET: Retrieve recent events for analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { AuditService } from '@/lib/audit.service'
import type { MicrotaskEventPayload } from '@/lib/events/eventTypes'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie, Authorization',
}

function jsonNoStore(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...NO_STORE_HEADERS },
  })
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const payload: MicrotaskEventPayload = await request.json()

    if (!payload.type) {
      return jsonNoStore({ error: 'Missing event type' }, { status: 400 })
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
      return jsonNoStore({ error: 'Unknown event type' }, { status: 400 })
    }

    return jsonNoStore({ success: true })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[Events API] POST error:', error)
    return jsonNoStore({ error: 'Failed to log event' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
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

    return jsonNoStore({ events })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[Events API] GET error:', error)
    return jsonNoStore({ error: 'Failed to fetch events' }, { status: 500 })
  }
}
