import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TruthService } from '@/lib/truth.service'
import { requireUserFromRequest } from '@/lib/supabase/requireUser'
import { isUnauthorizedError } from '@/lib/supabase/http'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

function dateOnly(date: Date) {
  const d = new Date(date)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const userId = await requireUserFromRequest(request)

    const [rows, conn] = await Promise.all([
      TruthService.getLastDaysTruth(userId, 7, 'ios_screentime'),
      prisma.iosScreenTimeConnection.findUnique({ where: { userId } }),
    ])

    return jsonNoStore({
      rows: rows.map((r) => ({
        date: dateOnly(r.date),
        status: r.status,
        deltaMinutes: r.deltaMinutes ?? null,
        reportedMinutes: r.reportedMinutes ?? null,
        verifiedMinutes: r.verifiedMinutes ?? null,
        source: r.source,
      })),
      lastSyncAt: conn?.lastSyncAt ?? null,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching truth rows:', error)
    return jsonNoStore({ error: 'Failed to fetch truth rows' }, { status: 500 })
  }
}

