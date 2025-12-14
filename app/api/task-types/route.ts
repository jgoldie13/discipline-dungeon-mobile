import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { TaskTypesService } from '@/lib/taskTypes.service'

// GET - Fetch all task types for user
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()

    // Ensure defaults exist and backfill tasks
    await TaskTypesService.ensureDefaultTaskTypes(userId)
    await TaskTypesService.backfillTasksTaskTypeId(userId)

    // Check for includeArchived query param
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === '1'

    const taskTypes = await TaskTypesService.getTaskTypes(userId, { includeArchived })

    return NextResponse.json({ taskTypes })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching task types:', error)
    return NextResponse.json({ error: 'Failed to fetch task types' }, { status: 500 })
  }
}

// POST - Create new task type
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const { name, key, xpBase, xpPerMinute, xpCap, xpMultiplier, buildMultiplier } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const taskType = await TaskTypesService.createTaskType(userId, {
      name: name.trim(),
      key: key?.trim(),
      xpBase: xpBase !== undefined ? Number(xpBase) : undefined,
      xpPerMinute: xpPerMinute !== undefined ? Number(xpPerMinute) : undefined,
      xpCap: xpCap !== undefined ? Number(xpCap) : undefined,
      xpMultiplier: xpMultiplier !== undefined ? Number(xpMultiplier) : undefined,
      buildMultiplier: buildMultiplier !== undefined ? Number(buildMultiplier) : undefined,
    })

    return NextResponse.json({ taskType }, { status: 201 })
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating task type:', error)
    return NextResponse.json({ error: 'Failed to create task type' }, { status: 500 })
  }
}
