import { describe, expect, it } from 'vitest'
import { calculateAwardedMinutes } from '../lib/phone-block.helpers'

describe('calculateAwardedMinutes', () => {
  it('clamps to elapsed minutes when shorter than planned', () => {
    const start = new Date('2025-01-01T00:00:00.000Z')
    const end = new Date(start.getTime() + 10 * 60 * 1000)
    const { elapsedMin, awardMin } = calculateAwardedMinutes(start, end, 60)

    expect(elapsedMin).toBe(10)
    expect(awardMin).toBe(10)
  })

  it('floors fractional minutes', () => {
    const start = new Date('2025-01-01T00:00:00.000Z')
    const end = new Date(start.getTime() + 60.9 * 60 * 1000)
    const { elapsedMin, awardMin } = calculateAwardedMinutes(start, end, 120)

    expect(elapsedMin).toBe(60)
    expect(awardMin).toBe(60)
  })

  it('returns 0 for non-positive elapsed time', () => {
    const start = new Date('2025-01-01T00:00:00.000Z')
    const end = new Date(start.getTime() - 10 * 1000)
    const { elapsedMin, awardMin } = calculateAwardedMinutes(start, end, 30)

    expect(elapsedMin).toBe(0)
    expect(awardMin).toBe(0)
  })
})
