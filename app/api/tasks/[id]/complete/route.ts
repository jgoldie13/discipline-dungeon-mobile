import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Calculate XP based on task type and duration
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let xpEarned = 0
    if (task.type === 'exposure') {
      xpEarned = 100 // High XP for exposure tasks
    } else if (task.type === 'job_search') {
      xpEarned = 50
    } else if (task.type === 'habit') {
      xpEarned = task.durationMin || 30
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
        xpEarned,
      },
    })

    return NextResponse.json({ task: updatedTask, xpEarned })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
