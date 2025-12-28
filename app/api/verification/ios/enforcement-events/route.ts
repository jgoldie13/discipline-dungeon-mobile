import { NextResponse } from 'next/server'
import { requireUserFromRequest } from '@/lib/supabase/requireUser'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { appendIosEnforcementEvents } from '@/lib/verification/iosEnforcement.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function parseEventTs(value: unknown) {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

// POST /api/verification/ios/enforcement-events
export async function POST(request: Request) {
  try {
    const userId = await requireUserFromRequest(request)
    const body = await request.json()

    const events = body?.events
    if (!Array.isArray(events)) {
      return jsonNoStore({ error: '`events` must be an array' }, { status: 400 })
    }
    if (events.length > 200) {
      return jsonNoStore({ error: '`events` max length is 200' }, { status: 400 })
    }

    const parsed = [] as {
      dedupeKey: string
      type: string
      eventTs: Date
      planHash?: string | null
      timezone?: string | null
      dailyCapMinutes?: number | null
      note?: string | null
      raw?: unknown
    }[]

    for (const event of events) {
      if (!event || typeof event !== 'object') {
        return jsonNoStore({ error: 'Each event must be an object' }, { status: 400 })
      }

      const dedupeKey = event.dedupeKey
      const type = event.type
      const eventTs = parseEventTs(event.eventTs)

      if (typeof dedupeKey !== 'string' || dedupeKey.length < 6) {
        return jsonNoStore({ error: '`dedupeKey` must be a string' }, { status: 400 })
      }
      if (typeof type !== 'string' || type.length < 2) {
        return jsonNoStore({ error: '`type` must be a string' }, { status: 400 })
      }
      if (!eventTs) {
        return jsonNoStore({ error: '`eventTs` must be ISO-8601 string' }, { status: 400 })
      }

      const dailyCapMinutes = event.dailyCapMinutes
      if (
        dailyCapMinutes != null &&
        (typeof dailyCapMinutes !== 'number' || !Number.isFinite(dailyCapMinutes))
      ) {
        return jsonNoStore({ error: '`dailyCapMinutes` must be a number' }, { status: 400 })
      }

      parsed.push({
        dedupeKey,
        type,
        eventTs,
        planHash: typeof event.planHash === 'string' ? event.planHash : null,
        timezone: typeof event.timezone === 'string' ? event.timezone : null,
        dailyCapMinutes:
          typeof dailyCapMinutes === 'number' ? Math.floor(dailyCapMinutes) : null,
        note: typeof event.note === 'string' ? event.note : null,
        raw: event.raw,
      })
    }

    const result = await appendIosEnforcementEvents(userId, parsed)

    return jsonNoStore({ received: events.length, stored: result.count })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading iOS enforcement events:', error)
    return jsonNoStore({ error: 'Failed to upload enforcement events' }, { status: 500 })
  }
}
