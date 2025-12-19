'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface NsdrSession {
  id: string
  userId: string
  sessionType: 'nsdr' | 'yoga_nidra'
  durationMin: number
  hpRestored: number
  completedAt: Date
}

interface HealingState {
  currentHp: number
  maxHp: number
  canHeal: boolean
  todaysSessions: NsdrSession[]
  totalHpRestored: number
}

export default function NsdrPage() {
  const router = useRouter()
  const [healing, setHealing] = useState<HealingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [healing_in_progress, setHealingInProgress] = useState(false)

  useEffect(() => {
    fetchHealingState()
  }, [])

  const fetchHealingState = async () => {
    try {
      const response = await fetch('/api/nsdr')
      const data = await response.json()
      setHealing(data)
    } catch (error) {
      console.error('Error fetching healing state:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeNsdr = async () => {
    setHealingInProgress(true)
    try {
      const response = await fetch('/api/nsdr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'nsdr',
          durationMin: 10,
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`🌟 NSDR Complete!\n\n+${data.hpRestored} HP restored\n\nYou now have ${data.newHp} HP`)
        setHealing(data.healing)
      } else {
        alert(data.message || 'Error completing NSDR session')
      }
    } catch (error) {
      console.error('Error completing NSDR:', error)
      alert('Error completing NSDR. Please try again.')
    } finally {
      setHealingInProgress(false)
    }
  }

  const hpPercent = healing
    ? Math.round((healing.currentHp / healing.maxHp) * 100)
    : 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">
          ←
        </Link>
        <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
          NSDR Recovery
        </h1>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading...</p>
          </div>
        ) : (
          <>
            {/* HP Status */}
            <div className="glass-panel rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif uppercase tracking-widest text-mana">
                    💤 HP Recovery
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Non-Sleep Deep Rest
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-mana">
                    {healing?.currentHp}/{healing?.maxHp}
                  </div>
                  <div className="text-xs text-slate-300">HP</div>
                </div>
              </div>

              {/* HP Bar */}
              <div className="w-full bg-slate-900/40 rounded-full h-4 border border-white/10">
                <div
                  className="bg-blood h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              {healing && healing.totalHpRestored > 0 && (
                <div className="scroll-card border border-mana/30 p-3">
                  <div className="text-sm font-medium text-slate-900">
                    ✅ {healing.todaysSessions.length} session
                    {healing.todaysSessions.length !== 1 ? 's' : ''} today
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    +{healing.totalHpRestored} HP restored total
                  </div>
                </div>
              )}
            </div>

            {/* NSDR Video */}
            <div className="space-y-3">
              <h3 className="text-sm font-serif uppercase tracking-widest text-mana">
                Guided Protocol
              </h3>
              <div className="glass-panel rounded-xl p-4">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/AKGrmY8OSHM"
                    title="NSDR Protocol"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="text-sm text-slate-300 mt-3">
                  <div className="font-semibold text-slate-100">Dr. Andrew Huberman - 10 Min NSDR</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Follow along with this guided protocol
                  </div>
                </div>
              </div>
            </div>

            {/* Heal Button */}
            <Button
              onClick={completeNsdr}
              disabled={!healing?.canHeal || healing_in_progress}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {healing_in_progress
                ? 'Processing...'
                : healing?.canHeal
                ? '✨ Complete NSDR (+10 HP)'
                : 'Already at max HP'}
            </Button>

            {/* Info Section */}
            <div className="scroll-card p-4 text-sm">
              <div className="font-semibold mb-2 text-slate-900">
                🧠 What is NSDR?
              </div>
              <ul className="space-y-2 text-slate-700">
                <li>
                  • <strong>Non-Sleep Deep Rest:</strong> A state between waking
                  and sleeping
                </li>
                <li>
                  • Restores dopamine, reduces cortisol, improves focus
                </li>
                <li>
                  • 10 minutes of NSDR ≈ 1-2 hours of additional sleep in terms
                  of restoration
                </li>
                <li>
                  • Use this when HP is low from poor sleep or after intense work
                </li>
                <li>
                  • Can be done multiple times per day (each session restores 10
                  HP)
                </li>
              </ul>
            </div>

            {/* Protocol Tips */}
            <div className="scroll-card p-4 text-sm">
              <div className="font-semibold mb-2 text-slate-900">
                💡 How to Use:
              </div>
              <ul className="space-y-1 text-slate-700">
                <li>1. Find a quiet, comfortable place to lie down</li>
                <li>2. Use headphones for best results</li>
                <li>3. Follow the guided audio protocol (10 min)</li>
                <li>4. Stay still, but remain aware (don't fall asleep)</li>
                <li>5. Click "Complete NSDR" when finished</li>
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
