import { NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { prisma } from '@/lib/prisma'

// GET /api/nsdr - Get healing state
export async function GET() {
  try {
    const userId = await requireAuthUserId()

    // Get user's current HP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentHp: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const maxHp = 100 // HP is always 0-100

    // Get today's NSDR sessions
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sessions = await prisma.nsdrSession.findMany({
      where: {
        userId,
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    const totalHpRestored = sessions.reduce(
      (sum, session) => sum + session.hpRestored,
      0
    )

    return NextResponse.json({
      currentHp: user.currentHp,
      maxHp,
      canHeal: user.currentHp < maxHp,
      todaysSessions: sessions,
      totalHpRestored,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching NSDR state:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to fetch NSDR state', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/nsdr - Complete NSDR session
export async function POST(request: Request) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const { sessionType = 'nsdr', durationMin = 10 } = body

    // Get user's current HP
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentHp: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const maxHp = 100 // HP is always 0-100

    // Check if already at max HP
    if (user.currentHp >= maxHp) {
      return NextResponse.json({
        success: false,
        message: 'Already at max HP',
      })
    }

    // Calculate HP restoration (10 HP per 10-minute session)
    const hpRestored = Math.min(10, maxHp - user.currentHp)
    const newHp = Math.min(maxHp, user.currentHp + hpRestored)

    // Create NSDR session record
    await prisma.nsdrSession.create({
      data: {
        userId,
        sessionType,
        durationMin,
        hpRestored,
        completedAt: new Date(),
      },
    })

    // Update user's HP
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentHp: newHp,
      },
    })

    // Get updated session list for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const sessions = await prisma.nsdrSession.findMany({
      where: {
        userId,
        completedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { completedAt: 'desc' },
    })

    const totalHpRestored = sessions.reduce(
      (sum, session) => sum + session.hpRestored,
      0
    )

    return NextResponse.json({
      success: true,
      hpRestored,
      newHp,
      healing: {
        currentHp: newHp,
        maxHp,
        canHeal: newHp < maxHp,
        todaysSessions: sessions,
        totalHpRestored,
      },
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error completing NSDR:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to complete NSDR', details: errorMessage },
      { status: 500 }
    )
  }
}
