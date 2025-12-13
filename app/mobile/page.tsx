'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Surface } from '@/components/ui/Surface'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { ViolationBanner } from '@/components/ui/ViolationBanner'

interface Stats {
  phoneUsage: {
    minutes: number
    limit: number
    overage: number
    percentage: number
  }
  urgesResisted: number
  phoneFreeBlocks: number
  phoneFreeMinutes: number
  tasksCompleted: number
  xp: {
    today: number
    total: number
    level: number
    hoursReclaimed: number
    nextMilestone: {
      xp: number
      label: string
      remaining: number
    } | null
  }
  xpBreakdown: {
    blocks: number
    urges: number
    tasks: number
    penalties: number
  }
  streak: {
    current: number
    longest: number
    lastDate: Date | null
  }
  identity: {
    title: string
    description: string
    emoji: string
    tier: number
    affirmation: string
  }
  hp: {
    current: number
    max: number
    color: string
    message: string
    hasLoggedSleepToday: boolean
    lastUpdate: Date | null
  }
}

export default function MobilePage() {
  const [showWelcome, setShowWelcome] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
    if (hasSeenWelcome) {
      setShowWelcome(false)
    }

    fetchStats()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/user/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnter = () => {
    localStorage.setItem('hasSeenWelcome', 'true')
    setShowWelcome(false)
  }

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight">Discipline Dungeon</h1>
            <p className="text-xl text-purple-200">
              Build your cathedral through disciplined action
            </p>
          </div>

          <div className="bg-purple-900/50 border border-purple-500/30 rounded-lg p-6 space-y-4 text-left">
            <h2 className="text-2xl font-semibold">Choose Your Weapon</h2>
            <p className="text-purple-100">
              You are the type of person who masters themselves. This system is your tool:
            </p>
            <ul className="space-y-2 text-purple-100">
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">⚔️</span>
                <span>Set limits you choose to honor</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">🎯</span>
                <span>Replace distraction with disciplined action</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">📈</span>
                <span>Build competence through visible progress</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">🔥</span>
                <span>Honor your commitments or face consequences you set</span>
              </li>
            </ul>
            <p className="text-sm text-purple-300 italic mt-4 border-t border-purple-500/30 pt-4">
              Every action is a vote for the person you are becoming.
            </p>
          </div>

          <button
            onClick={handleEnter}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Begin Your Path
          </button>
        </div>
      </div>
    )
  }

  const phoneUsage = stats?.phoneUsage || { minutes: 0, limit: 30, overage: 0, percentage: 0 }
  const isOverLimit = phoneUsage.overage > 0

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="bg-surface-1 border-b border-border p-4">
        <h1 className="text-2xl font-bold text-center">Discipline Dungeon</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* ============================================
            SECTION 1: IMMUTABLE STATE
            ============================================ */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-text">State</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* XP */}
            <Surface elevation="1" className="p-4">
              <div className="text-xs text-muted mb-1">XP Today</div>
              <div className="text-3xl font-bold tabular-nums text-text">
                {stats?.xp.today || 0}
              </div>
              <div className="text-xs text-muted mt-1">
                {stats?.xp.total.toLocaleString() || 0} total
              </div>
            </Surface>

            {/* Level */}
            <Surface elevation="1" className="p-4">
              <div className="text-xs text-muted mb-1">Level</div>
              <div className="text-3xl font-bold tabular-nums text-text">
                {stats?.xp.level || 1}
              </div>
              <div className="text-xs text-muted mt-1">
                {stats?.identity.title || 'Novice'}
              </div>
            </Surface>

            {/* HP */}
            <Surface elevation="1" className="p-4">
              <div className="text-xs text-muted mb-1">HP</div>
              <div className="text-3xl font-bold tabular-nums text-text">
                {stats?.hp.current || 100}
              </div>
              {stats?.hp && (
                <ProgressBar
                  variant="hp"
                  value={stats.hp.current}
                  max={100}
                  className="mt-2"
                />
              )}
            </Surface>

            {/* Streak */}
            <Surface elevation="1" className="p-4">
              <div className="text-xs text-muted mb-1">Streak</div>
              <div className="text-3xl font-bold tabular-nums text-text">
                {stats?.streak.current || 0}
              </div>
              <div className="text-xs text-muted mt-1">days under limit</div>
            </Surface>
          </div>
        </section>

        {/* ============================================
            SECTION 2: TODAY&apos;S OBLIGATIONS
            ============================================ */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-text">Obligations</h2>
          <div className="space-y-3">
            {/* HP Check */}
            {!loading && stats?.hp && !stats.hp.hasLoggedSleepToday && (
              <Surface elevation="2" className="border-warning">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-text mb-1">Log Sleep to Set HP</div>
                    <div className="text-sm text-muted mb-2">
                      Required daily. Low HP reduces XP gains.
                    </div>
                  </div>
                </div>
                <Link href="/sleep/log" className="block mt-3">
                  <Button variant="primary" size="sm" className="w-full">
                    Log Sleep Now
                  </Button>
                </Link>
              </Surface>
            )}

            {/* Primary Action: Phone-Free Block */}
            <Surface elevation="2" className="border-2">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-lg text-text mb-1">
                    Start Phone-Free Block
                  </div>
                  <div className="text-sm text-muted mb-1">
                    Earn 60 XP per hour of focused work
                  </div>
                  <div className="text-xs text-negative font-medium">
                    Consequence: Wasted time, reduced XP potential
                  </div>
                </div>
              </div>
              <Link href="/phone/block">
                <Button variant="primary" size="lg" className="w-full">
                  Start Block
                </Button>
              </Link>
            </Surface>

            {/* Stakes Warning */}
            <Surface elevation="1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-text mb-1">Weekly Stake</div>
                  <div className="text-sm text-muted">
                    Put money on the line for accountability
                  </div>
                </div>
              </div>
              <Link href="/stakes/current" className="block mt-3">
                <Button variant="secondary" size="sm" className="w-full">
                  View Stake
                </Button>
              </Link>
            </Surface>
          </div>
        </section>

        {/* ============================================
            SECTION 3: LEDGER & CONSEQUENCE
            ============================================ */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-text">
            Today&apos;s Ledger
          </h2>

          {/* Violations */}
          {!loading && stats?.phoneUsage && isOverLimit && (
            <div className="mb-4">
              <ViolationBanner
                severity="negative"
                title="Daily Limit Exceeded"
                details={`You are ${phoneUsage.overage} minutes over your ${phoneUsage.limit} minute limit. Streak broken.`}
                timestamp={new Date()}
              />
            </div>
          )}

          {/* HP Warning */}
          {!loading && stats?.hp && stats.hp.current < 85 && (
            <div className="mb-4">
              <ViolationBanner
                severity="warning"
                title="Low HP Detected"
                details={stats.hp.message}
              />
            </div>
          )}

          {/* XP Breakdown */}
          {!loading && stats?.xp && (
            <Surface elevation="1">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Phone-free blocks</span>
                  <span className="font-semibold text-positive tabular-nums">
                    +{stats.xpBreakdown.blocks} XP
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Urges resisted</span>
                  <span className="font-semibold text-positive tabular-nums">
                    +{stats.xpBreakdown.urges} XP
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Tasks completed</span>
                  <span className="font-semibold text-positive tabular-nums">
                    +{stats.xpBreakdown.tasks} XP
                  </span>
                </div>
                {stats.xpBreakdown.penalties < 0 && (
                  <div className="flex justify-between items-center border-t border-border pt-2">
                    <span className="text-muted font-semibold">Violations</span>
                    <span className="font-bold text-negative tabular-nums text-base">
                      {stats.xpBreakdown.penalties} XP
                    </span>
                  </div>
                )}
              </div>
            </Surface>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xl font-semibold mb-3 text-text">Actions</h2>
          <div className="space-y-2">
            <Link href="/phone/log">
              <Button variant="secondary" size="md" className="w-full">
                Log Phone Usage
              </Button>
            </Link>
            <Link href="/phone/urge">
              <Button variant="secondary" size="md" className="w-full">
                I Want to Scroll
              </Button>
            </Link>
            <Link href="/tasks">
              <Button variant="secondary" size="md" className="w-full">
                View All Tasks
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
