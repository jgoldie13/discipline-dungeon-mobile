'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LogPhoneUsagePage() {
  const router = useRouter()
  const [minutes, setMinutes] = useState('')
  const [limit] = useState(30) // Default daily limit
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const minutesNum = parseInt(minutes)
      const overage = Math.max(0, minutesNum - limit)

      const response = await fetch('/api/phone/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: minutesNum, limit }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      // Show result
      if (overage > 0) {
        alert(`⚠️ Logged. You went over by ${overage} minutes.\n\nStreak reset. ${-overage * 2} XP penalty.\n\nYou chose this limit. Tomorrow is a fresh start.`)
      } else {
        alert(`✅ Well done. Under limit by ${limit - minutesNum} minutes.\n\nStreak maintained. You're keeping your word to yourself.`)
      }

      router.push('/mobile')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving usage. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const overage = minutes ? Math.max(0, parseInt(minutes) - limit) : 0
  const isOver = overage > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950 to-black text-white">
      {/* Header */}
      <header className="bg-purple-900/30 border-b border-purple-500/20 p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">Log Phone Usage</h1>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">How much time today?</h2>
            <p className="text-purple-200">Be honest. Check your Screen Time settings.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-purple-300">Social Media Minutes (Instagram, TikTok, etc.)</label>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full bg-purple-950 border border-purple-500/50 rounded-lg p-4 text-3xl font-bold text-center focus:outline-none focus:border-purple-400"
              autoFocus
            />
          </div>

          <div className="bg-purple-950/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-purple-300">Daily Limit:</span>
              <span className="font-semibold">{limit} min</span>
            </div>
            {minutes && (
              <>
                <div className="flex justify-between">
                  <span className="text-purple-300">Your Usage:</span>
                  <span className="font-semibold">{minutes} min</span>
                </div>
                <div className={`flex justify-between ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                  <span>{isOver ? 'Over by:' : 'Under by:'}</span>
                  <span className="font-bold">
                    {isOver ? `+${overage}` : `-${limit - parseInt(minutes)}`} min
                  </span>
                </div>
              </>
            )}
          </div>

          {isOver && (
            <div className="space-y-3">
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
                <div className="font-semibold text-red-300 mb-2">⚠️ Violation Logged:</div>
                <ul className="text-sm space-y-1 text-red-200">
                  <li>• XP penalty applied (-{overage * 2} XP)</li>
                  <li>• Streak reset to 0</li>
                  <li>• Violation tracked</li>
                </ul>
              </div>

              <div className="bg-indigo-900/30 border border-indigo-500/40 rounded-lg p-4">
                <div className="font-semibold text-indigo-200 mb-3">🔄 What Now?</div>
                <p className="text-sm text-indigo-100 mb-3">
                  You chose your limits. This setback is information, not failure. Here's how to rebuild:
                </p>
                <div className="space-y-2 text-sm">
                  <Link
                    href="/tasks"
                    className="block bg-indigo-800/40 hover:bg-indigo-800/60 rounded p-3 transition-colors"
                  >
                    <div className="font-medium text-indigo-100">→ Create one exposure task</div>
                    <div className="text-xs text-indigo-300">Rebuild momentum with action (100 XP)</div>
                  </Link>
                  <Link
                    href="/phone/block"
                    className="block bg-indigo-800/40 hover:bg-indigo-800/60 rounded p-3 transition-colors"
                  >
                    <div className="font-medium text-indigo-100">→ Start a 30-min phone-free block</div>
                    <div className="text-xs text-indigo-300">Prove you can resist right now (30 XP)</div>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <button
            type="submit"
            disabled={!minutes || saving}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-900 disabled:text-purple-500 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            {saving ? 'Saving...' : 'Save Usage Log'}
          </button>

          <Link
            href="/mobile"
            className="block w-full text-center text-purple-300 hover:text-purple-100 py-2"
          >
            Cancel
          </Link>
        </form>

        {/* Tips */}
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2 text-purple-300">💡 Tips:</div>
          <ul className="space-y-1 text-purple-200">
            <li>• Check iPhone: Settings → Screen Time → See All Activity</li>
            <li>• Add up time for social apps (Instagram, TikTok, Twitter, etc.)</li>
            <li>• Be honest - lying only hurts you</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
