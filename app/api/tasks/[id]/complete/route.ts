import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { XpService } from '@/lib/xp.service'
import { applyBuildPoints } from '@/lib/build'
import { pointsForTask } from '@/lib/build-policy'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { TaskTypesService } from '@/lib/taskTypes.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId()
    const { id } = await params

    // Get task details with task type
    const task = await prisma.task.findFirst({
      where: { id, userId },
      include: { taskType: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let xpEarned: number
    let xpMetadata: Record<string, unknown> = {}

    // Calculate XP using task type if available
    if (task.taskType) {
      const xpCalc = TaskTypesService.calculateXp(task.taskType, task.durationMin)
      xpEarned = xpCalc.weightedXp
      xpMetadata = {
        taskId: task.id,
        taskTypeId: task.taskType.id,
        taskTypeKey: task.taskType.key,
        baseXp: xpCalc.baseXp,
        xpMultiplier: xpCalc.xpMultiplier,
        weightedXp: xpCalc.weightedXp,
        buildMultiplier: xpCalc.buildMultiplier,
        durationMin: task.durationMin,
      }
    } else {
      // Fallback to legacy XP calculation
      xpEarned = XpService.calculateTaskXp(task.type, task.durationMin || undefined)
      xpMetadata = {
        taskId: task.id,
        legacyType: task.type,
        baseXp: xpEarned,
        durationMin: task.durationMin,
      }
    }

    // Mark task as complete
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date(),
        xpEarned,
      },
      include: { taskType: true },
    })

    // Build description with task type info
    const typeLabel = task.taskType?.name || task.type
    const description = `Completed ${typeLabel} task: ${task.title}`

    // Record XP event in ledger with metadata
    const { newTotalXp, newLevel, levelUp } = await XpService.createEvent({
      userId: task.userId,
      type: 'task_complete',
      delta: xpEarned,
      relatedModel: 'Task',
      relatedId: task.id,
      description,
    })

    // Calculate build points using task type multiplier if available
    let buildPoints = pointsForTask(task, xpEarned)
    if (task.taskType) {
      const buildMultiplier = Number(task.taskType.buildMultiplier)
      buildPoints = Math.round(buildPoints * buildMultiplier)
    }

    const buildResult = await applyBuildPoints({
      userId: task.userId,
      points: buildPoints,
      sourceType: 'task_complete',
      sourceId: task.id,
    })

    return NextResponse.json({
      task: updatedTask,
      xpEarned,
      xpMetadata,
      newTotalXp,
      newLevel,
      levelUp,
      build: buildResult,
      buildPoints,
    })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error completing task:', error)
    return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 })
  }
}
