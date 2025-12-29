import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockPrisma = {
  phoneDailyLog: { findFirst: ReturnType<typeof vi.fn> }
  iosScreenTimeDaily: { findUnique: ReturnType<typeof vi.fn> }
  iosScreenTimeConnection: { findUnique: ReturnType<typeof vi.fn> }
  truthCheckDaily: {
    upsert: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  truthViolation: { upsert: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const mockPrisma: MockPrisma = {
  phoneDailyLog: { findFirst: vi.fn() },
  iosScreenTimeDaily: { findUnique: vi.fn() },
  iosScreenTimeConnection: { findUnique: vi.fn() },
  truthCheckDaily: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  truthViolation: { upsert: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

const createXpEvent = vi.fn(async () => ({
  event: { id: 'xp1', delta: -20 },
  newTotalXp: 0,
  newLevel: 0,
  levelUp: false,
  hpModulated: false,
  originalDelta: -20,
  modulatedDelta: -20,
  deduped: false,
}))

vi.mock('../lib/xp.service', () => ({
  XpService: { createEvent: createXpEvent },
}))

// Mock DragonService to avoid complex database operations
vi.mock('../lib/dragon.service', () => ({
  DragonService: {
    applyTruthMismatchAttack: vi.fn(async () => ({ applied: false, reason: 'mocked' })),
    applyAutoRepairs: vi.fn(async () => []),
  },
}))

const { TruthService } = await import('../lib/truth.service')

beforeEach(() => {
  vi.clearAllMocks()
  // Default mocks for DragonService dependencies
  mockPrisma.truthViolation.findMany.mockResolvedValue([])
  mockPrisma.iosScreenTimeConnection.findUnique.mockResolvedValue({ enabled: false })
})

describe('TruthService.applyTruthConsequences', () => {
  it('is idempotent (double apply for same date creates one penalty)', async () => {
    const userId = 'userA'
    const date = new Date('2025-01-02T00:00:00.000Z')

    const truthCheckState: any = {
      id: 't1',
      userId,
      date,
      reportedMinutes: 10,
      verifiedMinutes: 0,
      deltaMinutes: 10,
      status: 'mismatch',
      source: 'ios_screentime',
      sourceRecordId: 'ios1',
      violationId: null,
    }

    mockPrisma.phoneDailyLog.findFirst.mockResolvedValue({ socialMediaMin: 10 })
    mockPrisma.iosScreenTimeDaily.findUnique.mockResolvedValue({
      id: 'ios1',
      verifiedMinutes: 0,
    })

    mockPrisma.truthCheckDaily.upsert.mockImplementation(async ({ create, update }: any) => {
      Object.assign(truthCheckState, { ...create, ...update })
      return truthCheckState
    })

    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma))

    mockPrisma.truthCheckDaily.findUnique.mockImplementation(async () => truthCheckState)

    mockPrisma.truthViolation.upsert.mockResolvedValue({ id: 'v1' })
    mockPrisma.truthCheckDaily.update.mockImplementation(async ({ data }: any) => {
      truthCheckState.violationId = data.violationId
      return truthCheckState
    })

    const first = await TruthService.applyTruthConsequences(userId, date, 'ios_screentime')
    const second = await TruthService.applyTruthConsequences(userId, date, 'ios_screentime')

    expect(first.applied).toBe(true)
    expect(second.applied).toBe(false)

    expect(mockPrisma.truthViolation.upsert).toHaveBeenCalledTimes(1)
    expect(createXpEvent).toHaveBeenCalledTimes(1)
  })

  it('does not penalize when verification is missing (missing_verification)', async () => {
    const userId = 'userA'
    const date = new Date('2025-01-03T00:00:00.000Z')

    mockPrisma.phoneDailyLog.findFirst.mockResolvedValue({ socialMediaMin: 42 })
    mockPrisma.iosScreenTimeDaily.findUnique.mockResolvedValue(null)

    mockPrisma.truthCheckDaily.upsert.mockImplementation(async ({ create, update }: any) => {
      return { id: 't2', userId, date, ...create, ...update, violationId: null }
    })

    const res = await TruthService.applyTruthConsequences(userId, date, 'ios_screentime')

    expect(res.truthCheck.status).toBe('missing_verification')
    expect(res.applied).toBe(false)
    expect(createXpEvent).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('does not penalize when report is missing (missing_report)', async () => {
    const userId = 'userA'
    const date = new Date('2025-01-04T00:00:00.000Z')

    mockPrisma.phoneDailyLog.findFirst.mockResolvedValue(null)
    mockPrisma.iosScreenTimeDaily.findUnique.mockResolvedValue({
      id: 'ios2',
      verifiedMinutes: 30,
    })

    mockPrisma.truthCheckDaily.upsert.mockImplementation(async ({ create, update }: any) => {
      return { id: 't3', userId, date, ...create, ...update, violationId: null }
    })

    const res = await TruthService.applyTruthConsequences(userId, date, 'ios_screentime')

    expect(res.truthCheck.status).toBe('missing_report')
    expect(res.applied).toBe(false)
    expect(createXpEvent).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })
})
