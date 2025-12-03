'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProtocolState {
  wokeOnTime: boolean
  gotMorningLight: boolean
  drankWater: boolean
  delayedCaffeine: boolean
  completed: boolean
  xpEarned: number
  hpBonus: number
}

export default function MorningProtocolPage() {
  const router = useRouter()
  const [protocol, setProtocol] = useState<ProtocolState | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchProtocol()
  }, [])

  const fetchProtocol = async () => {
    try {
      const response = await fetch('/api/protocol')
      const data = await response.json()
      setProtocol(data.protocol)
    } catch (error) {
      console.error('Error fetching protocol:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = async (item: keyof ProtocolState) => {
    if (!protocol || protocol.completed) return

    setUpdating(true)
    try {
      const response = await fetch('/api/protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item,
          value: !protocol[item],
        }),
      })

      const data = await response.json()

      if (data.completed) {
        // Protocol just completed!
        alert(`🎉 Morning Protocol Complete!\n\n+${data.xpEarned} XP\n+${data.hpBonus} HP\n\nGreat start to the day!`)
      }

      setProtocol(data.protocol)
    } catch (error) {
      console.error('Error updating protocol:', error)
      alert('Error updating protocol. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const itemsChecked = protocol
    ? [
        protocol.wokeOnTime,
        protocol.gotMorningLight,
        protocol.drankWater,
        protocol.delayedCaffeine,
      ].filter(Boolean).length
    : 0

  const requiredComplete =
    protocol?.wokeOnTime && protocol?.gotMorningLight && protocol?.drankWater

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white">
      {/* Header */}
      <header className="bg-green-900/30 border-b border-green-500/20 p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-bold">Morning Protocol</h1>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-green-300">Loading protocol...</p>
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">🌅 Earth Scroll</h2>
                  <p className="text-green-200 text-sm mt-1">
                    Foundation for your day
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-300">
                    {itemsChecked}/4
                  </div>
                  <div className="text-xs text-green-400">items</div>
                </div>
              </div>

              {protocol?.completed && (
                <div className="bg-green-800/40 border border-green-500/40 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-200">
                    ✅ Protocol Complete
                  </div>
                  <div className="text-xs text-green-300 mt-1">
                    +{protocol.xpEarned} XP, +{protocol.hpBonus} HP earned
                  </div>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-green-100">
                Morning Checklist
              </h3>

              {/* Woke on Time */}
              <button
                onClick={() => toggleItem('wokeOnTime')}
                disabled={protocol?.completed || updating}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  protocol?.wokeOnTime
                    ? 'bg-green-800/40 border-green-500/60'
                    : 'bg-green-950/40 border-green-500/20 hover:border-green-500/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      protocol?.wokeOnTime
                        ? 'bg-green-600 border-green-500'
                        : 'bg-transparent border-green-500/50'
                    }`}
                  >
                    {protocol?.wokeOnTime && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-green-100">
                      ⏰ Woke on time (06:00 ±15min)
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      Circadian anchor - most important item
                    </div>
                  </div>
                </div>
              </button>

              {/* Morning Light */}
              <button
                onClick={() => toggleItem('gotMorningLight')}
                disabled={protocol?.completed || updating}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  protocol?.gotMorningLight
                    ? 'bg-green-800/40 border-green-500/60'
                    : 'bg-green-950/40 border-green-500/20 hover:border-green-500/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      protocol?.gotMorningLight
                        ? 'bg-green-600 border-green-500'
                        : 'bg-transparent border-green-500/50'
                    }`}
                  >
                    {protocol?.gotMorningLight && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-green-100">
                      ☀️ Got outdoor light (within 60min of wake)
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      Sets cortisol spike, starts melatonin timer
                    </div>
                  </div>
                </div>
              </button>

              {/* Drank Water */}
              <button
                onClick={() => toggleItem('drankWater')}
                disabled={protocol?.completed || updating}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  protocol?.drankWater
                    ? 'bg-green-800/40 border-green-500/60'
                    : 'bg-green-950/40 border-green-500/20 hover:border-green-500/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      protocol?.drankWater
                        ? 'bg-green-600 border-green-500'
                        : 'bg-transparent border-green-500/50'
                    }`}
                  >
                    {protocol?.drankWater && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-green-100">
                      💧 Drank water (16oz+)
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      Rehydration after overnight fast
                    </div>
                  </div>
                </div>
              </button>

              {/* Delayed Caffeine (Optional) */}
              <button
                onClick={() => toggleItem('delayedCaffeine')}
                disabled={protocol?.completed || updating}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  protocol?.delayedCaffeine
                    ? 'bg-green-800/40 border-green-500/60'
                    : 'bg-green-950/40 border-green-500/20 hover:border-green-500/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      protocol?.delayedCaffeine
                        ? 'bg-green-600 border-green-500'
                        : 'bg-transparent border-green-500/50'
                    }`}
                  >
                    {protocol?.delayedCaffeine && (
                      <span className="text-white text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-green-100">
                      ☕ Delayed caffeine (90+ min after wake){' '}
                      <span className="text-xs text-green-400">OPTIONAL</span>
                    </div>
                    <div className="text-xs text-green-300 mt-1">
                      Prevents adenosine crash, bonus +5 XP
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Completion Status */}
            {!protocol?.completed && (
              <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
                {requiredComplete ? (
                  <div className="text-center">
                    <div className="text-green-300 font-semibold mb-2">
                      🎉 Ready to Complete!
                    </div>
                    <div className="text-sm text-green-400">
                      All required items checked. Rewards will be granted
                      automatically.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-green-400">
                    💡 Complete 3 required items to earn +30 XP and +5 HP
                  </div>
                )}
              </div>
            )}

            {/* Why This Matters */}
            <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4 text-sm">
              <div className="font-semibold mb-2 text-green-300">
                🌍 Earth Scroll Philosophy:
              </div>
              <ul className="space-y-1 text-green-200">
                <li>
                  • Circadian rhythm is the foundation of discipline
                </li>
                <li>
                  • Morning light exposure is more important than sleep duration
                </li>
                <li>
                  • Consistency beats perfection - do this daily
                </li>
                <li>• These 3 items set your HP capacity for the day</li>
              </ul>
            </div>

            <Link
              href="/mobile"
              className="block w-full text-center bg-green-600 hover:bg-green-700 py-4 rounded-lg font-semibold transition-colors"
            >
              Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
