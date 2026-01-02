import { describe, expect, it } from 'vitest'
import {
  addUserLocalDaysUtcKey,
  getUserDayBoundsUtc,
  getUserDayKeyUtc,
} from '../lib/time'

describe('getUserDayBoundsUtc', () => {
  it('handles DST start in America/Chicago', () => {
    const instant = new Date('2024-03-10T12:00:00.000Z')
    const { startUtc, endUtc } = getUserDayBoundsUtc('America/Chicago', instant)

    expect(startUtc.toISOString()).toBe('2024-03-10T06:00:00.000Z')
    expect(endUtc.toISOString()).toBe('2024-03-11T05:00:00.000Z')
  })

  it('handles DST end in America/Chicago', () => {
    const instant = new Date('2024-11-03T12:00:00.000Z')
    const { startUtc, endUtc } = getUserDayBoundsUtc('America/Chicago', instant)

    expect(startUtc.toISOString()).toBe('2024-11-03T05:00:00.000Z')
    expect(endUtc.toISOString()).toBe('2024-11-04T06:00:00.000Z')
  })
})

describe('addUserLocalDaysUtcKey', () => {
  it('handles DST start week offsets', () => {
    const dayKey = new Date('2024-03-10T06:00:00.000Z')
    const sevenDaysAgo = addUserLocalDaysUtcKey('America/Chicago', dayKey, -6)

    expect(sevenDaysAgo.toISOString()).toBe('2024-03-04T06:00:00.000Z')
  })

  it('handles DST end week offsets', () => {
    const dayKey = new Date('2024-11-03T05:00:00.000Z')
    const sevenDaysAgo = addUserLocalDaysUtcKey('America/Chicago', dayKey, -6)

    expect(sevenDaysAgo.toISOString()).toBe('2024-10-28T05:00:00.000Z')
  })

  it('matches day-key progression across local days', () => {
    const tz = 'America/Chicago'
    const dayA = getUserDayKeyUtc(tz, new Date('2024-03-09T12:00:00.000Z'))
    const dayB = getUserDayKeyUtc(tz, new Date('2024-03-10T12:00:00.000Z'))

    expect(addUserLocalDaysUtcKey(tz, dayA, 1).toISOString()).toBe(
      dayB.toISOString()
    )
  })
})
