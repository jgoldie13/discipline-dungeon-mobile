import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { HpService, type SleepMetrics } from '../lib/hp.service'

function buildMetrics({
  drinks,
  hoursSlept,
}: {
  drinks: number
  hoursSlept: number
}): SleepMetrics {
  const bedtime = new Date('2024-01-01T00:00:00.000Z')
  const waketime = new Date(
    bedtime.getTime() + hoursSlept * 60 * 60 * 1000
  )

  return {
    bedtime,
    waketime,
    subjectiveRested: 3,
    alcoholUnits: drinks,
  }
}

describe('HpService.buildHpBreakdownDetails', () => {
  it('includes alcohol breakdown fields for 0 drinks', async () => {
    const metrics = buildMetrics({ drinks: 0, hoursSlept: 7 })
    const hpCalc = await HpService.calculateHp(metrics)
    const details = HpService.buildHpBreakdownDetails(metrics, hpCalc)

    expect(details.alcohol.alcoholPenaltyBase).toBe(0)
    expect(details.alcohol.alcoholPenaltyInteraction).toBe(0)
    expect(details.alcohol.alcoholPenaltyTotal).toBe(0)
  })

  it('includes interaction penalty for 1 drink with >6h sleep', async () => {
    const metrics = buildMetrics({ drinks: 1, hoursSlept: 7 })
    const hpCalc = await HpService.calculateHp(metrics)
    const details = HpService.buildHpBreakdownDetails(metrics, hpCalc)

    expect(details.alcohol.alcoholPenaltyBase).toBe(12)
    expect(details.alcohol.alcoholPenaltyInteraction).toBe(3)
    expect(details.alcohol.alcoholPenaltyTotal).toBe(15)
    expect(details.reconciliation.clampedTotal).toBe(hpCalc.hp)
  })

  it('uses progressive alcohol base penalty for 3 drinks with interaction', async () => {
    const metrics = buildMetrics({ drinks: 3, hoursSlept: 7 })
    const hpCalc = await HpService.calculateHp(metrics)
    const details = HpService.buildHpBreakdownDetails(metrics, hpCalc)

    expect(details.alcohol.alcoholPenaltyBase).toBe(43)
    expect(details.alcohol.alcoholPenaltyInteraction).toBe(9)
    expect(details.alcohol.alcoholPenaltyTotal).toBe(52)
  })
})

describe('Energy UI copy', () => {
  it('does not imply linear alcohol penalties', () => {
    const filePath = path.resolve(__dirname, '../app/energy/page.tsx')
    const contents = fs.readFileSync(filePath, 'utf8')
    expect(contents).not.toMatch(/per drink|each drink/i)
  })
})
