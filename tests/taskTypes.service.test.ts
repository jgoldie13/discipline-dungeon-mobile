import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockPrisma = {
  taskType: {
    count: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    findMany: ReturnType<typeof vi.fn>
  }
  task: {
    updateMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const mockPrisma: MockPrisma = {
  taskType: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  task: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

const { TaskTypesService } = await import('../lib/taskTypes.service')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TaskTypesService scoping', () => {
  it("scopes getTaskTypeById by userId (can't read other users)", async () => {
    mockPrisma.taskType.findFirst.mockResolvedValueOnce(null)

    const result = await TaskTypesService.getTaskTypeById('userA', 'taskTypeB')

    expect(result).toBeNull()
    expect(mockPrisma.taskType.findFirst).toHaveBeenCalledWith({
      where: { id: 'taskTypeB', userId: 'userA' },
    })
  })

  it("scopes updateTaskType by userId (can't patch other users)", async () => {
    mockPrisma.taskType.findFirst.mockResolvedValueOnce(null)

    await expect(
      TaskTypesService.updateTaskType('userA', 'taskTypeB', { name: 'Nope' })
    ).rejects.toThrow(/doesn't belong to user/i)

    expect(mockPrisma.taskType.findFirst).toHaveBeenCalledWith({
      where: { id: 'taskTypeB', userId: 'userA' },
    })
  })
})

describe('TaskTypesService.calculateXp', () => {
  it('applies xpMultiplier and rounds', () => {
    const taskType = {
      id: 'tt',
      userId: 'u',
      key: 'custom',
      name: 'Custom',
      xpBase: 100,
      xpPerMinute: 2,
      xpCap: 60,
      xpMultiplier: 1.5 as any,
      buildMultiplier: 1.0 as any,
      sortOrder: 0,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const res = TaskTypesService.calculateXp(taskType as any, 10)
    expect(res.baseXp).toBe(20)
    expect(res.xpMultiplier).toBe(1.5)
    expect(res.weightedXp).toBe(30)
  })
})

describe('TaskTypesService.backfillTasksTaskTypeId', () => {
  it('is idempotent (second run updates 0)', async () => {
    mockPrisma.taskType.count.mockResolvedValue(5)
    mockPrisma.taskType.findMany.mockResolvedValue([
      { id: 'tt_exposure', key: 'exposure' },
      { id: 'tt_job', key: 'job_search' },
      { id: 'tt_habit', key: 'habit' },
      { id: 'tt_boss', key: 'boss' },
      { id: 'tt_other', key: 'other' },
    ])

    let phase = 0
    mockPrisma.task.updateMany.mockImplementation(async ({ where }: any) => {
      if (phase > 0) return { count: 0 }
      if (where?.NOT) return { count: 3 } // unknown legacy types -> other
      if (where?.type === 'exposure') return { count: 1 }
      if (where?.type === 'job_search') return { count: 2 }
      return { count: 0 }
    })

    const first = await TaskTypesService.backfillTasksTaskTypeId('userA')
    expect(first).toBe(6)

    phase = 1
    const second = await TaskTypesService.backfillTasksTaskTypeId('userA')
    expect(second).toBe(0)
  })
})

