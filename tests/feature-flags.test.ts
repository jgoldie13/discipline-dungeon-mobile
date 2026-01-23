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

  it('ENABLE_PHONEFREE_ENDURANCE_BONUS_MINT defaults to false', async () => {
    const { ENABLE_PHONEFREE_ENDURANCE_BONUS_MINT } = await import('../lib/feature-flags')
    expect(ENABLE_PHONEFREE_ENDURANCE_BONUS_MINT).toBe(false)
  })
})
