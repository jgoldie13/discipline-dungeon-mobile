'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

export default function MobilePage() {
  const [showWelcome, setShowWelcome] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user has seen welcome before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome')
    if (hasSeenWelcome) {
      setShowWelcome(false)
    }

    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/user/stats')
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
            <h2 className="text-2xl font-semibold">Your Phone is the Problem</h2>
            <p className="text-purple-100">
              This app helps you:
            </p>
            <ul className="space-y-2 text-purple-100">
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">•</span>
                <span>Track and limit social media time</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">•</span>
                <span>Log urges and replace scrolling with micro-tasks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">•</span>
                <span>Earn XP for phone-free blocks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-400 flex-shrink-0">•</span>
                <span>Face real consequences for violations</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleEnter}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Enter the Dungeon
          </button>
        </div>
      </div>
    )
  }

  const phoneUsage = stats?.phoneUsage || { minutes: 0, limit: 30, overage: 0, percentage: 0 }
  const isOverLimit = phoneUsage.overage > 0
  const barColor = isOverLimit ? 'bg-red-500' : phoneUsage.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white">
      {/* Header */}
      <header className="bg-purple-900/30 border-b border-purple-500/20 p-4">
        <h1 className="text-2xl font-bold text-center">Discipline Dungeon</h1>
      </header>

      {/* Quick Stats */}
      <div className="p-4 space-y-4">
        {/* XP & Level Display */}
        {!loading && stats?.xp && (
          <div className="bg-gradient-to-br from-amber-900/60 to-purple-900/60 border-2 border-amber-500/40 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-amber-200">Current Level</div>
                <div className="text-4xl font-bold text-amber-300">Level {stats.xp.level}</div>
              </div>
              <div className="text-6xl">⚔️</div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-amber-200">Total XP</span>
                <span className="font-semibold text-amber-100">{stats.xp.total.toLocaleString()} XP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-200">Hours Reclaimed</span>
                <span className="font-semibold text-amber-100">{stats.xp.hoursReclaimed}h</span>
              </div>
              <div className="text-xs text-amber-300/80 italic mt-2">
                💡 1 XP = 1 minute of disciplined behavior
              </div>
              {stats.xp.nextMilestone && (
                <div className="mt-3 pt-3 border-t border-amber-500/30">
                  <div className="text-xs text-amber-200">Next Milestone: {stats.xp.nextMilestone.label}</div>
                  <div className="text-sm font-semibold text-amber-100">
                    {stats.xp.nextMilestone.remaining.toLocaleString()} XP to go
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Streak Display */}
        {!loading && stats?.streak && (
          <div className="bg-gradient-to-br from-orange-900/60 to-red-900/60 border-2 border-orange-500/40 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm text-orange-200">Current Streak</div>
                <div className="text-5xl font-bold text-orange-300">{stats.streak.current} 🔥</div>
                <div className="text-xs text-orange-200 mt-1">days under limit</div>
              </div>
            </div>
            <div className="flex justify-between text-sm border-t border-orange-500/30 pt-3">
              <span className="text-orange-200">Longest Streak</span>
              <span className="font-semibold text-orange-100">{stats.streak.longest} days 🏆</span>
            </div>
          </div>
        )}

        {/* Today's XP Breakdown */}
        {!loading && stats?.xp && (
          <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Today's XP: +{stats.xp.today}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Phone-free blocks</span>
                <span className="font-semibold text-green-400">+{stats.xpBreakdown.blocks} XP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Urges resisted</span>
                <span className="font-semibold text-green-400">+{stats.xpBreakdown.urges} XP</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Tasks completed</span>
                <span className="font-semibold text-green-400">+{stats.xpBreakdown.tasks} XP</span>
              </div>
              {stats.xpBreakdown.penalties < 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-purple-200">Violations</span>
                  <span className="font-semibold text-red-400">{stats.xpBreakdown.penalties} XP</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4">
          <div className="text-sm text-purple-300 mb-1">Today's Social Media</div>
          {loading ? (
            <div className="text-xl font-bold text-purple-400">Loading...</div>
          ) : (
            <>
              <div className={`text-3xl font-bold ${isOverLimit ? 'text-red-400' : ''}`}>
                {phoneUsage.minutes} / {phoneUsage.limit} min
                {isOverLimit && <span className="text-lg ml-2 text-red-300">(+{phoneUsage.overage} over)</span>}
              </div>
              <div className="mt-2 w-full bg-purple-950 rounded-full h-2">
                <div
                  className={`${barColor} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(phoneUsage.percentage, 100)}%` }}
                ></div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Quick Actions</h2>

          <Link
            href="/phone/log"
            className="block bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg p-4 transition-all transform active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">Log Phone Usage</div>
                <div className="text-sm text-red-100">How many minutes today?</div>
              </div>
              <div className="text-3xl">📱</div>
            </div>
          </Link>

          <Link
            href="/phone/urge"
            className="block bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 rounded-lg p-4 transition-all transform active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">I Want to Scroll</div>
                <div className="text-sm text-yellow-100">Get a micro-task instead</div>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </Link>

          <Link
            href="/phone/block"
            className="block bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg p-4 transition-all transform active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">Start Phone-Free Block</div>
                <div className="text-sm text-green-100">Earn 60 XP per hour</div>
              </div>
              <div className="text-3xl">🔒</div>
            </div>
          </Link>

          <Link
            href="/tasks"
            className="block bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg p-4 transition-all transform active:scale-95"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">View All Tasks</div>
                <div className="text-sm text-purple-100">Job search, exposure, habits</div>
              </div>
              <div className="text-3xl">📋</div>
            </div>
          </Link>

          <Link
            href="/stakes/current"
            className="block bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 rounded-lg p-4 transition-all transform active:scale-95 border-2 border-amber-400/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">Weekly Stake</div>
                <div className="text-sm text-amber-100">Put money on the line</div>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </Link>
        </div>

      </div>
    </div>
  )
}
