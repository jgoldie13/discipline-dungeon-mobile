import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUserId } from '@/lib/supabase/auth'
import { isUnauthorizedError } from '@/lib/supabase/http'
import { TaskTypesService } from '@/lib/taskTypes.service'

// GET - Fetch all task types for user
export async function GET(request: NextRequest) {
  try {
    console.log('[TaskTypes API] GET request received')
    const userId = await requireAuthUserId()
    console.log('[TaskTypes API] User authenticated:', userId)

    // Ensure defaults exist and backfill tasks
    await TaskTypesService.ensureDefaultTaskTypes(userId)
    await TaskTypesService.backfillTasksTaskTypeId(userId)

    // Check for includeArchived query param
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === '1'

    const taskTypes = await TaskTypesService.getTaskTypes(userId, { includeArchived })
    console.log('[TaskTypes API] Returning', taskTypes.length, 'task types')

    return NextResponse.json({ taskTypes })
  } catch (error) {
    console.error('[TaskTypes API] Error:', error)
    if (isUnauthorizedError(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch task types'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - Create new task type
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuthUserId()
    const body = await request.json()

    const { name, key, emoji, xpBase, xpPerMinute, xpCap, xpMultiplier, buildMultiplier } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (emoji !== undefined && typeof emoji !== 'string') {
      return NextResponse.json({ error: 'Emoji must be a string' }, { status: 400 })
    }

    const emojiValue = typeof emoji === 'string' ? emoji.trim() : ''

    const taskType = await TaskTypesService.createTaskType(userId, {
      name: name.trim(),
      key: key?.trim(),
      emoji: emojiValue || undefined,
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
