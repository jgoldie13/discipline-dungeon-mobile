'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

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
    <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
          Morning Protocol
        </h1>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-dd-muted">Loading protocol...</p>
          </div>
        ) : (
          <>
            {/* Header Card */}
            <div className="glass-panel rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif uppercase tracking-widest text-mana">
                    🌅 Earth Scroll
                  </h2>
                  <p className="text-dd-muted text-sm mt-1">
                    Foundation for your day
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-mana">
                    {itemsChecked}/4
                  </div>
                  <div className="text-xs text-dd-muted">items</div>
                </div>
              </div>

              {protocol?.completed && (
                <div className="scroll-card border border-mana/40 p-3">
                  <div className="text-sm font-medium text-mana">
                    ✅ Protocol Complete
                  </div>
                  <div className="text-xs text-dd-muted mt-1">
                    +{protocol.xpEarned} XP, +{protocol.hpBonus} HP earned
                  </div>
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana">
                Morning Checklist
              </h3>

              {/* Woke on Time */}
              <button
                onClick={() => toggleItem('wokeOnTime')}
                disabled={protocol?.completed || updating}
                className={`scroll-card w-full text-left p-4 border transition-all ${
                  protocol?.wokeOnTime
                    ? 'border-mana/50 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                    : 'border-dd-border/60 hover:border-mana/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border flex items-center justify-center ${
                      protocol?.wokeOnTime
                        ? 'bg-mana/20 border-mana/40'
                        : 'bg-dd-surface/60 border-dd-border/70'
                    }`}
                  >
                    {protocol?.wokeOnTime && (
                      <span className="text-dd-text text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-dd-text">
                      ⏰ Woke on time (06:00 ±15min)
                    </div>
                    <div className="text-xs text-dd-muted mt-1">
                      Circadian anchor - most important item
                    </div>
                  </div>
                </div>
              </button>

              {/* Morning Light */}
              <button
                onClick={() => toggleItem('gotMorningLight')}
                disabled={protocol?.completed || updating}
                className={`scroll-card w-full text-left p-4 border transition-all ${
                  protocol?.gotMorningLight
                    ? 'border-mana/50 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                    : 'border-dd-border/60 hover:border-mana/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border flex items-center justify-center ${
                      protocol?.gotMorningLight
                        ? 'bg-mana/20 border-mana/40'
                        : 'bg-dd-surface/60 border-dd-border/70'
                    }`}
                  >
                    {protocol?.gotMorningLight && (
                      <span className="text-dd-text text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-dd-text">
                      ☀️ Got outdoor light (within 60min of wake)
                    </div>
                    <div className="text-xs text-dd-muted mt-1">
                      Sets cortisol spike, starts melatonin timer
                    </div>
                  </div>
                </div>
              </button>

              {/* Drank Water */}
              <button
                onClick={() => toggleItem('drankWater')}
                disabled={protocol?.completed || updating}
                className={`scroll-card w-full text-left p-4 border transition-all ${
                  protocol?.drankWater
                    ? 'border-mana/50 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                    : 'border-dd-border/60 hover:border-mana/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border flex items-center justify-center ${
                      protocol?.drankWater
                        ? 'bg-mana/20 border-mana/40'
                        : 'bg-dd-surface/60 border-dd-border/70'
                    }`}
                  >
                    {protocol?.drankWater && (
                      <span className="text-dd-text text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-dd-text">
                      💧 Drank water (16oz+)
                    </div>
                    <div className="text-xs text-dd-muted mt-1">
                      Rehydration after overnight fast
                    </div>
                  </div>
                </div>
              </button>

              {/* Delayed Caffeine (Optional) */}
              <button
                onClick={() => toggleItem('delayedCaffeine')}
                disabled={protocol?.completed || updating}
                className={`scroll-card w-full text-left p-4 border transition-all ${
                  protocol?.delayedCaffeine
                    ? 'border-mana/50 shadow-[0_0_16px_rgba(34,211,238,0.2)]'
                    : 'border-dd-border/60 hover:border-mana/40'
                } ${protocol?.completed ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded border flex items-center justify-center ${
                      protocol?.delayedCaffeine
                        ? 'bg-mana/20 border-mana/40'
                        : 'bg-dd-surface/60 border-dd-border/70'
                    }`}
                  >
                    {protocol?.delayedCaffeine && (
                      <span className="text-dd-text text-sm">✓</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-dd-text">
                      ☕ Delayed caffeine (90+ min after wake){' '}
                      <span className="text-xs text-dd-muted/70">OPTIONAL</span>
                    </div>
                    <div className="text-xs text-dd-muted mt-1">
                      Prevents adenosine crash, bonus +5 XP
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Completion Status */}
            {!protocol?.completed && (
              <div className="glass-panel rounded-xl p-4">
                {requiredComplete ? (
                  <div className="text-center">
                    <div className="text-mana font-semibold mb-2">
                      🎉 Ready to Complete!
                    </div>
                    <div className="text-sm text-dd-muted">
                      All required items checked. Rewards will be granted
                      automatically.
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-dd-muted">
                    💡 Complete 3 required items to earn +30 XP and +5 HP
                  </div>
                )}
              </div>
            )}

            {/* Why This Matters */}
            <div className="scroll-card p-4 text-sm">
              <div className="font-semibold mb-2 text-dd-text">
                🌍 Earth Scroll Philosophy:
              </div>
              <ul className="space-y-1 text-dd-muted">
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

            <Link href="/mobile">
              <Button variant="primary" size="lg" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
