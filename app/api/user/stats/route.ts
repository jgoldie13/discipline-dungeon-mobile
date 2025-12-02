import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/user/stats - Get today's stats for the dashboard
export async function GET() {
  try {
    const userId = 'user_default'

    // Get today's date range in local time
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get or create user
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    // Get today's phone usage
    const phoneLog = await prisma.phoneDailyLog.findFirst({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    // Get today's urges
    const urges = await prisma.urge.findMany({
      where: {
        userId,
        timestamp: {
          gte: today,
        },
      },
    })

    // Get today's phone-free blocks
    const blocks = await prisma.phoneFreeBlock.findMany({
      where: {
        userId,
        startTime: {
          gte: today,
        },
      },
    })

    // Get today's tasks (when implemented)
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        completedAt: {
          gte: today,
        },
        completed: true,
      },
    })

    // Calculate total XP from all sources
    const blockXP = blocks.reduce((sum, b) => sum + b.xpEarned, 0)
    const urgeXP = urges.length * 10
    const taskXP = tasks.reduce((sum, t) => sum + t.xpEarned, 0)
    const totalXP = blockXP + urgeXP + taskXP

    const stats = {
      phoneUsage: {
        minutes: phoneLog?.socialMediaMin || 0,
        limit: phoneLog?.limitMin || user.dailySocialMediaLimit,
        overage: phoneLog?.overage || 0,
        percentage: phoneLog
          ? Math.round((phoneLog.socialMediaMin / phoneLog.limitMin) * 100)
          : 0,
      },
      urgesResisted: urges.length,
      phoneFreeBlocks: blocks.length,
      phoneFreeMinutes: blocks.reduce((sum, b) => sum + b.durationMin, 0),
      tasksCompleted: tasks.length,
      totalXP,
      xpBreakdown: {
        blocks: blockXP,
        urges: urgeXP,
        tasks: taskXP,
      },
    }

    return NextResponse.json({ stats, user })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    )
  }
}
