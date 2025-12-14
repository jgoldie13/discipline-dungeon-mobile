import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { isValidIanaTimeZone } from '@/lib/dates'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const userId = await requireAuthUserId()
    const conn = await prisma.rescueTimeConnection.findUnique({ where: { userId } })

    return NextResponse.json({
      enabled: conn?.enabled ?? false,
      timezone: conn?.timezone ?? '',
      lastSyncAt: conn?.lastSyncAt ?? null,
      hasApiKey: Boolean(conn?.apiKeyEncrypted && conn.apiKeyEncrypted.length > 0),
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching RescueTime connection:', error)
    return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const enabled = body.enabled !== undefined ? Boolean(body.enabled) : undefined
    const timezone = body.timezone !== undefined ? String(body.timezone) : undefined

    if (enabled === true) {
      if (!timezone || timezone.trim().length === 0) {
        return NextResponse.json({ error: 'Timezone is required when enabling' }, { status: 400 })
      }
      if (!isValidIanaTimeZone(timezone)) {
        return NextResponse.json({ error: 'Invalid timezone (expected IANA name)' }, { status: 400 })
      }
    }

    const conn = await prisma.rescueTimeConnection.upsert({
      where: { userId },
      create: {
        userId,
        enabled: enabled ?? false,
        timezone: timezone?.trim() ?? '',
        apiKeyEncrypted: '',
      },
      update: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(timezone !== undefined ? { timezone: timezone.trim() } : {}),
      },
    })

    return NextResponse.json({
      enabled: conn.enabled,
      timezone: conn.timezone,
      lastSyncAt: conn.lastSyncAt,
      hasApiKey: Boolean(conn.apiKeyEncrypted && conn.apiKeyEncrypted.length > 0),
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating RescueTime connection:', error)
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()
    const apiKey = String(body.apiKey || '')

    if (!apiKey || apiKey.trim().length < 10) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const encrypted = encrypt(apiKey.trim())

    const conn = await prisma.rescueTimeConnection.upsert({
      where: { userId },
      create: {
        userId,
        enabled: false,
        timezone: '',
        apiKeyEncrypted: encrypted,
      },
      update: {
        apiKeyEncrypted: encrypted,
      },
    })

    return NextResponse.json({
      ok: true,
      enabled: conn.enabled,
      timezone: conn.timezone,
      lastSyncAt: conn.lastSyncAt,
      hasApiKey: true,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error setting RescueTime API key:', error)
    return NextResponse.json({ error: 'Failed to set API key' }, { status: 500 })
  }
}

