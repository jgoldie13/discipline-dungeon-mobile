'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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

  useEffect(() => {
    fetchBossDetails()
  }, [bossId])

  const fetchBossDetails = async () => {
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
  }

  const handleStartAttack = () => {
    router.push(`/block/start?bossId=${bossId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-red-950 to-black text-white flex items-center justify-center">
        <p className="text-red-300">Loading boss...</p>
      </div>
    )
  }

  if (!boss) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-red-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-300 mb-4">Boss not found</p>
          <Link
            href="/tasks"
            className="text-red-400 underline hover:text-red-300"
          >
            Back to Tasks
          </Link>
        </div>
      </div>
    )
  }

  const hpPercent = (boss.bossHpRemaining / boss.bossHp) * 100
  const difficultyEmoji = {
    easy: '😊',
    medium: '🤔',
    hard: '😰',
    brutal: '💀',
  }[boss.bossDifficulty as 'easy' | 'medium' | 'hard' | 'brutal']

  const windowEmoji = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌙',
  }[boss.optimalWindow as 'morning' | 'afternoon' | 'evening'] || '⏰'

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-red-950 to-black text-white">
      {/* Header */}
      <header className="bg-red-900/30 border-b border-red-500/20 p-4 flex items-center gap-4">
        <Link href="/tasks" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-bold">⚔️ Boss Battle</h1>
      </header>

      <div className="p-6 space-y-6">
        {/* Boss Card */}
        <div className="bg-red-900/40 border border-red-500/30 rounded-lg p-6 space-y-4">
          {/* Title */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">{difficultyEmoji}</span>
                <h2 className="text-2xl font-bold text-red-100">
                  {boss.title}
                </h2>
              </div>
              {boss.description && (
                <p className="text-red-300 text-sm mt-2">{boss.description}</p>
              )}
            </div>
            {boss.optimalWindow && (
              <div className="text-2xl ml-2">{windowEmoji}</div>
            )}
          </div>

          {/* HP Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-red-200">Boss HP</span>
              <span className="text-red-100 font-medium">
                {boss.bossHpRemaining} / {boss.bossHp}
              </span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-6 overflow-hidden border border-red-500/30">
              <div
                className={`h-full transition-all duration-500 ${
                  hpPercent > 50
                    ? 'bg-red-500'
                    : hpPercent > 25
                    ? 'bg-orange-500'
                    : 'bg-yellow-500'
                }`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <div className="text-center text-xs text-red-400 mt-1">
              {Math.round(hpPercent)}% remaining
            </div>
          </div>

          {/* Status */}
          {boss.completed ? (
            <div className="bg-green-900/40 border border-green-500/40 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🎉</div>
              <div className="font-bold text-green-200">BOSS DEFEATED!</div>
              <div className="text-xs text-green-300 mt-1">
                Completed {new Date(boss.completedAt!).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartAttack}
              className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span>⚔️</span>
              <span>Attack Boss (Start Phone-Free Block)</span>
            </button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
            <div className="text-sm font-semibold text-red-300 mb-3">
              📊 Battle Stats
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-red-400">Total Damage</div>
                <div className="text-red-100 font-medium text-lg">
                  {stats.totalDamageDealt}
                </div>
              </div>
              <div>
                <div className="text-red-400">Attacks Used</div>
                <div className="text-red-100 font-medium text-lg">
                  {stats.totalBlocksUsed}
                </div>
              </div>
              <div>
                <div className="text-red-400">Avg Damage/Attack</div>
                <div className="text-red-100 font-medium text-lg">
                  {stats.averageDamagePerBlock}
                </div>
              </div>
              <div>
                <div className="text-red-400">HP Remaining</div>
                <div className="text-red-100 font-medium text-lg">
                  {stats.hpPercentRemaining}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attack History */}
        {attacks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-red-100">
              🗡️ Attack History
            </h3>
            <div className="space-y-2">
              {attacks.map((attack) => {
                const timeOfDayEmoji = {
                  morning: '🌅',
                  afternoon: '☀️',
                  evening: '🌙',
                }[attack.timeOfDay as 'morning' | 'afternoon' | 'evening']

                const multiplierText =
                  attack.multiplier !== 1.0 ? ` (${attack.multiplier}x)` : ''

                return (
                  <div
                    key={attack.id}
                    className="bg-red-950/40 border border-red-500/20 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{timeOfDayEmoji}</span>
                        <div>
                          <div className="font-medium text-red-100">
                            {attack.damageDealt} damage dealt
                          </div>
                          <div className="text-xs text-red-400 mt-1">
                            {attack.block.durationMin} min block
                            {multiplierText} • {attack.timeOfDay}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-red-500">
                        {new Date(attack.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2 text-red-300">💡 Strategy:</div>
          <ul className="space-y-1 text-red-200">
            <li>• Each minute of phone-free work = 1 damage</li>
            {boss.optimalWindow === 'morning' && (
              <li>• Attack in morning (06:00-12:00) for 1.2x damage bonus</li>
            )}
            <li>• Your HP affects XP gain, not boss damage</li>
            <li>• Longer blocks = more damage per attack</li>
            {!boss.completed && (
              <li>
                • {Math.ceil(boss.bossHpRemaining / 60)} more hours of focused
                work needed
              </li>
            )}
          </ul>
        </div>

        <Link
          href="/tasks"
          className="block w-full text-center bg-red-900/50 hover:bg-red-900/70 py-4 rounded-lg font-semibold transition-colors"
        >
          Back to Tasks
        </Link>
      </div>
    </div>
  )
}
