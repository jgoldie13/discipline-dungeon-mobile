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
  totalXP: number
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

        {/* Streaks & Progress */}
        <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-lg">Today's Progress</h3>
          {loading ? (
            <div className="text-purple-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Phone-free blocks</span>
                <span className="font-semibold">{stats?.phoneFreeBlocks || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Urges resisted</span>
                <span className="font-semibold">{stats?.urgesResisted || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-200">Tasks completed</span>
                <span className="font-semibold">{stats?.tasksCompleted || 0}</span>
              </div>
              <div className="border-t border-purple-500/30 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-purple-300 font-semibold">Total XP Today</span>
                  <span className="font-bold text-green-400 text-xl">{stats?.totalXP || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
