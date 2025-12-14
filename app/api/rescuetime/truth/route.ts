import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const { searchParams } = new URL(request.url)
    const daysRaw = Number(searchParams.get('days') || '7')
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 30) : 7

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const start = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000)

    const truthChecks = await prisma.truthCheckDaily.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lte: today,
        },
      },
      orderBy: { date: 'desc' },
      take: days,
    })

    return NextResponse.json({ truthChecks })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching truth checks:', error)
    return NextResponse.json({ error: 'Failed to fetch truth checks' }, { status: 500 })
  }
}

