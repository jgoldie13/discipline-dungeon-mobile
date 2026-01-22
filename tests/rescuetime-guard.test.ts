import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockPrisma = {
  phoneDailyLog: { findFirst: ReturnType<typeof vi.fn> }
  iosScreenTimeDaily: { findUnique: ReturnType<typeof vi.fn> }
  truthCheckDaily: { upsert: ReturnType<typeof vi.fn> }
  truthViolation: { upsert: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const mockPrisma: MockPrisma = {
  phoneDailyLog: { findFirst: vi.fn() },
  iosScreenTimeDaily: { findUnique: vi.fn() },
  truthCheckDaily: { upsert: vi.fn() },
  truthViolation: { upsert: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('../lib/xp.service', () => ({ XpService: { createEvent: vi.fn() } }))
vi.mock('../lib/dragon.service', () => ({
  DragonService: {
    applyTruthMismatchAttack: vi.fn(async () => ({ applied: false })),
    applyAutoRepairs: vi.fn(async () => []),
  },
}))

describe('RescueTime guardrail', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.ENABLE_RESCUETIME
  })

  it('rejects non-iOS sources when RescueTime flag is off', async () => {
    const { TruthService } = await import('../lib/truth.service')
    await expect(
      TruthService.computeTruthCheck('userA', new Date(), 'rescuetime')
    ).rejects.toThrow('disabled')
  })
})
