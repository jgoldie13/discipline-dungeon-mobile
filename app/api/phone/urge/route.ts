import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/phone/urge - Log an urge with optional micro-task completion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trigger, replacementTask, completed } = body

    const userId = 'user_default'

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    const urge = await prisma.urge.create({
      data: {
        userId,
        trigger: trigger || null,
        replacementTask: replacementTask || null,
        completed: completed || false,
      },
    })

    return NextResponse.json({
      success: true,
      urge,
      xpEarned: 10, // Base XP for logging urge
    })
  } catch (error) {
    console.error('Error logging urge:', error)
    return NextResponse.json(
      { error: 'Failed to log urge' },
      { status: 500 }
    )
  }
}

// GET /api/phone/urge - Get today's urges
export async function GET() {
  try {
    const userId = 'user_default'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const urges = await prisma.urge.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    return NextResponse.json({ urges, count: urges.length })
  } catch (error) {
    console.error('Error fetching urges:', error)
    return NextResponse.json(
      { error: 'Failed to fetch urges' },
      { status: 500 }
    )
  }
}
