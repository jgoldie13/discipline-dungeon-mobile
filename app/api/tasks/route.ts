import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { TaskTypesService } from '@/lib/taskTypes.service'

// GET - Fetch all tasks for user
export async function GET() {
  try {
    const userId = await requireAuthUserId()

    // Ensure task types exist and backfill
    await TaskTypesService.ensureDefaultTaskTypes(userId)
    await TaskTypesService.backfillTasksTaskTypeId(userId)

    const tasks = await prisma.task.findMany({
      where: { userId },
      include: {
        taskType: true,
      },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, type, taskTypeId, taskTypeKey, durationMin } = body
    const userId = await requireAuthUserId()

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      user = await prisma.user.create({
        data: { id: userId },
      })
    }

    // Resolve task type ID
    const resolvedTaskTypeId = await TaskTypesService.resolveTaskTypeId({
      userId,
      taskTypeId,
      taskTypeKey,
      legacyType: type,
    })

    // Get the task type to determine legacy type string
    const taskType = await TaskTypesService.getTaskTypeById(userId, resolvedTaskTypeId)
    const legacyType = taskType?.key || type || 'other'

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        description,
        type: legacyType, // Keep legacy type for backwards compatibility
        taskTypeId: resolvedTaskTypeId,
        durationMin,
      },
      include: {
        taskType: true,
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
