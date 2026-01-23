import { describe, expect, it } from 'vitest'
import { createEngine } from '../lib/policy/PolicyEngine'

describe('Phone-free endurance bonus preview', () => {
  const engine = createEngine()

  it('matches tier expectations for key durations', () => {
    expect(engine.calculatePhoneFreeEnduranceBonusPreview(30)).toBe(0)
    expect(engine.calculatePhoneFreeEnduranceBonusPreview(60)).toBeCloseTo(4.5, 5)
    expect(engine.calculatePhoneFreeEnduranceBonusPreview(90)).toBeCloseTo(13.5, 5)
    expect(engine.calculatePhoneFreeEnduranceBonusPreview(120)).toBeCloseTo(19.5, 5)
    expect(engine.calculatePhoneFreeEnduranceBonusPreview(180)).toBeCloseTo(19.5, 5)
  })

  it('saturates at 120 minutes', () => {
    const cap = engine.calculatePhoneFreeEnduranceBonusPreview(120)
    const durations = [121, 150, 180, 240, 1000]
    for (const duration of durations) {
      expect(engine.calculatePhoneFreeEnduranceBonusPreview(duration)).toBeCloseTo(cap, 5)
    }
  })

  it('is monotonic for increasing durations', () => {
    let previous = 0
    for (let minutes = 0; minutes <= 240; minutes += 1) {
      const bonus = engine.calculatePhoneFreeEnduranceBonusPreview(minutes)
      expect(bonus).toBeGreaterThanOrEqual(previous)
      previous = bonus
    }
  })
})
