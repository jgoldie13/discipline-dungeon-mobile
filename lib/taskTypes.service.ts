/**
 * Task Types Service
 * Manages user-customizable task types with XP weighting rules
 */

import { prisma } from './prisma'
import { Decimal } from '@prisma/client/runtime/library'
import type { TaskType, Prisma } from '@prisma/client'
import { resolveTaskTypeEmoji } from './taskTypeEmoji'

// Default task types created for new users
const DEFAULT_TASK_TYPES: Array<{
  key: string
  name: string
  emoji: string
  xpBase: number
  xpPerMinute: number
  xpCap: number
  xpMultiplier: number
  buildMultiplier: number
  sortOrder: number
}> = [
  {
    key: 'exposure',
    name: 'Exposure',
    emoji: '🎯',
    xpBase: 120,
    xpPerMinute: 1,
    xpCap: 120,
    xpMultiplier: 1.0,
    buildMultiplier: 1.0,
    sortOrder: 0,
  },
  {
    key: 'job_search',
    name: 'Job Search',
    emoji: '💼',
    xpBase: 60,
    xpPerMinute: 1,
    xpCap: 60,
    xpMultiplier: 1.0,
    buildMultiplier: 1.0,
    sortOrder: 1,
  },
  {
    key: 'habit',
    name: 'Habit',
    emoji: '🔄',
    xpBase: 30,
    xpPerMinute: 1,
    xpCap: 60,
    xpMultiplier: 1.0,
    buildMultiplier: 1.0,
    sortOrder: 2,
  },
  {
    key: 'boss',
    name: 'Boss Battle',
    emoji: '⚔️',
    xpBase: 200,
    xpPerMinute: 2,
    xpCap: 200,
    xpMultiplier: 1.0,
    buildMultiplier: 1.5,
    sortOrder: 3,
  },
  {
    key: 'other',
    name: 'Other',
    emoji: '📋',
    xpBase: 60,
    xpPerMinute: 1,
    xpCap: 60,
    xpMultiplier: 1.0,
    buildMultiplier: 1.0,
    sortOrder: 4,
  },
]

// Legacy type string -> key mapping
const LEGACY_TYPE_TO_KEY: Record<string, string> = {
  exposure: 'exposure',
  job_search: 'job_search',
  habit: 'habit',
  boss: 'boss',
}

export interface ResolveTaskTypeParams {
  userId: string
  taskTypeId?: string | null
  taskTypeKey?: string | null
  legacyType?: string | null
}

export interface TaskTypeXpCalcResult {
  baseXp: number
  xpMultiplier: number
  weightedXp: number
  buildMultiplier: number
}

