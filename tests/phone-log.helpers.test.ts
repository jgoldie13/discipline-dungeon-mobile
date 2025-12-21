import { describe, expect, it, vi, beforeEach } from 'vitest'

type MockPrisma = {
  $queryRaw: ReturnType<typeof vi.fn>
  phoneDailyLog: {
    upsert: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  iosScreenTimeConnection: {
    findUnique: ReturnType<typeof vi.fn>
  }
}

const mockPrisma: MockPrisma = {
  $queryRaw: vi.fn(),
  phoneDailyLog: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  iosScreenTimeConnection: {
    findUnique: vi.fn(),
  },
}

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

const { safeFindPhoneDailyAutoLog, upsertPhoneDailyLog } = await import(
  '../lib/phone-log.helpers'
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('phone log helpers', () => {
  it('safeFindPhoneDailyAutoLog returns unavailable when table is missing', async () => {
    mockPrisma.$queryRaw.mockRejectedValue({
      code: 'P2021',
      message: 'relation "PhoneDailyAutoLog" does not exist',
    })

    const res = await safeFindPhoneDailyAutoLog('userA', new Date())
    expect(res).toEqual({ minutes: null, status: 'unavailable' })
  })

  it('safeFindPhoneDailyAutoLog returns minutes when present', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ minutes: 42 }])

    const res = await safeFindPhoneDailyAutoLog('userA', new Date())
    expect(res).toEqual({ minutes: 42, status: 'available' })
  })

  it('safeFindPhoneDailyAutoLog returns missing when no row exists', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([])

    const res = await safeFindPhoneDailyAutoLog('userA', new Date())
    expect(res).toEqual({ minutes: null, status: 'missing' })
  })

  it('upsertPhoneDailyLog falls back when composite unique is missing', async () => {
    mockPrisma.phoneDailyLog.upsert.mockRejectedValue(
      new Error('no unique or exclusion constraint matching the ON CONFLICT specification')
    )
    mockPrisma.phoneDailyLog.findFirst.mockResolvedValue({ id: 'log1' })
    mockPrisma.phoneDailyLog.update.mockResolvedValue({ id: 'log1' })

    const res = await upsertPhoneDailyLog({
      userId: 'userA',
      date: new Date('2025-01-01T00:00:00.000Z'),
      minutes: 10,
      limit: 30,
      overage: 0,
    })

    expect(mockPrisma.phoneDailyLog.update).toHaveBeenCalled()
    expect(res).toEqual({ id: 'log1' })
  })
})
