import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserFromRequest } from '@/lib/supabase/requireUser'
import { isUnauthorizedError } from '@/lib/supabase/http'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function looksLikeIanaTimezone(timezone: string) {
  if (timezone.length < 3) return false
  if (timezone.includes(' ')) return false
  return /^[A-Za-z0-9_+-]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/.test(timezone)
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserFromRequest(request)

    const conn = await prisma.iosScreenTimeConnection.findUnique({ where: { userId } })

    return jsonNoStore({
      enabled: conn?.enabled ?? false,
      timezone: conn?.timezone ?? 'UTC',
      lastSyncAt: conn?.lastSyncAt ?? null,
      selection: conn?.selection ?? null,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching iOS Screen Time connection:', error)
    return jsonNoStore({ error: 'Failed to fetch connection' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserFromRequest(request)
    const body = await request.json()

    const enabled = body?.enabled
    const timezone = body?.timezone
    const selection = body?.selection

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return jsonNoStore({ error: '`enabled` must be boolean' }, { status: 400 })
    }

    if (enabled === true) {
      if (typeof timezone !== 'string' || !looksLikeIanaTimezone(timezone)) {
        return jsonNoStore(
          { error: 'timezone is required and must look like an IANA timezone' },
          { status: 400 }
        )
      }
    }

    if (timezone !== undefined && typeof timezone !== 'string') {
      return jsonNoStore({ error: '`timezone` must be string' }, { status: 400 })
    }

    const conn = await prisma.iosScreenTimeConnection.upsert({
      where: { userId },
      create: {
        userId,
        enabled: typeof enabled === 'boolean' ? enabled : false,
        timezone: typeof timezone === 'string' ? timezone : 'UTC',
        selection: selection as any,
      },
      update: {
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
        ...(typeof timezone === 'string' ? { timezone } : {}),
        ...(selection !== undefined ? { selection: selection as any } : {}),
      },
    })

    return jsonNoStore({
      enabled: conn.enabled,
      timezone: conn.timezone,
      lastSyncAt: conn.lastSyncAt ?? null,
      selection: conn.selection ?? null,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating iOS Screen Time connection:', error)
    return jsonNoStore({ error: 'Failed to update connection' }, { status: 500 })
  }
}

