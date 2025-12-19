'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()
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
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!breakdown) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200">
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
            <p className="text-slate-300 mb-6">
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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="glass-panel rounded-none p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-serif uppercase tracking-widest text-mana">
            Energy Equation
          </h1>
        </div>
        <Link href="/sleep/log">
          <button className="text-sm bg-slate-900/60 border border-white/10 px-3 py-1 rounded hover:bg-slate-900/80">
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
              <div className="text-sm text-slate-300">Your HP Today</div>
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
                <div className="text-xs text-slate-300 mt-1">
                  Edited {editCount}x
                </div>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-900/40 rounded-full h-3">
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
          <div className="font-semibold text-slate-900 mb-3">Sleep Window</div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-slate-700">Bedtime</div>
              <div className="font-semibold text-slate-900">{new Date(sleepData.bedtime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div>
              <div className="text-slate-700">Wake</div>
              <div className="font-semibold text-slate-900">{new Date(sleepData.waketime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            </div>
            <div>
              <div className="text-slate-700">Duration</div>
              <div className="font-semibold text-slate-900">{sleepData.durationHours}h</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-900/15">
            <div className="text-slate-700 text-sm">How rested?</div>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`flex-1 h-2 rounded ${
                    n <= sleepData.subjectiveRested ? 'bg-mana' : 'bg-slate-900/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* HP Breakdown */}
        <div className="scroll-card p-4">
          <div className="font-semibold text-slate-900 mb-3">HP Calculation</div>

          {/* Base */}
          <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
            <span className="text-slate-700">Base HP</span>
            <span className="font-semibold text-slate-900">+{factors.base}</span>
          </div>

          {/* Bonuses */}
          {factors.sleepDurationBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">Sleep Duration</span>
              <span className="font-semibold text-mana">+{factors.sleepDurationBonus}</span>
            </div>
          )}

          {factors.wakeTimeBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">Wake Time Adherence</span>
              <span className="font-semibold text-mana">+{factors.wakeTimeBonus}</span>
            </div>
          )}

          {factors.qualityBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">Subjective Quality</span>
              <span className="font-semibold text-mana">+{factors.qualityBonus}</span>
            </div>
          )}

          {factors.morningLightBonus > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">☀️ Morning Light</span>
              <span className="font-semibold text-mana">+{factors.morningLightBonus}</span>
            </div>
          )}

          {/* Penalties */}
          {factors.alcoholPenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">🍺 Alcohol (poison)</span>
              <span className="font-semibold text-blood">-{factors.alcoholPenalty}</span>
            </div>
          )}

          {factors.caffeinePenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">☕ Late Caffeine</span>
              <span className="font-semibold text-blood">-{factors.caffeinePenalty}</span>
            </div>
          )}

          {factors.screenPenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">📱 Screen Before Bed</span>
              <span className="font-semibold text-blood">-{factors.screenPenalty}</span>
            </div>
          )}

          {factors.lateExercisePenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">🏃 Late Exercise</span>
              <span className="font-semibold text-blood">-{factors.lateExercisePenalty}</span>
            </div>
          )}

          {factors.lateMealPenalty > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-slate-900/10">
              <span className="text-slate-700">🍽️ Late Meal</span>
              <span className="font-semibold text-blood">-{factors.lateMealPenalty}</span>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between py-3 pt-4 font-bold">
            <span className="text-slate-900">Total HP</span>
            <span className="text-2xl text-slate-900">{hp}</span>
          </div>
        </div>

        {/* Impact on XP */}
        <div className="scroll-card p-4">
          <div className="font-semibold text-gold mb-2">⚡ Impact on XP Gains</div>
          <div className="text-sm text-slate-700">
            {hp >= 85 && "You're at peak performance - earning 100% XP!"}
            {hp >= 60 && hp < 85 && "Good energy - earning 85% XP. Get more sleep for full gains."}
            {hp < 60 && "Low HP reduces XP to 70%. The system won't let you abuse yourself. Prioritize recovery."}
          </div>
        </div>

        {/* Help */}
        <div className="scroll-card p-4 text-sm">
          <div className="font-semibold mb-2 text-slate-900">💡 About the Energy Equation</div>
          <ul className="space-y-1 text-slate-700">
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
