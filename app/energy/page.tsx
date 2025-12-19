'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface HpBreakdown {
  hp: number
  status: string
  factors: {
    base: number
    sleepDurationBonus: number
    wakeTimeBonus: number
    qualityBonus: number
    alcoholPenalty: number
    caffeinePenalty: number
    screenPenalty: number
    lateExercisePenalty: number
    lateMealPenalty: number
    morningLightBonus: number
  }
  sleepData: {
    bedtime: string
    waketime: string
    durationHours: string
    subjectiveRested: number
  }
  isEdited: boolean
  editCount: number
  updatedAt: string
}

export default function EnergyPage() {
  const [loading, setLoading] = useState(true)
  const [breakdown, setBreakdown] = useState<HpBreakdown | null>(null)

  useEffect(() => {
    fetch('/api/user/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats?.hp?.breakdown) {
          setBreakdown(data.stats.hp.breakdown)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error fetching HP breakdown:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text flex items-center justify-center">
        <div className="text-dd-muted">Loading...</div>
      </div>
    )
  }

  if (!breakdown) {
    return (
      <div className="min-h-screen bg-transparent text-dd-text">
        <header className="glass-panel rounded-none p-4 flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            Energy Equation
          </h1>
        </header>

        <div className="p-6">
          <div className="glass-panel rounded-xl p-6 text-center">
            <div className="text-5xl mb-4">💤</div>
            <h2 className="text-xl font-serif uppercase tracking-widest text-mana mb-2">
              No Sleep Log Today
            </h2>
            <p className="text-dd-muted mb-6">
              Log your sleep to see your Energy Equation breakdown
            </p>
            <Link href="/sleep/log">
              <button className="bg-gold-solid text-slate-950 font-bold font-serif uppercase tracking-wide py-3 px-6 rounded-lg">
                Log Sleep
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { hp, status, factors, sleepData, isEdited, editCount } = breakdown

  return (
    <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            Energy Equation
          </h1>
        </div>
        <Link href="/sleep/log">
          <button className="text-sm bg-dd-surface/80 border border-dd-border/50 px-3 py-1 rounded hover:bg-dd-surface/90">
            Edit
          </button>
        </Link>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* HP Summary */}
        <div className="glass-panel rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-dd-muted">Your HP Today</div>
              <div className="text-5xl font-bold text-mana">{hp}</div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-semibold ${
                status === 'excellent' ? 'text-mana' :
                status === 'good' ? 'text-gold' :
                'text-blood'
              }`}>
                {status === 'excellent' ? '💪 Excellent' :
                 status === 'good' ? '👍 Good' :
                 '😴 Struggling'}
              </div>
              {isEdited && (
                <div className="text-xs text-dd-muted mt-1">
                  Edited {editCount}x
                </div>
              )}
            </div>
          </div>
          <div className="w-full bg-dd-surface/60 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                hp >= 85 ? 'bg-mana shadow-[0_0_10px_rgba(34,211,238,0.35)]' :
                hp >= 60 ? 'bg-gold shadow-[0_0_10px_rgba(251,191,36,0.35)]' :
                'bg-blood shadow-[0_0_10px_rgba(244,63,94,0.35)]'
              }`}
              style={{ width: `${hp}%` }}
            />
          </div>
        </div>

        {/* Sleep Data */}
        <div className="scroll-card p-4">
          <div className="font-semibold text-dd-text mb-3">Sleep Window</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-dd-muted">Bedtime</div>
              <div className="font-semibold text-dd-text">{new Date(sleepData.bedtime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div>
              <div className="text-dd-muted">Wake</div>
              <div className="font-semibold text-dd-text">{new Date(sleepData.waketime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div>
              <div className="text-dd-muted">Duration</div>
              <div className="font-semibold text-dd-text">{sleepData.durationHours}h</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-dd-border/50">
            <div className="text-dd-muted text-sm">How rested?</div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`flex-1 h-2 rounded ${
                    n <= sleepData.subjectiveRested ? 'bg-mana' : 'bg-dd-surface/60'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* HP Breakdown */}
        <div className="scroll-card p-4">
          <div className="font-semibold text-dd-text mb-3">HP Calculation</div>

          {/* Base */}
          <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
            <span className="text-dd-muted">Base HP</span>
            <span className="font-semibold text-dd-text">+{factors.base}</span>
          </div>

          {/* Bonuses */}
          {factors.sleepDurationBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">Sleep Duration</span>
              <span className="font-semibold text-mana">+{factors.sleepDurationBonus}</span>
            </div>
          )}

          {factors.wakeTimeBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">Wake Time Adherence</span>
              <span className="font-semibold text-mana">+{factors.wakeTimeBonus}</span>
            </div>
          )}

          {factors.qualityBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">Subjective Quality</span>
              <span className="font-semibold text-mana">+{factors.qualityBonus}</span>
            </div>
          )}

          {factors.morningLightBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">☀️ Morning Light</span>
              <span className="font-semibold text-mana">+{factors.morningLightBonus}</span>
            </div>
          )}

          {/* Penalties */}
          {factors.alcoholPenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">🍺 Alcohol (poison)</span>
              <span className="font-semibold text-blood">-{factors.alcoholPenalty}</span>
            </div>
          )}

          {factors.caffeinePenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">☕ Late Caffeine</span>
              <span className="font-semibold text-blood">-{factors.caffeinePenalty}</span>
            </div>
          )}

          {factors.screenPenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">📱 Screen Before Bed</span>
              <span className="font-semibold text-blood">-{factors.screenPenalty}</span>
            </div>
          )}

          {factors.lateExercisePenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">🏃 Late Exercise</span>
              <span className="font-semibold text-blood">-{factors.lateExercisePenalty}</span>
            </div>
          )}

          {factors.lateMealPenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-dd-border/50">
              <span className="text-dd-muted">🍽️ Late Meal</span>
              <span className="font-semibold text-blood">-{factors.lateMealPenalty}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between py-3 pt-4 font-bold">
            <span className="text-dd-text">Total HP</span>
            <span className="text-2xl text-dd-text">{hp}</span>
          </div>
        </div>

        {/* Impact on XP */}
        <div className="scroll-card p-4">
          <div className="font-semibold text-gold mb-2">⚡ Impact on XP Gains</div>
          <div className="text-sm text-dd-muted">
            {hp >= 85 && "You're at peak performance - earning 100% XP!"}
            {hp >= 60 && hp < 85 && "Good energy - earning 85% XP. Get more sleep for full gains."}
            {hp < 60 && "Low HP reduces XP to 70%. The system won't let you abuse yourself. Prioritize recovery."}
          </div>
        </div>

        {/* Help */}
        <div className="scroll-card p-4 text-sm">
          <div className="font-semibold mb-2 text-dd-text">💡 About the Energy Equation</div>
          <ul className="space-y-1 text-dd-muted">
            <li>• HP represents your biological capacity for focused work</li>
            <li>• Based on sleep duration, quality, and lifestyle factors</li>
            <li>• Target: 7.5+ hours sleep + good habits = 85+ HP</li>
            <li>• Low HP reduces XP gains to prevent burnout</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
