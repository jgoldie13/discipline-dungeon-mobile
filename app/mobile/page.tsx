'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'
import { ViolationBanner } from '@/components/ui/ViolationBanner'
import { BuildTeaserCard } from '@/components/BuildTeaserCard'
import { Card } from '@/components/ui/Card'
import { PillBadge } from '@/components/ui/PillBadge'
import { Drawer } from '@/components/ui/Drawer'
import { useToast } from '@/components/ui/Toast'
import { useMicroTasks } from '@/components/MicroTasksSheet'

type TruthRow = {
  date: string
  status: 'match' | 'mismatch' | 'missing_report' | 'missing_verification'
  deltaMinutes: number | null
  reportedMinutes: number | null
  verifiedMinutes: number | null
  source: string
}

type IosConnection = {
  enabled: boolean
  timezone: string
  lastSyncAt: string | null
}

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
  const [truthRows, setTruthRows] = useState<TruthRow[]>([])
  const [truthLastSyncAt, setTruthLastSyncAt] = useState<string | null>(null)
  const [iosConnection, setIosConnection] = useState<IosConnection | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)
  const toast = useToast()
  const { open: openMicroTasks } = useMicroTasks()

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
    if (hasSeenWelcome) {
      setShowWelcome(false)
    }

    fetchStats()
    fetchTruth()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStats()
        fetchTruth()
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
      toast({ title: 'Unable to load stats', description: 'Check your connection and try again.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTruth = async () => {
    try {
      const [truthRes, connRes] = await Promise.all([
        fetch('/api/verification/truth', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        }),
        fetch('/api/verification/ios/connection', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        }),
      ])

      const truthJson = await truthRes.json()
      const connJson = await connRes.json()

      if (truthRes.ok) {
        setTruthRows(truthJson?.rows || [])
        setTruthLastSyncAt(truthJson?.lastSyncAt || null)
      }

      if (connRes.ok) {
        setIosConnection(connJson)
      }
    } catch (error) {
      console.error('Error fetching truth:', error)
    }
  }

  const handleEnter = () => {
    localStorage.setItem('hasSeenWelcome', 'true')
    setShowWelcome(false)
  }

  const primaryStatus = (() => {
    if (!stats) return 'Loading'
    const overLimit = stats.phoneUsage.overage > 0
    if (overLimit) return 'Over limit'
    if (stats.hp.current < 50) return 'Low HP'
    return 'On track'
  })()

  const recommended = (() => {
    if (!stats) return { title: 'Start a 30-min Block', href: '/phone/block', copy: 'Protect time and earn XP.' }
    if (stats.phoneFreeBlocks < 1) return { title: 'Start a 30-min Block', href: '/phone/block', copy: 'Protect time and earn XP.' }
    if (stats.tasksCompleted < 1) return { title: 'Finish a task', href: '/tasks', copy: 'Knock out one exposure task.' }
    return { title: 'Log your phone use', href: '/phone/log', copy: 'Keep the streak clean today.' }
  })()

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-3">
            <PillBadge variant="muted">Discipline Dungeon</PillBadge>
            <h1 className="text-4xl font-bold tracking-tight">Build Your Cathedral</h1>
            <p className="text-base text-muted">
              Phone limits, focused blocks, and small wins that stack over time.
            </p>
          </div>

          <Card className="space-y-3">
            <div className="font-semibold text-lg text-text">Your tools</div>
            <ul className="space-y-2 text-muted text-sm">
              <li className="flex items-start gap-2">⚔️ Limits you chose</li>
              <li className="flex items-start gap-2">🎯 Replace scroll with action</li>
              <li className="flex items-start gap-2">🏗️ Build progress automatically</li>
            </ul>
            <Button onClick={handleEnter} variant="primary" className="w-full">
              Begin
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const phoneUsage = stats?.phoneUsage || { minutes: 0, limit: 30, overage: 0, percentage: 0 }
  const isOverLimit = phoneUsage.overage > 0

  const yesterdayKey = (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - 1)
    d.setUTCHours(0, 0, 0, 0)
    return d.toISOString().slice(0, 10)
  })()

  const yesterday = truthRows.find((r) => r.date === yesterdayKey) || null

  const isStale = (() => {
    if (!iosConnection?.enabled) return false
    if (!truthLastSyncAt) return true
    const last = new Date(truthLastSyncAt).getTime()
    if (Number.isNaN(last)) return true
    return Date.now() - last > 36 * 60 * 60 * 1000
  })()

  return (
    <div className="min-h-screen bg-bg text-text pb-8">
      <header className="bg-surface-1 border-b border-border p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Discipline Dungeon</p>
          <h1 className="text-xl font-bold">Build the Cathedral</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings">
            <Button variant="secondary" size="sm">Settings</Button>
          </Link>
          <PillBadge variant={primaryStatus === 'On track' ? 'positive' : primaryStatus === 'Over limit' ? 'negative' : 'warning'}>
            {primaryStatus}
          </PillBadge>
        </div>
      </header>

      <div className="p-4 space-y-5">
        <Card className="p-4 flex items-start gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted">Recommended next</div>
            <div className="text-lg font-semibold mt-1">{recommended.title}</div>
            <div className="text-sm text-muted mt-1">{recommended.copy}</div>
            <div className="flex gap-2 mt-3">
              <Link href={recommended.href}>
                <Button variant="primary" size="sm">Do it now</Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openMicroTasks('mobile_button')}
              >
                I want to scroll
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="col-span-2 p-4 border-green-500/30 bg-green-900/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-900/40 border border-green-500/30 flex items-center justify-center text-xl">
                  🌅
                </div>
                <div>
                  <div className="text-xs text-green-400 font-medium">Earth Scroll</div>
                  <div className="font-semibold text-green-100">Morning Protocol</div>
                </div>
              </div>
              <Link href="/protocol">
                <Button variant="secondary" size="sm" className="border-green-500/30 text-green-100 bg-green-900/20 hover:bg-green-900/40">
                  Start
                </Button>
              </Link>
            </div>
          </Card>

          {stats?.hp && stats.hp.current < 100 && (
            <Card className="col-span-2 p-4 border-blue-500/30 bg-blue-900/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-xl">
                    💤
                  </div>
                  <div>
                    <div className="text-xs text-blue-400 font-medium">HP Recovery</div>
                    <div className="font-semibold text-blue-100">NSDR Healing ({stats.hp.current}/100 HP)</div>
                  </div>
                </div>
                <Link href="/nsdr">
                  <Button variant="secondary" size="sm" className="border-blue-500/30 text-blue-100 bg-blue-900/20 hover:bg-blue-900/40">
                    Heal
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          <DashboardCard
            title="XP Today"
            value={`${stats?.xp.today || 0}`}
            sub={`${stats?.xp.total?.toLocaleString() || 0} total`}
            onClick={() => setActiveCard('xp')}
          >
            <ProgressBar variant="xp" value={stats?.xp.today || 0} max={stats?.xp.nextMilestone?.xp || 100} />
          </DashboardCard>

          <DashboardCard
            title="Streak"
            value={`${stats?.streak.current || 0} days`}
            sub={`Longest ${stats?.streak.longest || 0}`}
            onClick={() => setActiveCard('streak')}
          />

          <DashboardCard
            title="HP"
            value={`${stats?.hp.current || 0}`}
            sub={stats?.hp.message || 'Ready'}
            onClick={() => setActiveCard('hp')}
          >
            {stats?.hp && <ProgressBar variant="hp" value={stats.hp.current} max={100} />}
          </DashboardCard>

          <DashboardCard
            title="Phone-free blocks"
            value={`${stats?.phoneFreeBlocks || 0}`}
            sub={`${stats?.phoneFreeMinutes || 0} min`}
            onClick={() => setActiveCard('blocks')}
          />
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Phone usage today</div>
              <div className="text-xl font-semibold">
                {phoneUsage.minutes}m / {phoneUsage.limit}m
              </div>
            </div>
            <Link href="/phone/log">
              <Button variant="secondary" size="sm">Log</Button>
            </Link>
          </div>
          <ProgressBar
            variant={isOverLimit ? 'boss' : 'xp'}
            value={Math.min(phoneUsage.percentage, 150)}
            max={100}
            className="mt-3"
          />
          {isOverLimit && (
            <ViolationBanner
              title="Over your limit"
              details="Honor the consequence you set. Tomorrow is a fresh start."
            />
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Truth (iPhone Screen Time)</div>
              <div className="text-xs text-muted">
                Last sync: {truthLastSyncAt ? new Date(truthLastSyncAt).toLocaleString() : 'Never'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PillBadge variant="muted">iPhone</PillBadge>
              <PillBadge
                variant={
                  yesterday?.status === 'mismatch'
                    ? 'negative'
                    : yesterday?.status === 'match'
                      ? 'positive'
                      : 'muted'
                }
              >
                {yesterday?.status ? yesterday.status.replace('_', ' ') : '—'}
              </PillBadge>
            </div>
          </div>

          <div className="mt-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-muted">Yesterday</div>
              <div className="font-medium">{yesterdayKey}</div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-muted">Reported</div>
              <div className="font-medium">{yesterday?.reportedMinutes ?? '—'}m</div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-muted">Verified</div>
              <div className="font-medium">{yesterday?.verifiedMinutes ?? '—'}m</div>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="text-muted">Δ (reported - verified)</div>
              <div className="font-medium">{yesterday?.deltaMinutes ?? '—'}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {!iosConnection?.enabled ? (
              <Link href="/settings/iphone-verification" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  Enable iPhone verification
                </Button>
              </Link>
            ) : isStale ? (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => toast({ title: 'Sync needed', description: 'Open the iPhone companion app to upload Screen Time.' })}>
                Open iPhone app to sync
              </Button>
            ) : (
              <Link href="/settings/iphone-verification" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  View details
                </Button>
              </Link>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted">Boss Battles</div>
              <div className="text-lg font-semibold">Face your boss task</div>
              <p className="text-sm text-muted mt-1">Attack with a phone-free block. Each minute = 1 damage.</p>
            </div>
            <PillBadge variant="negative">Boss</PillBadge>
          </div>
          <div className="flex gap-2 mt-3">
            <Link href="/boss/create" className="flex-1">
              <Button variant="primary" size="sm" className="w-full">Attack / Create</Button>
            </Link>
            <Link href="/tasks" className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">Tasks</Button>
            </Link>
          </div>
        </Card>

        <BuildTeaserCard />

        {!loading && stats?.hp && !stats.hp.hasLoggedSleepToday && (
          <Card className="p-4 border-warning/60">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Log sleep to set HP</div>
                <p className="text-sm text-muted">Low HP reduces XP gains.</p>
              </div>
              <Link href="/sleep/log">
                <Button variant="primary" size="sm">Log sleep</Button>
              </Link>
            </div>
          </Card>
        )}
      </div>

      <Drawer open={!!activeCard} onClose={() => setActiveCard(null)} title="Details">
        <div className="space-y-3">
          {activeCard === 'xp' && (
            <>
              <div className="font-semibold">XP breakdown</div>
              <div className="text-sm text-muted">Blocks: {stats?.xpBreakdown.blocks || 0}</div>
              <div className="text-sm text-muted">Tasks: {stats?.xpBreakdown.tasks || 0}</div>
              <div className="text-sm text-muted">Urges: {stats?.xpBreakdown.urges || 0}</div>
            </>
          )}
          {activeCard === 'streak' && (
            <>
              <div className="font-semibold">Streak</div>
              <div className="text-sm text-muted">Current: {stats?.streak.current || 0} days</div>
              <div className="text-sm text-muted">Longest: {stats?.streak.longest || 0} days</div>
            </>
          )}
          {activeCard === 'hp' && (
            <>
              <div className="font-semibold">HP status</div>
              <div className="text-sm text-muted">{stats?.hp.message || 'Stay consistent'}</div>
            </>
          )}
          {activeCard === 'blocks' && (
            <>
              <div className="font-semibold">Phone-free blocks</div>
              <div className="text-sm text-muted">
                {stats?.phoneFreeBlocks || 0} blocks, {stats?.phoneFreeMinutes || 0} minutes
              </div>
              <Link href="/phone/block">
                <Button variant="primary" size="sm" className="mt-2">Start a block</Button>
              </Link>
            </>
          )}
        </div>
      </Drawer>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  sub,
  children,
  onClick,
}: {
  title: string
  value: string
  sub?: string
  children?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Card className="p-4 cursor-pointer hover:bg-surface-2/60 transition-colors" onClick={onClick}>
      <div className="text-xs text-muted">{title}</div>
      <div className="text-2xl font-bold text-text mt-1">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
      {children && <div className="mt-2">{children}</div>}
    </Card>
  )
}
