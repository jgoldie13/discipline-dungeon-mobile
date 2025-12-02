import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/phone/block - Log a completed phone-free block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { durationMin, startTime, endTime } = body

    if (typeof durationMin !== 'number') {
      return NextResponse.json(
        { error: 'Invalid input: durationMin must be a number' },
        { status: 400 }
      )
    }

    const userId = 'user_default'

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    const xpEarned = durationMin // 1 XP per minute

    const block = await prisma.phoneFreeBlock.create({
      data: {
        userId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        durationMin,
        verified: true, // Honor system for now
        verifyMethod: 'honor_system',
        xpEarned,
      },
    })

    return NextResponse.json({
      success: true,
      block,
      xpEarned,
    })
  } catch (error) {
    console.error('Error logging phone-free block:', error)
    return NextResponse.json(
      { error: 'Failed to log phone-free block' },
      { status: 500 }
    )
  }
}

// GET /api/phone/block - Get today's phone-free blocks
export async function GET() {
  try {
    const userId = 'user_default'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const blocks = await prisma.phoneFreeBlock.findMany({
      where: {
        userId,
        startTime: {
          gte: today,
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    const totalMinutes = blocks.reduce((sum, block) => sum + block.durationMin, 0)
    const totalXP = blocks.reduce((sum, block) => sum + block.xpEarned, 0)

    return NextResponse.json({
      blocks,
      count: blocks.length,
      totalMinutes,
      totalXP,
    })
  } catch (error) {
    console.error('Error fetching phone-free blocks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phone-free blocks' },
      { status: 500 }
    )
  }
}
