'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Surface } from '@/components/ui/Surface'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'

interface BossTask {
  id: string
  title: string
  description?: string
  bossHp: number
  bossHpRemaining: number
  bossDifficulty: string
  optimalWindow?: string
  completed: boolean
  completedAt?: string
}

interface BossStats {
  totalDamageDealt: number
  totalBlocksUsed: number
  averageDamagePerBlock: number
  hpPercentRemaining: number
}

interface Attack {
  id: string
  damageDealt: number
  timeOfDay: string
  multiplier: number
  createdAt: string
  block: {
    durationMin: number
    startTime: string
  }
}

export default function BossDetailPage() {
  const params = useParams()
  const router = useRouter()
  const bossId = params.id as string

  const [boss, setBoss] = useState<BossTask | null>(null)
  const [stats, setStats] = useState<BossStats | null>(null)
  const [attacks, setAttacks] = useState<Attack[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBossDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/boss/${bossId}`)
      const data = await response.json()
      setBoss(data.task)
      setStats(data.stats)
      setAttacks(data.attacks)
    } catch (error) {
      console.error('Error fetching boss details:', error)
    } finally {
      setLoading(false)
    }
  }, [bossId])

  useEffect(() => {
    fetchBossDetails()
  }, [fetchBossDetails])

  const handleStartAttack = () => {
    router.push(`/phone/block?bossId=${bossId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex items-center justify-center">
        <p className="text-dd-muted">Loading...</p>
      </div>
    )
  }

  if (!boss) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex items-center justify-center">
        <div className="text-center">
          <p className="text-dd-muted mb-4">Boss not found</p>
          <Link href="/tasks">
            <Button variant="secondary" size="md">
              Back to Tasks
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const hpPercent = (boss.bossHpRemaining / boss.bossHp) * 100

  return (
    <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center gap-4">
        <Link href="/tasks" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
          Boss Contract
        </h1>
      </header>

      <div className="p-6 space-y-6">
        {/* Boss Contract (State) */}
        <Surface elevation="2">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-serif uppercase tracking-widest text-mana">
                {boss.title}
              </h2>
              {boss.description && (
                <p className="text-dd-muted text-sm mt-2">
                  {boss.description}
                </p>
              )}
            </div>

            <ProgressBar
              variant="boss"
              value={boss.bossHpRemaining}
              max={boss.bossHp}
              label="Boss HP"
              meta={`${boss.bossHpRemaining} / ${boss.bossHp}`}
            />

            <div className="text-center text-xs text-dd-muted tabular-nums">
              {Math.round(hpPercent)}% remaining
            </div>

            {boss.completed ? (
              <div className="scroll-card border border-gold/30 p-4 text-center">
                <div className="font-bold text-gold">CONTRACT COMPLETED</div>
                <div className="text-xs text-dd-muted mt-1 tabular-nums">
                  {boss.completedAt && new Date(boss.completedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                className="w-full"
                onClick={handleStartAttack}
              >
                Attack Boss (Start Phone-Free Block)
              </Button>
            )}
          </div>
        </Surface>

        {/* Battle Stats */}
        {stats && (
          <Surface elevation="1" title="Battle Stats">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-dd-muted">Total Damage</div>
                <div className="text-dd-text font-semibold text-lg tabular-nums">
                  {stats.totalDamageDealt}
                </div>
              </div>
              <div>
                <div className="text-dd-muted">Attacks Used</div>
                <div className="text-dd-text font-semibold text-lg tabular-nums">
                  {stats.totalBlocksUsed}
                </div>
              </div>
              <div>
                <div className="text-dd-muted">Avg Damage/Attack</div>
                <div className="text-dd-text font-semibold text-lg tabular-nums">
                  {stats.averageDamagePerBlock}
                </div>
              </div>
              <div>
                <div className="text-dd-muted">HP Remaining</div>
                <div className="text-dd-text font-semibold text-lg tabular-nums">
                  {stats.hpPercentRemaining}%
                </div>
              </div>
            </div>
          </Surface>
        )}

        {/* Damage Sources (Ledger) */}
        {attacks.length > 0 && (
          <Surface elevation="1" title="Damage Sources">
            <div className="space-y-2">
              {attacks.map((attack) => {
                const multiplierText =
                  attack.multiplier !== 1.0 ? ` (${attack.multiplier}x)` : ''

                return (
                  <div
                    key={attack.id}
                    className="scroll-card p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-dd-text tabular-nums">
                          {attack.damageDealt} damage dealt
                        </div>
                        <div className="text-xs text-dd-muted mt-1">
                          {attack.block.durationMin} min block
                          {multiplierText} • {attack.timeOfDay}
                        </div>
                      </div>
                      <div className="text-xs text-dd-muted tabular-nums">
                        {new Date(attack.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Surface>
        )}

        {/* Contract Terms */}
        <Surface elevation="1" title="Contract Terms">
          <ul className="space-y-1 text-sm text-dd-muted">
            <li>• Each minute of phone-free work = 1 damage</li>
            {boss.optimalWindow === 'morning' && (
              <li>• Morning attacks (06:00-12:00): 1.2x damage bonus</li>
            )}
            <li>• Your HP affects XP gain, not boss damage</li>
            <li>• Longer blocks = more damage per attack</li>
            {!boss.completed && (
              <li className="text-dd-text font-medium tabular-nums">
                • {Math.ceil(boss.bossHpRemaining / 60)} more hours of focused work needed
              </li>
            )}
          </ul>
        </Surface>

        <Link href="/tasks">
          <Button variant="secondary" size="md" className="w-full">
            Back to Tasks
          </Button>
        </Link>
      </div>
    </div>
  )
}
