import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  phoneFreeBlock: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
  },
  user: {
    upsert: vi.fn(),
  },
}

const createEvent = vi.fn(async () => ({
  event: { id: 'xp1', delta: 60 },
  newTotalXp: 60,
  newLevel: 0,
  levelUp: false,
  hpModulated: false,
  originalDelta: 60,
  modulatedDelta: 60,
  deduped: false,
}))

const applyBuildPoints = vi.fn(async () => ({ applied: true }))

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('../lib/xp.service', () => ({
  XpService: { createEvent },
}))
vi.mock('../lib/build', () => ({ applyBuildPoints }))

const { PhoneBlockService } = await import('../lib/phone-block.service')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PhoneBlockService', () => {
  it('returns existing active block when starting twice', async () => {
    const activeBlock = {
      id: 'b1',
      userId: 'user1',
      startTime: new Date(),
      durationMin: 30,
      status: 'ACTIVE',
      pomodoroEnabled: false,
      pomodoroFocusMin: null,
      pomodoroBreakMin: null,
    }

    mockPrisma.phoneFreeBlock.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(activeBlock)
    mockPrisma.phoneFreeBlock.create.mockResolvedValue(activeBlock)
    mockPrisma.user.upsert.mockResolvedValue({ id: 'user1' })

    const first = await PhoneBlockService.startBlock('user1', 30)
    const second = await PhoneBlockService.startBlock('user1', 30)

    expect(first.block.id).toBe('b1')
    expect(first.wasExisting).toBe(false)
    expect(second.block.id).toBe('b1')
    expect(second.wasExisting).toBe(true)
    expect(mockPrisma.phoneFreeBlock.create).toHaveBeenCalledTimes(1)
  })

  it('completes blocks idempotently', async () => {
    const activeBlock = {
      id: 'b2',
      userId: 'user1',
      startTime: new Date(),
      durationMin: 60,
      status: 'ACTIVE',
      xpEarned: 0,
    }
    const completedBlock = { ...activeBlock, status: 'COMPLETED', xpEarned: 60 }

    mockPrisma.phoneFreeBlock.findFirst
      .mockResolvedValueOnce(activeBlock)
      .mockResolvedValueOnce(completedBlock)
    mockPrisma.phoneFreeBlock.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.phoneFreeBlock.findUnique.mockResolvedValue(completedBlock)

    const endTime = new Date()
    const first = await PhoneBlockService.completeBlock('user1', 'b2', 60, endTime)
    const second = await PhoneBlockService.completeBlock('user1', 'b2', 60, endTime)

    expect(first.deduped).toBe(false)
    expect(second.deduped).toBe(true)
    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: 'block:b2:complete' })
    )
    expect(applyBuildPoints).toHaveBeenCalledTimes(1)
  })
})
