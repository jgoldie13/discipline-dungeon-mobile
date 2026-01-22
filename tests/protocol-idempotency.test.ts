import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  dailyProtocol: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}

const createEvent = vi.fn(async () => ({
  event: { id: 'xp1', delta: 30 },
  newTotalXp: 30,
  newLevel: 0,
  levelUp: false,
  hpModulated: false,
  originalDelta: 30,
  modulatedDelta: 30,
  deduped: false,
}))

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('../lib/xp.service', () => ({
  XpService: { createEvent },
}))

const { ProtocolService } = await import('../lib/protocol.service')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProtocolService.completeProtocol', () => {
  it('is idempotent and does not apply HP directly', async () => {
    const protocolState: any = {
      id: 'p1',
      userId: 'user1',
      date: new Date('2026-01-22T00:00:00.000Z'),
      wokeOnTime: true,
      gotMorningLight: true,
      drankWater: true,
      delayedCaffeine: false,
      completed: false,
      completedAt: null,
      xpEarned: 0,
      hpBonus: 0,
    }

    mockPrisma.user.findUnique.mockResolvedValue({ timezone: 'America/Chicago' })
    mockPrisma.dailyProtocol.findUnique.mockResolvedValue(protocolState)
    mockPrisma.dailyProtocol.findFirst.mockResolvedValue(null)
    mockPrisma.dailyProtocol.update.mockImplementation(async ({ data }: any) => {
      Object.assign(protocolState, data)
      return protocolState
    })

    const date = new Date('2026-01-22T12:00:00.000Z')
    const first = await ProtocolService.completeProtocol('user1', date)
    const second = await ProtocolService.completeProtocol('user1', date)

    expect(first.completed).toBe(true)
    expect(second.completed).toBe(true)
    expect(createEvent).toHaveBeenCalledTimes(1)
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: 'protocol:p1:complete' })
    )
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })
})
