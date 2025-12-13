import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { applyBuildPoints } from '@/lib/build'
import { pointsForTask } from '@/lib/build-policy'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get task details
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Calculate XP using centralized service
    const xpEarned = XpService.calculateTaskXp(task.type, task.durationMin || undefined)

    // Mark task as complete
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
        xpEarned,
      },
    })

    // Record XP event in ledger
    const { newTotalXp, newLevel, levelUp } = await XpService.createEvent({
      userId: task.userId,
      type: 'task_complete',
      delta: xpEarned,
      relatedModel: 'Task',
      relatedId: task.id,
      description: `Completed ${task.type} task: ${task.title}`,
    })

    const buildPoints = pointsForTask(task, xpEarned)
    const buildResult = await applyBuildPoints({
      userId: task.userId,
      points: buildPoints,
      sourceType: 'task_complete',
      sourceId: task.id,
    })

    return NextResponse.json({
      task: updatedTask,
      xpEarned,
      newTotalXp,
      newLevel,
      levelUp,
      build: buildResult,
      buildPoints,
    })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
