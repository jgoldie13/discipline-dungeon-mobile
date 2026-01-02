import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

type MockPrisma = {
  $queryRaw: ReturnType<typeof vi.fn>
  user: {
    findUnique: ReturnType<typeof vi.fn>
  }
  phoneDailyLog: {
    upsert: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  iosScreenTimeConnection: {
    findUnique: ReturnType<typeof vi.fn>
  }
  usageViolation: {
    upsert: ReturnType<typeof vi.fn>
  }
}

const mockPrisma: MockPrisma = {
  $queryRaw: vi.fn(),
  user: {
    findUnique: vi.fn(),
  },
  phoneDailyLog: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  iosScreenTimeConnection: {
    findUnique: vi.fn(),
  },
  usageViolation: {
    upsert: vi.fn(),
  },
}

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))

const {
  safeFindPhoneDailyAutoLog,
  upsertPhoneDailyLog,
  resolveDateKey,
  safeFindUserTimezone,
  upsertUsageViolation,
} = await import('../lib/phone-log.helpers')

const { dateOnlyInTZ } = await import('../lib/dateOnly')

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
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

describe('resolveDateKey - Timezone Day Boundary', () => {
  it('returns correct timezone and date key from user iOS connection', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-10T12:00:00.000Z'))
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.iosScreenTimeConnection.findUnique.mockResolvedValueOnce({
      timezone: 'America/Chicago',
    })

    const result = await resolveDateKey('user123', null)

    expect(result.timezone).toBe('America/Chicago')
    expect(result.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
    expect(result.startOfDay).toBeInstanceOf(Date)
    expect(result.startOfDay.toISOString()).toBe('2024-03-10T06:00:00.000Z')
    vi.useRealTimers()
  })

  it('handles explicit date string parameter', async () => {
    const result = await resolveDateKey('user123', '2025-12-25')

    expect(result.timezone).toBe('UTC')
    expect(result.dateKey).toBe('2025-12-25')
    expect(result.startOfDay).toEqual(new Date('2025-12-25T00:00:00.000Z'))
    // Should not call database when date is provided
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.iosScreenTimeConnection.findUnique).not.toHaveBeenCalled()
  })

  it('falls back to default timezone when iOS connection not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.iosScreenTimeConnection.findUnique.mockResolvedValueOnce(null)

    const result = await resolveDateKey('user123', null)

    expect(result.timezone).toBe('America/Chicago')
    expect(result.dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('demonstrates timezone boundary difference', () => {
    // Dec 21, 2025 at 5:00 AM UTC
    const utcTime = new Date('2025-12-21T05:00:00.000Z')

    // In UTC, this is Dec 21
    const utcDateKey = dateOnlyInTZ(utcTime, 'UTC')
    expect(utcDateKey).toBe('2025-12-21')

    // In America/Chicago (CST, UTC-6), this is still Dec 20
    const chicagoDateKey = dateOnlyInTZ(utcTime, 'America/Chicago')
    expect(chicagoDateKey).toBe('2025-12-20')

    // This proves timezone-aware day boundaries work correctly
  })
})

describe('safeFindUserTimezone', () => {
  it('returns user timezone from user record', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      timezone: 'America/Los_Angeles',
    })

    const timezone = await safeFindUserTimezone('user123')

    expect(timezone).toBe('America/Los_Angeles')
  })

  it('returns user timezone from iOS connection', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.iosScreenTimeConnection.findUnique.mockResolvedValueOnce({
      timezone: 'America/New_York',
    })

    const timezone = await safeFindUserTimezone('user123')

    expect(timezone).toBe('America/New_York')
  })

  it('returns default timezone when connection not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.iosScreenTimeConnection.findUnique.mockResolvedValueOnce(null)

    const timezone = await safeFindUserTimezone('user123')

    expect(timezone).toBe('America/Chicago')
  })

  it('handles missing table error gracefully', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null)
    mockPrisma.iosScreenTimeConnection.findUnique.mockRejectedValueOnce({
      code: 'P2021',
    })

    const timezone = await safeFindUserTimezone('user123')

    expect(timezone).toBe('America/Chicago')
  })
})

describe('upsertUsageViolation - Idempotency', () => {
  it('upserts violation using composite unique key', async () => {
    const testDate = new Date('2025-12-21T00:00:00.000Z')
    mockPrisma.usageViolation.upsert.mockResolvedValueOnce({
      id: 'violation123',
      userId: 'user123',
      date: testDate,
      totalOverage: 30,
      penalty: 'Lost XP and streak - 30 minutes over limit',
      executed: true,
      executedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await upsertUsageViolation({
      userId: 'user123',
      date: testDate,
      overage: 30,
    })

    expect(result.id).toBe('violation123')
    expect(mockPrisma.usageViolation.upsert).toHaveBeenCalledWith({
      where: {
        userId_date: { userId: 'user123', date: testDate },
      },
      create: expect.objectContaining({
        userId: 'user123',
        date: testDate,
        totalOverage: 30,
        executed: true,
      }),
      update: expect.objectContaining({
        totalOverage: 30,
        executed: true,
      }),
    })
  })

  it('prevents double-penalization on repeated submissions', async () => {
    const testDate = new Date('2025-12-21T00:00:00.000Z')

    // First submission
    mockPrisma.usageViolation.upsert.mockResolvedValueOnce({
      id: 'violation123',
      userId: 'user123',
      date: testDate,
      totalOverage: 30,
      penalty: 'Lost XP and streak - 30 minutes over limit',
      executed: true,
      executedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await upsertUsageViolation({
      userId: 'user123',
      date: testDate,
      overage: 30,
    })

    // Second submission (idempotent - same record)
    mockPrisma.usageViolation.upsert.mockResolvedValueOnce({
      id: 'violation123', // Same ID
      userId: 'user123',
      date: testDate,
      totalOverage: 45, // Updated overage
      penalty: 'Lost XP and streak - 45 minutes over limit',
      executed: true,
      executedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await upsertUsageViolation({
      userId: 'user123',
      date: testDate,
      overage: 45,
    })

    expect(result.id).toBe('violation123') // Same violation
    expect(result.totalOverage).toBe(45)
    expect(mockPrisma.usageViolation.upsert).toHaveBeenCalledTimes(2)
  })
})
