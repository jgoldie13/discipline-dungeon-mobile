import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockTx = {
  truthCheckDaily: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  phoneDailyLog: {
    findFirst: ReturnType<typeof vi.fn>
  }
  rescueTimeDaily: {
    findUnique: ReturnType<typeof vi.fn>
  }
  usageViolation: {
    upsert: ReturnType<typeof vi.fn>
  }
  auditEvent: {
    upsert: ReturnType<typeof vi.fn>
  }
}

const mockTx: MockTx = {
  truthCheckDaily: {
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  phoneDailyLog: {
    findFirst: vi.fn(),
  },
  rescueTimeDaily: {
    findUnique: vi.fn(),
  },
  usageViolation: {
    upsert: vi.fn(),
  },
  auditEvent: {
    upsert: vi.fn(),
  },
}

const mockPrisma = {
  phoneDailyLog: mockTx.phoneDailyLog,
  rescueTimeDaily: mockTx.rescueTimeDaily,
  truthCheckDaily: mockTx.truthCheckDaily,
  usageViolation: mockTx.usageViolation,
  auditEvent: mockTx.auditEvent,
  $transaction: vi.fn(async (fn: any) => fn(mockTx)),
}

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('../lib/xp.service', () => ({
  XpService: {
    createEvent: vi.fn(async () => ({})),
  },
}))

const { TruthService, TRUTH_DELTA_THRESHOLD_MINUTES } = await import('../lib/truth.service')
const { XpService } = await import('../lib/xp.service')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TruthService.computeTruthCheck', () => {
  it('missing_report when verification exists but no report', async () => {
    mockTx.phoneDailyLog.findFirst.mockResolvedValueOnce(null)
    mockTx.rescueTimeDaily.findUnique.mockResolvedValueOnce({ verifiedMinutes: 30 })
    mockTx.truthCheckDaily.upsert.mockResolvedValueOnce({ status: 'missing_report' })

    const date = new Date('2025-01-02T00:00:00.000Z')
    const res = await TruthService.computeTruthCheck('u', date)
    expect(res.status).toBe('missing_report')
    expect(mockTx.truthCheckDaily.upsert).toHaveBeenCalled()
  })

  it('missing_verification when report exists but no verification', async () => {
    mockTx.phoneDailyLog.findFirst.mockResolvedValueOnce({ socialMediaMin: 30 })
    mockTx.rescueTimeDaily.findUnique.mockResolvedValueOnce(null)
    mockTx.truthCheckDaily.upsert.mockResolvedValueOnce({ status: 'missing_verification' })

    const date = new Date('2025-01-02T00:00:00.000Z')
    const res = await TruthService.computeTruthCheck('u', date)
    expect(res.status).toBe('missing_verification')
  })

  it('match when abs(delta) <= threshold', async () => {
    mockTx.phoneDailyLog.findFirst.mockResolvedValueOnce({ socialMediaMin: 30 })
    mockTx.rescueTimeDaily.findUnique.mockResolvedValueOnce({ verifiedMinutes: 30 + TRUTH_DELTA_THRESHOLD_MINUTES })
    mockTx.truthCheckDaily.upsert.mockResolvedValueOnce({ status: 'match', deltaMinutes: -TRUTH_DELTA_THRESHOLD_MINUTES })

    const date = new Date('2025-01-02T00:00:00.000Z')
    const res = await TruthService.computeTruthCheck('u', date)
    expect(res.status).toBe('match')
  })

  it('mismatch when abs(delta) > threshold', async () => {
    mockTx.phoneDailyLog.findFirst.mockResolvedValueOnce({ socialMediaMin: 10 })
    mockTx.rescueTimeDaily.findUnique.mockResolvedValueOnce({ verifiedMinutes: 30 })
    mockTx.truthCheckDaily.upsert.mockResolvedValueOnce({ status: 'mismatch', deltaMinutes: -20 })

    const date = new Date('2025-01-02T00:00:00.000Z')
    const res = await TruthService.computeTruthCheck('u', date)
    expect(res.status).toBe('mismatch')
    expect(res.deltaMinutes).toBe(-20)
  })
})

describe('TruthService.applyTruthConsequences', () => {
  it('is idempotent: second run does nothing', async () => {
    const date = new Date('2025-01-02T00:00:00.000Z')

    mockTx.truthCheckDaily.findUnique
      .mockResolvedValueOnce({
        userId: 'u',
        date,
        status: 'mismatch',
        reportedMinutes: 10,
        verifiedMinutes: 40,
        deltaMinutes: -30,
        violationId: null,
      })
      .mockResolvedValueOnce({
        userId: 'u',
        date,
        status: 'mismatch',
        reportedMinutes: 10,
        verifiedMinutes: 40,
        deltaMinutes: -30,
        violationId: 'truth:u:2025-01-02',
      })

    mockTx.usageViolation.upsert.mockResolvedValueOnce({ id: 'truth:u:2025-01-02' })
    mockTx.auditEvent.upsert.mockResolvedValueOnce({ id: 'truthaudit:u:2025-01-02' })
    mockTx.truthCheckDaily.update.mockResolvedValueOnce({})

    const first = await TruthService.applyTruthConsequences('u', date)
    const second = await TruthService.applyTruthConsequences('u', date)

    expect(first.applied).toBe(true)
    expect(second.applied).toBe(false)
    expect((XpService.createEvent as any).mock.calls.length).toBe(1)
    expect(mockTx.usageViolation.upsert).toHaveBeenCalledTimes(1)
  })
})

