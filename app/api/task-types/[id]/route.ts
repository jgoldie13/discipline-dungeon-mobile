import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { TaskTypesService } from '@/lib/taskTypes.service'
import { AuditService } from '@/lib/audit.service'

// PATCH - Update task type
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId()
    const { id } = await params
    const body = await request.json()

    // Get existing for audit trail
    const existing = await TaskTypesService.getTaskTypeById(userId, id)
    if (!existing) {
      return NextResponse.json({ error: 'Task type not found' }, { status: 404 })
    }

    const { name, xpBase, xpPerMinute, xpCap, xpMultiplier, buildMultiplier, sortOrder, isArchived } = body

    // Build update data (only include provided fields)
    const updateData: Parameters<typeof TaskTypesService.updateTaskType>[2] = {}

    if (name !== undefined) updateData.name = String(name).trim()
    if (xpBase !== undefined) updateData.xpBase = Number(xpBase)
    if (xpPerMinute !== undefined) updateData.xpPerMinute = Number(xpPerMinute)
    if (xpCap !== undefined) updateData.xpCap = Number(xpCap)
    if (xpMultiplier !== undefined) updateData.xpMultiplier = Number(xpMultiplier)
    if (buildMultiplier !== undefined) updateData.buildMultiplier = Number(buildMultiplier)
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder)
    if (isArchived !== undefined) updateData.isArchived = Boolean(isArchived)

    const updated = await TaskTypesService.updateTaskType(userId, id, updateData)

    // Record audit event
    await AuditService.recordEvent({
      userId,
      type: 'task_completed', // Using existing type; ideally add 'task_type_updated'
      description: `Updated task type: ${existing.name}`,
      entityType: 'Task', // Using Task as closest match
      entityId: id,
      metadata: {
        taskTypeId: id,
        before: {
          name: existing.name,
          xpBase: existing.xpBase,
          xpPerMinute: existing.xpPerMinute,
          xpCap: existing.xpCap,
          xpMultiplier: Number(existing.xpMultiplier),
          buildMultiplier: Number(existing.buildMultiplier),
          sortOrder: existing.sortOrder,
          isArchived: existing.isArchived,
        },
        after: {
          name: updated.name,
          xpBase: updated.xpBase,
          xpPerMinute: updated.xpPerMinute,
          xpCap: updated.xpCap,
          xpMultiplier: Number(updated.xpMultiplier),
          buildMultiplier: Number(updated.buildMultiplier),
          sortOrder: updated.sortOrder,
          isArchived: updated.isArchived,
        },
      },
    })

    return NextResponse.json({ taskType: updated })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Failed to update task type'
    console.error('Error updating task type:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Get single task type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuthUserId()
    const { id } = await params

    const taskType = await TaskTypesService.getTaskTypeById(userId, id)

    if (!taskType) {
      return NextResponse.json({ error: 'Task type not found' }, { status: 404 })
    }

    return NextResponse.json({ taskType })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching task type:', error)
    return NextResponse.json({ error: 'Failed to fetch task type' }, { status: 500 })
  }
}
