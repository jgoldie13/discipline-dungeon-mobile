import { describe, expect, it } from 'vitest'
import { dateOnlyInTZ } from '../lib/dateOnly'

describe('dateOnlyInTZ', () => {
  it('uses the provided timezone at local midnight boundaries (America/Chicago)', () => {
    const early = new Date('2025-01-02T06:30:00.000Z') // 00:30 CST
    const late = new Date('2025-01-03T05:30:00.000Z') // 23:30 CST

    expect(dateOnlyInTZ(early, 'America/Chicago')).toBe('2025-01-02')
    expect(dateOnlyInTZ(late, 'America/Chicago')).toBe('2025-01-02')
  })
})