export const TaskTypesService = {
  /**
   * Ensure default task types exist for a user (idempotent)
   * Creates defaults only if the user has zero task types
   */
  async ensureDefaultTaskTypes(userId: string): Promise<void> {
    // Check if user has any task types
    const existingCount = await prisma.taskType.count({
      where: { userId },
    })

    if (existingCount > 0) {
      return // User already has task types, do nothing
    }

    // Create default task types in a transaction
    await prisma.$transaction(
      DEFAULT_TASK_TYPES.map((tt) =>
        prisma.taskType.create({
          data: {
            userId,
            key: tt.key,
            name: tt.name,
            emoji: tt.emoji,
            xpBase: tt.xpBase,
            xpPerMinute: tt.xpPerMinute,
            xpCap: tt.xpCap,
            xpMultiplier: new Decimal(tt.xpMultiplier),
            buildMultiplier: new Decimal(tt.buildMultiplier),
            sortOrder: tt.sortOrder,
          },
        })
      )
    )

    console.log(`[TaskTypes] Created default task types for user ${userId}`)
  },

  /**
   * Resolve a task type ID from various inputs
   * Priority: taskTypeId > taskTypeKey > legacyType > fallback to 'other'
   */
  async resolveTaskTypeId(params: ResolveTaskTypeParams): Promise<string> {
    const { userId, taskTypeId, taskTypeKey, legacyType } = params

    // 1. If taskTypeId is provided, verify it belongs to user
    if (taskTypeId) {
      const taskType = await prisma.taskType.findFirst({
        where: { id: taskTypeId, userId },
        select: { id: true },
      })

      if (!taskType) {
        throw new Error(`Task type ${taskTypeId} not found or doesn't belong to user`)
      }

      return taskType.id
    }

    // 2. If taskTypeKey is provided, lookup by (userId, key)
    if (taskTypeKey) {
      const taskType = await prisma.taskType.findUnique({
        where: { userId_key: { userId, key: taskTypeKey } },
        select: { id: true },
      })

      if (taskType) {
        return taskType.id
      }
      // Key not found, fall through to ensure defaults and try again
    }

    // 3. Map legacy type to key
    const key = taskTypeKey || (legacyType ? LEGACY_TYPE_TO_KEY[legacyType] : null) || 'other'

    // Ensure defaults exist first
    await this.ensureDefaultTaskTypes(userId)

    // Lookup by key
    const taskType = await prisma.taskType.findUnique({
      where: { userId_key: { userId, key } },
      select: { id: true },
    })

    if (taskType) {
      return taskType.id
    }

    // Fallback to 'other' if specific key not found
    const otherType = await prisma.taskType.findUnique({
      where: { userId_key: { userId, key: 'other' } },
      select: { id: true },
    })

    if (!otherType) {
      throw new Error(`Could not resolve task type for user ${userId}`)
    }

    return otherType.id
  },

  /**
   * Backfill taskTypeId for tasks that don't have one (idempotent)
   * Maps legacy Task.type values to TaskType records
   */
  async backfillTasksTaskTypeId(userId: string): Promise<number> {
    // Ensure defaults exist first
    await this.ensureDefaultTaskTypes(userId)

    // Get user's task types
    const taskTypes = await prisma.taskType.findMany({
      where: { userId },
      select: { id: true, key: true },
    })

    const keyToId = Object.fromEntries(taskTypes.map((tt) => [tt.key, tt.id]))

    let updatedCount = 0

    // Batch update by legacy type
    for (const [legacyType, key] of Object.entries(LEGACY_TYPE_TO_KEY)) {
      const taskTypeId = keyToId[key]
      if (!taskTypeId) continue

      const result = await prisma.task.updateMany({
        where: {
          userId,
          type: legacyType,
          taskTypeId: null,
        },
        data: {
          taskTypeId,
        },
      })

      updatedCount += result.count
    }

    // Handle tasks with unknown types -> map to 'other'
    const otherId = keyToId['other']
    if (otherId) {
      const result = await prisma.task.updateMany({
        where: {
          userId,
          taskTypeId: null,
          NOT: {
            type: { in: Object.keys(LEGACY_TYPE_TO_KEY) },
          },
        },
        data: {
          taskTypeId: otherId,
        },
      })

      updatedCount += result.count
    }

    if (updatedCount > 0) {
      console.log(`[TaskTypes] Backfilled ${updatedCount} tasks for user ${userId}`)
    }

    return updatedCount
  },

  /**
   * Calculate XP for a task using its task type's rules
   */
  calculateXp(taskType: TaskType, durationMin?: number | null): TaskTypeXpCalcResult {
    let baseXp: number

    if (durationMin && durationMin > 0) {
      // Duration-based: xpPerMinute * minutes, capped at xpCap
      baseXp = Math.min(durationMin * taskType.xpPerMinute, taskType.xpCap)
    } else {
      // No duration: use base XP
      baseXp = taskType.xpBase
    }

    const xpMultiplier = Number(taskType.xpMultiplier)
    const weightedXp = Math.round(baseXp * xpMultiplier)
    const buildMultiplier = Number(taskType.buildMultiplier)

    return {
      baseXp,
      xpMultiplier,
      weightedXp,
      buildMultiplier,
    }
  },

  /**
   * Get all task types for a user, sorted by sortOrder
   */
  async getTaskTypes(
    userId: string,
    options: { includeArchived?: boolean } = {}
  ): Promise<TaskType[]> {
    const where: Prisma.TaskTypeWhereInput = { userId }

    if (!options.includeArchived) {
      where.isArchived = false
    }

    return prisma.taskType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    })
  },

  /**
   * Create a new task type for a user
   */
  async createTaskType(
    userId: string,
    data: {
      name: string
      key?: string
      emoji?: string
      xpBase?: number
      xpPerMinute?: number
      xpCap?: number
      xpMultiplier?: number
      buildMultiplier?: number
    }
  ): Promise<TaskType> {
    // Generate key from name if not provided
    const key =
      data.key ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') +
        '_' +
        Date.now().toString(36)

    // Get next sort order
    const maxSortOrder = await prisma.taskType.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    })
    const sortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1

    const emoji = resolveTaskTypeEmoji({ emoji: data.emoji, key, name: data.name })

    return prisma.taskType.create({
      data: {
        userId,
        key,
        name: data.name,
        emoji,
        xpBase: data.xpBase ?? 60,
        xpPerMinute: data.xpPerMinute ?? 1,
        xpCap: data.xpCap ?? 60,
        xpMultiplier: new Decimal(data.xpMultiplier ?? 1.0),
        buildMultiplier: new Decimal(data.buildMultiplier ?? 1.0),
        sortOrder,
      },
    })
  },

  /**
   * Update a task type
   */
  async updateTaskType(
    userId: string,
    taskTypeId: string,
    data: Partial<{
      name: string
      xpBase: number
      xpPerMinute: number
      xpCap: number
      xpMultiplier: number
      buildMultiplier: number
      sortOrder: number
      isArchived: boolean
      emoji: string
    }>
  ): Promise<TaskType> {
    // Verify ownership
    const existing = await prisma.taskType.findFirst({
      where: { id: taskTypeId, userId },
    })

    if (!existing) {
      throw new Error(`Task type ${taskTypeId} not found or doesn't belong to user`)
    }

    const updateData: Prisma.TaskTypeUpdateInput = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.xpBase !== undefined) updateData.xpBase = data.xpBase
    if (data.xpPerMinute !== undefined) updateData.xpPerMinute = data.xpPerMinute
    if (data.xpCap !== undefined) updateData.xpCap = data.xpCap
    if (data.xpMultiplier !== undefined) updateData.xpMultiplier = new Decimal(data.xpMultiplier)
    if (data.buildMultiplier !== undefined) updateData.buildMultiplier = new Decimal(data.buildMultiplier)
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived
    if (data.emoji !== undefined) updateData.emoji = data.emoji

    return prisma.taskType.update({
      where: { id: taskTypeId },
      data: updateData,
    })
  },

  /**
   * Get a task type by ID (with user ownership check)
   */
  async getTaskTypeById(userId: string, taskTypeId: string): Promise<TaskType | null> {
    return prisma.taskType.findFirst({
      where: { id: taskTypeId, userId },
    })
  },
}
