import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserFromRequest } from '@/lib/supabase/requireUser'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { upsertIosScreenTimeDaily } from '@/lib/verification/iosScreentime.service'
import { TruthService } from '@/lib/truth.service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function parseDateOnly(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const d = new Date(`${date}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCHours(0, 0, 0, 0)
  return d
}

// POST /api/verification/ios/upload
export async function POST(request: Request) {
  try {
    const userId = await requireUserFromRequest(request)
    const body = await request.json()

    const dateStr = body?.date
    const verifiedMinutes = body?.verifiedMinutes
    const raw = body?.raw

    if (typeof dateStr !== 'string') {
      return jsonNoStore({ error: '`date` must be YYYY-MM-DD string' }, { status: 400 })
    }

    const date = parseDateOnly(dateStr)
    if (!date) {
      return jsonNoStore({ error: '`date` must be YYYY-MM-DD' }, { status: 400 })
    }

    if (typeof verifiedMinutes !== 'number' || !Number.isFinite(verifiedMinutes)) {
      return jsonNoStore({ error: '`verifiedMinutes` must be a number' }, { status: 400 })
    }
    if (verifiedMinutes < 0) {
      return jsonNoStore({ error: '`verifiedMinutes` must be >= 0' }, { status: 400 })
    }

    await upsertIosScreenTimeDaily(userId, date, Math.floor(verifiedMinutes), raw)

    const { truthCheck } = await TruthService.applyTruthConsequences(userId, date, 'ios_screentime')

    await prisma.iosScreenTimeConnection.upsert({
      where: { userId },
      create: {
        userId,
        enabled: true,
        timezone: 'UTC',
        lastSyncAt: new Date(),
      },
      update: {
        lastSyncAt: new Date(),
      },
    })

    return jsonNoStore({
      date: dateStr,
      status: truthCheck.status,
      deltaMinutes: truthCheck.deltaMinutes ?? null,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error uploading iOS Screen Time snapshot:', error)
    return jsonNoStore({ error: 'Failed to upload snapshot' }, { status: 500 })
  }
}

