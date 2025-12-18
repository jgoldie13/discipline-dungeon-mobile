'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LogSleepPage() {
  const router = useRouter()
  const [bedtime, setBedtime] = useState('')
  const [waketime, setWaketime] = useState('')
  const [restedRating, setRestedRating] = useState(3)
  const [saving, setSaving] = useState(false)
  const [hpPreview, setHpPreview] = useState<number | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Energy Equation fields
  const [alcoholUnits, setAlcoholUnits] = useState(0)
  const [caffeinePastNoon, setCaffeinePastNoon] = useState(false)
  const [caffeineHoursBefore, setCaffeineHoursBefore] = useState(0)
  const [screenMinBefore, setScreenMinBefore] = useState(0)
  const [gotMorningLight, setGotMorningLight] = useState(false)
  const [exercisedToday, setExercisedToday] = useState(false)
  const [exerciseHoursBefore, setExerciseHoursBefore] = useState(0)
  const [lastMealHoursBefore, setLastMealHoursBefore] = useState(0)

  // Auto-fill waketime with current time on load
  useEffect(() => {
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setWaketime(timeStr)

    // Suggest bedtime 7.5 hours ago
    const suggestedBed = new Date(now.getTime() - 7.5 * 60 * 60 * 1000)
    const bedStr = `${String(suggestedBed.getHours()).padStart(2, '0')}:${String(suggestedBed.getMinutes()).padStart(2, '0')}`
    setBedtime(bedStr)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Convert time strings to Date objects
      const now = new Date()
      const [bedHour, bedMin] = bedtime.split(':').map(Number)
      const [wakeHour, wakeMin] = waketime.split(':').map(Number)

      const bedDate = new Date(now)
      bedDate.setHours(bedHour, bedMin, 0, 0)
      // If bedtime is "after" waketime (e.g., 23:00 vs 06:00), it was yesterday
      if (bedDate > now) {
        bedDate.setDate(bedDate.getDate() - 1)
      }

      const wakeDate = new Date(now)
      wakeDate.setHours(wakeHour, wakeMin, 0, 0)

      const response = await fetch('/api/sleep/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedtime: bedDate.toISOString(),
          waketime: wakeDate.toISOString(),
          subjectiveRested: restedRating,
          // Energy Equation fields
          alcoholUnits,
          caffeinePastNoon,
          caffeineHoursBefore,
          screenMinBefore,
          gotMorningLight,
          exercisedToday,
          exerciseHoursBefore,
          lastMealHoursBefore,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      // Show result
      const hp = data.hpCalculation.hp
      const status = data.hpCalculation.status
      const statusEmoji = status === 'excellent' ? '💪' : status === 'good' ? '👍' : '😴'

      alert(`${statusEmoji} Sleep logged!\n\nHP: ${hp}/100 (${status})\n\nThis affects your XP gains today.`)

      router.push('/mobile')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving sleep log. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Calculate preview HP
  useEffect(() => {
    if (bedtime && waketime) {
      const now = new Date()
      const [bedHour, bedMin] = bedtime.split(':').map(Number)
      const [wakeHour, wakeMin] = waketime.split(':').map(Number)

      const bedDate = new Date(now)
      bedDate.setHours(bedHour, bedMin, 0, 0)
      if (bedDate > now) {
        bedDate.setDate(bedDate.getDate() - 1)
      }

      const wakeDate = new Date(now)
      wakeDate.setHours(wakeHour, wakeMin, 0, 0)

      const durationHours = (wakeDate.getTime() - bedDate.getTime()) / (1000 * 60 * 60)

      // Simple preview calculation
      let hp = 60 // base
      if (durationHours >= 7.5) hp += 25
      else if (durationHours >= 7.0) hp += 20
      else if (durationHours >= 6.5) hp += 15
      else if (durationHours >= 6.0) hp += 10
      else if (durationHours >= 5.5) hp += 5

      hp += restedRating // quality bonus

      setHpPreview(Math.min(100, hp))
    }
  }, [bedtime, waketime, restedRating])

  const duration = bedtime && waketime ? (() => {
    const now = new Date()
    const [bedHour, bedMin] = bedtime.split(':').map(Number)
    const [wakeHour, wakeMin] = waketime.split(':').map(Number)

    const bedDate = new Date(now)
    bedDate.setHours(bedHour, bedMin, 0, 0)
    if (bedDate > now) {
      bedDate.setDate(bedDate.getDate() - 1)
    }

    const wakeDate = new Date(now)
    wakeDate.setHours(wakeHour, wakeMin, 0, 0)

    const hours = (wakeDate.getTime() - bedDate.getTime()) / (1000 * 60 * 60)
    return hours.toFixed(1)
  })() : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-indigo-950 to-black text-white">
      {/* Header */}
      <header className="bg-indigo-900/30 border-b border-indigo-500/20 p-4 flex items-center gap-4">
        <Link href="/mobile" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold">Morning Check-In</h1>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">🌅 How did you sleep?</h2>
            <p className="text-indigo-200">
              Your sleep determines your HP (capacity) for today. Be honest.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bedtime */}
            <div className="space-y-2">
              <label className="text-sm text-indigo-300 font-medium">
                🌙 Bedtime (last night)
              </label>
              <input
                type="time"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-4 text-2xl font-bold text-center focus:outline-none focus:border-indigo-400"
                required
              />
            </div>

            {/* Waketime */}
            <div className="space-y-2">
              <label className="text-sm text-indigo-300 font-medium">
                ☀️ Wake time (this morning)
              </label>
              <input
                type="time"
                value={waketime}
                onChange={(e) => setWaketime(e.target.value)}
                className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-4 text-2xl font-bold text-center focus:outline-none focus:border-indigo-400"
                required
              />
            </div>

            {/* Duration Display */}
            {duration && (
              <div className="bg-indigo-950/50 rounded-lg p-4 text-center">
                <div className="text-sm text-indigo-300">Sleep Duration</div>
                <div className="text-3xl font-bold text-indigo-100">
                  {duration} hours
                </div>
                {parseFloat(duration) < 6.5 && (
                  <div className="text-xs text-yellow-400 mt-2">
                    ⚠️ Under 6.5 hours - HP will be reduced
                  </div>
                )}
              </div>
            )}

            {/* Rested Rating */}
            <div className="space-y-3">
              <label className="text-sm text-indigo-300 font-medium">
                💫 How rested do you feel?
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setRestedRating(rating)}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      restedRating === rating
                        ? 'bg-indigo-600 text-white scale-105'
                        : 'bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/50'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-indigo-400">
                <span>😴 Exhausted</span>
                <span>💪 Energized</span>
              </div>
            </div>

            {/* Energy Equation - Advanced */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between bg-indigo-950/50 border border-indigo-500/30 rounded-lg p-4 hover:bg-indigo-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div className="text-left">
                    <div className="font-semibold text-indigo-100">Energy Equation (Advanced)</div>
                    <div className="text-xs text-indigo-300">Track factors that affect your HP</div>
                  </div>
                </div>
                <span className="text-2xl text-indigo-400">{showAdvanced ? '−' : '+'}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-4">
                  {/* Alcohol */}
                  <div className="space-y-2">
                    <label className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                      <span>🍺</span> Alcohol (drinks before bed)
                      <span className="text-xs text-red-400">-15 HP each</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={alcoholUnits}
                      onChange={(e) => setAlcoholUnits(parseInt(e.target.value) || 0)}
                      className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-3 text-center focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Caffeine Timing */}
                  <div className="space-y-2">
                    <label className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                      <span>☕</span> Caffeine timing
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 bg-indigo-950/50 p-3 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={caffeinePastNoon}
                          onChange={(e) => setCaffeinePastNoon(e.target.checked)}
                          className="w-5 h-5"
                        />
                        <span>Had caffeine after 2pm <span className="text-xs text-yellow-400">-5 HP</span></span>
                      </label>
                      <div className="space-y-1">
                        <label className="text-xs text-indigo-400">Hours before bed (0 = none):</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={caffeineHoursBefore}
                          onChange={(e) => setCaffeineHoursBefore(parseInt(e.target.value) || 0)}
                          className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-2 text-center focus:outline-none focus:border-indigo-400"
                        />
                        {caffeineHoursBefore > 0 && caffeineHoursBefore < 6 && (
                          <div className="text-xs text-red-400">⚠️ Within 6h of bed: -10 HP</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Screen Time */}
                  <div className="space-y-2">
                    <label className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                      <span>📱</span> Screen time before bed (min)
                      <span className="text-xs text-yellow-400">30+ min = -5 HP</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={screenMinBefore}
                      onChange={(e) => setScreenMinBefore(parseInt(e.target.value) || 0)}
                      className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-3 text-center focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  {/* Morning Light */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 bg-indigo-950/50 p-3 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gotMorningLight}
                        onChange={(e) => setGotMorningLight(e.target.checked)}
                        className="w-5 h-5"
                      />
                      <span>☀️ Got outdoor light this morning <span className="text-xs text-green-400">+5 HP</span></span>
                    </label>
                  </div>

                  {/* Exercise */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 bg-indigo-950/50 p-3 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exercisedToday}
                        onChange={(e) => setExercisedToday(e.target.checked)}
                        className="w-5 h-5"
                      />
                      <span>🏃 Exercised yesterday</span>
                    </label>
                    {exercisedToday && (
                      <div className="space-y-1">
                        <label className="text-xs text-indigo-400">Hours before bed (0 = morning):</label>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={exerciseHoursBefore}
                          onChange={(e) => setExerciseHoursBefore(parseInt(e.target.value) || 0)}
                          className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-2 text-center focus:outline-none focus:border-indigo-400"
                        />
                        {exerciseHoursBefore > 0 && exerciseHoursBefore < 4 && (
                          <div className="text-xs text-yellow-400">⚠️ Within 4h of bed: -5 HP</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Last Meal */}
                  <div className="space-y-2">
                    <label className="text-sm text-indigo-300 font-medium flex items-center gap-2">
                      <span>🍽️</span> Last meal (hours before bed)
                      <span className="text-xs text-yellow-400">&lt;3h = -5 HP</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={lastMealHoursBefore}
                      onChange={(e) => setLastMealHoursBefore(parseInt(e.target.value) || 0)}
                      className="w-full bg-indigo-950 border border-indigo-500/50 rounded-lg p-3 text-center focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* HP Preview */}
            {hpPreview !== null && (
              <div className="bg-gradient-to-br from-green-900/40 to-indigo-900/40 border-2 border-green-500/40 rounded-lg p-4">
                <div className="text-sm text-green-200 mb-2">Your HP Today:</div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-bold text-green-300">
                    {hpPreview}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-black/30 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          hpPreview >= 85
                            ? 'bg-green-500'
                            : hpPreview >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${hpPreview}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-green-200 mt-2">
                      {hpPreview >= 85
                        ? '💪 Excellent! Peak performance.'
                        : hpPreview >= 60
                        ? '👍 Good energy for the day.'
                        : '😴 Low HP. Prioritize recovery.'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!bedtime || !waketime || saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-indigo-500 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              {saving ? 'Saving...' : 'Log Sleep & Set HP'}
            </button>

            <Link
              href="/mobile"
              className="block w-full text-center text-indigo-300 hover:text-indigo-100 py-2"
            >
              Cancel
            </Link>
          </form>
        </div>

        {/* Tips */}
        <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4 text-sm">
          <div className="font-semibold mb-2 text-indigo-300">💡 Why HP Matters:</div>
          <ul className="space-y-1 text-indigo-200">
            <li>• HP represents your biological capacity for focused work</li>
            <li>• Low HP (sleep debt) reduces XP gains - the system won't let you abuse yourself</li>
            <li>• Target: 7-7.5h sleep for 85+ HP (full XP)</li>
            <li>• Consistency matters - track sleep every morning</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
