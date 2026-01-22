import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrisma = {
  sleepLog: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  dailyProtocol: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
}

const calculateHp = vi.fn(async (metrics: any) => ({
  hp: metrics.gotMorningLight ? 85 : 80,
  breakdown: {},
  status: 'good',
}))

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('../lib/hp.service', () => ({
  HpService: { calculateHp },
}))

const { EnergyService } = await import('../lib/energy.service')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EnergyService.recomputeDailyHp', () => {
  it('uses morning light once from sleep log or protocol', async () => {
    mockPrisma.sleepLog.findUnique.mockResolvedValue(null)
    mockPrisma.sleepLog.findFirst.mockResolvedValue({
      id: 's1',
      userId: 'user1',
      date: new Date('2026-01-22T00:00:00.000Z'),
      bedtime: new Date('2026-01-21T23:00:00.000Z'),
      waketime: new Date('2026-01-22T07:00:00.000Z'),
      subjectiveRested: 3,
      alcoholUnits: 0,
      caffeinePastNoon: false,
      caffeineHoursBefore: 0,
      screenMinBefore: 0,
      gotMorningLight: false,
      exercisedToday: false,
      exerciseHoursBefore: 0,
      lastMealHoursBefore: 0,
    })
    mockPrisma.dailyProtocol.findUnique.mockResolvedValue(null)
    mockPrisma.dailyProtocol.findFirst.mockResolvedValue({
      id: 'p1',
      userId: 'user1',
      date: new Date('2026-01-22T00:00:00.000Z'),
      gotMorningLight: true,
    })

    await EnergyService.recomputeDailyHp('user1', new Date('2026-01-22T12:00:00.000Z'))

    expect(calculateHp).toHaveBeenCalledTimes(1)
    expect(calculateHp.mock.calls[0][0].gotMorningLight).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: expect.objectContaining({ currentHp: 85 }),
    })
  })

  it('is idempotent when recomputing the same day', async () => {
    mockPrisma.sleepLog.findUnique.mockResolvedValue(null)
    mockPrisma.sleepLog.findFirst.mockResolvedValue({
      id: 's2',
      userId: 'user2',
      date: new Date('2026-01-22T00:00:00.000Z'),
      bedtime: new Date('2026-01-21T23:00:00.000Z'),
      waketime: new Date('2026-01-22T07:00:00.000Z'),
      subjectiveRested: 4,
      alcoholUnits: 0,
      caffeinePastNoon: false,
      caffeineHoursBefore: 0,
      screenMinBefore: 0,
      gotMorningLight: true,
      exercisedToday: false,
      exerciseHoursBefore: 0,
      lastMealHoursBefore: 0,
    })
    mockPrisma.dailyProtocol.findUnique.mockResolvedValue(null)
    mockPrisma.dailyProtocol.findFirst.mockResolvedValue(null)

    await EnergyService.recomputeDailyHp('user2', new Date('2026-01-22T12:00:00.000Z'))
    await EnergyService.recomputeDailyHp('user2', new Date('2026-01-22T12:00:00.000Z'))

    expect(mockPrisma.user.update).toHaveBeenCalledTimes(2)
    expect(mockPrisma.user.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ currentHp: 85 }) })
    )
    expect(mockPrisma.user.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ currentHp: 85 }) })
    )
  })
})
