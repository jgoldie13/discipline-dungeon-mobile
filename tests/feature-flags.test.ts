import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('feature flags', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.ENABLE_RESCUETIME
  })

  it('RESCUETIME_ENABLED defaults to false', async () => {
    const { RESCUETIME_ENABLED } = await import('../lib/feature-flags')
    expect(RESCUETIME_ENABLED).toBe(false)
  })
})
