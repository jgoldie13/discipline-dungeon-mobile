'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PillBadge } from '@/components/ui/PillBadge'
import { BottomCTA } from '@/components/ui/BottomCTA'
import { useToast } from '@/components/ui/Toast'

export default function LogPhoneUsagePage() {
  const router = useRouter()
  const [minutes, setMinutes] = useState('')
  const [limit] = useState(30) // Default daily limit
  const [saving, setSaving] = useState(false)
  const pushToast = useToast()

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
        pushToast({
          title: 'Logged over limit',
          description: `Over by ${overage} minutes. Streak reset.`,
          variant: 'warning',
          actionLabel: 'View Build',
          onAction: () => (window.location.href = '/build'),
        })
      } else {
        pushToast({
          title: 'Great job staying under limit',
          description: `Under by ${limit - minutesNum} minutes.`,
          variant: 'success',
        })
      }

      router.push('/mobile')
    } catch (error) {
      console.error('Error saving:', error)
      pushToast({
        title: 'Error saving usage',
        description: 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setSaving(false)
    }
  }

  const overage = minutes ? Math.max(0, parseInt(minutes) - limit) : 0
  const isOver = overage > 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-24">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">←</Link>
        <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
          Log Phone Usage
        </h1>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        <Card className="scroll-card">
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-serif uppercase tracking-widest text-slate-900 mb-2">
                How much time today?
              </h2>
              <p className="text-slate-700">
                Be honest. Check your Screen Time settings.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-700">
                Social Media Minutes (Instagram, TikTok, etc.)
              </label>
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-slate-900/10 border border-slate-900/20 rounded-[--radius-lg] p-4 text-3xl font-bold text-center focus:outline-none focus:border-mana/60 text-slate-900 tabular-nums"
                autoFocus
              />
            </div>

            <div className="scroll-card border border-slate-900/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Daily Limit:</span>
                <PillBadge className="bg-slate-900/10 text-slate-900 border-slate-900/20">
                  {limit} min
                </PillBadge>
              </div>
              {minutes && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700">Your Usage:</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {minutes} min
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isOver ? 'text-blood' : 'text-mana'}>
                      {isOver ? 'Over by:' : 'Under by:'}
                    </span>
                    <PillBadge
                      className={
                        isOver
                          ? 'bg-blood/20 text-blood border-blood/40'
                          : 'bg-mana/20 text-mana border-mana/40'
                      }
                    >
                      {isOver ? `+${overage}` : `-${limit - parseInt(minutes)}`} min
                    </PillBadge>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {isOver && (
          <div className="space-y-3">
            <Card className="scroll-card border border-blood/40">
              <div className="space-y-3">
                <div className="font-semibold text-blood">⚠️ Violation Logged:</div>
                <ul className="text-sm space-y-1 text-slate-700">
                  <li>• XP penalty applied (-{overage * 2} XP)</li>
                  <li>• Streak reset to 0</li>
                  <li>• Violation tracked</li>
                </ul>
              </div>
            </Card>

            <Card className="scroll-card">
              <div className="space-y-3">
                <div className="font-semibold text-slate-900">🔄 What Now?</div>
                <p className="text-sm text-slate-700">
                  You chose your limits. This setback is information, not failure. Here's how to rebuild:
                </p>
                <div className="space-y-2">
                  <Link
                    href="/tasks"
                    className="block scroll-card p-3 transition-transform hover:-translate-y-1"
                  >
                    <div className="font-medium text-slate-900">
                      → Create one exposure task
                    </div>
                    <div className="text-xs text-slate-700">
                      Rebuild momentum with action (100 XP)
                    </div>
                  </Link>
                  <Link
                    href="/phone/block"
                    className="block scroll-card p-3 transition-transform hover:-translate-y-1"
                  >
                    <div className="font-medium text-slate-900">
                      → Start a 30-min phone-free block
                    </div>
                    <div className="text-xs text-slate-700">
                      Prove you can resist right now (30 XP)
                    </div>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tips */}
        <Card className="scroll-card">
          <div className="space-y-2">
            <div className="font-semibold text-slate-900">💡 Tips:</div>
            <ul className="space-y-1 text-sm text-slate-700">
              <li>• Check iPhone: Settings → Screen Time → See All Activity</li>
              <li>• Add up time for social apps (Instagram, TikTok, Twitter, etc.)</li>
              <li>• Be honest - lying only hurts you</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* Bottom CTA */}
      <BottomCTA>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!minutes || saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Usage Log'}
          </Button>
        </form>
      </BottomCTA>
    </div>
  )
}
