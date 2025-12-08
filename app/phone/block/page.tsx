'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PomodoroTimer } from '@/components/PomodoroTimer'

interface BossInfo {
  id: string
  title: string
  bossHpRemaining: number
  bossHp: number
}

function PhoneFreeBlockContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'setup' | 'running' | 'complete'>('setup')
  const [duration, setDuration] = useState(60) // minutes
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [bossInfo, setBossInfo] = useState<BossInfo | null>(null)
  const [blockId, setBlockId] = useState<string | null>(null)
  const [bossAttackResult, setBossAttackResult] = useState<{
    damage: number
    defeated: boolean
    xpEarned: number
    message: string
  } | null>(null)

  // Pomodoro state
  const [usePomodoro, setUsePomodoro] = useState(false)
  const [pomodoroPreset, setPomodoroPreset] = useState<'25/5' | '50/10' | 'custom'>('25/5')
  const [customFocusMin, setCustomFocusMin] = useState(25)
  const [customBreakMin, setCustomBreakMin] = useState(5)

  // Check for boss ID in URL params
  useEffect(() => {
    const bossId = searchParams.get('bossId')
    if (bossId) {
      fetchBossInfo(bossId)
    }
  }, [searchParams])

  useEffect(() => {
    if (step === 'running' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && step === 'running' && startTime) {
      // Block completed - save to database
      saveBlock()
    }
  }, [step, timeLeft, startTime])

  const fetchBossInfo = async (bossId: string) => {
    try {
      const response = await fetch(`/api/boss/${bossId}`)
      const data = await response.json()
      setBossInfo({
        id: data.task.id,
        title: data.task.title,
        bossHpRemaining: data.task.bossHpRemaining,
        bossHp: data.task.bossHp,
      })
    } catch (error) {
      console.error('Error fetching boss info:', error)
    }
  }

  const saveBlock = async () => {
    if (!startTime) return

    try {
      const endTime = new Date()

      // Calculate Pomodoro config based on preset or custom values
      const getPomodoroConfig = () => {
        if (!usePomodoro) return null

        if (pomodoroPreset === '25/5') {
          return { enabled: true, focusMinutes: 25, breakMinutes: 5 }
        } else if (pomodoroPreset === '50/10') {
          return { enabled: true, focusMinutes: 50, breakMinutes: 10 }
        } else {
          return { enabled: true, focusMinutes: customFocusMin, breakMinutes: customBreakMin }
        }
      }

      const response = await fetch('/api/phone/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMin: duration,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          pomodoroConfig: getPomodoroConfig(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setBlockId(data.block.id)

        // If this block is for a boss, attack the boss
        if (bossInfo) {
          await attackBoss(data.block.id)
        }

        setStep('complete')
      } else {
        console.error('Failed to save phone-free block')
        setStep('complete') // Still show completion even if save fails
      }
    } catch (error) {
      console.error('Error saving phone-free block:', error)
      setStep('complete')
    }
  }

  const attackBoss = async (blockId: string) => {
    if (!bossInfo) return

    try {
      const response = await fetch('/api/boss/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: bossInfo.id,
          blockId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setBossAttackResult({
          damage: data.damage.finalDamage,
          defeated: data.defeated,
          xpEarned: data.xpEarned,
          message: data.message,
        })
      }
    } catch (error) {
      console.error('Error attacking boss:', error)
    }
  }

  const handleStart = () => {
    const now = new Date()
    setStartTime(now)
    setTimeLeft(duration * 60) // Convert to seconds
    setStep('running')
  }

  const xpEarned = duration // 1 XP per minute

  if (step === 'setup') {
    const bgColor = bossInfo ? 'from-black via-red-950 to-black' : 'from-black via-green-950 to-black'
    const headerColor = bossInfo ? 'bg-red-900/30 border-red-500/20' : 'bg-green-900/30 border-green-500/20'
    const cardColor = bossInfo ? 'bg-red-900/40 border-red-500/30' : 'bg-green-900/40 border-green-500/30'

    return (
      <div className={`min-h-screen bg-gradient-to-b ${bgColor} text-white`}>
        <header className={`${headerColor} border-b p-4 flex items-center gap-4`}>
          <Link href={bossInfo ? `/boss/${bossInfo.id}` : '/mobile'} className="text-2xl">←</Link>
          <h1 className="text-xl font-bold">{bossInfo ? '⚔️ Attack Boss' : 'Phone-Free Block'}</h1>
        </header>

        <div className="p-6 space-y-6">
          {bossInfo && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-lg p-6 space-y-3">
              <div className="text-sm text-red-300 font-semibold">Boss Battle:</div>
              <div className="text-2xl font-bold text-red-100">{bossInfo.title}</div>
              <div className="flex justify-between text-sm">
                <span className="text-red-200">Boss HP:</span>
                <span className="text-red-100 font-medium">{bossInfo.bossHpRemaining} / {bossInfo.bossHp}</span>
              </div>
              <div className="text-xs text-red-300">
                Each minute of focused work = 1 damage to boss
              </div>
            </div>
          )}

          <div className={`${cardColor} rounded-lg p-6 space-y-4`}>
            <div className="text-6xl text-center mb-4">{bossInfo ? '⚔️' : '🔒'}</div>
            <h2 className="text-2xl font-bold text-center">{bossInfo ? 'Attack with Focus' : 'Lock Your Phone Away'}</h2>
            <p className={`${bossInfo ? 'text-red-200' : 'text-green-200'} text-center`}>
              {bossInfo
                ? 'Put your phone away and focus. Deal damage to the boss with deep work.'
                : 'Put your phone in a time-locked container. Earn massive XP for phone-free focus time.'
              }
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-green-300 mb-2">Duration (minutes)</label>
              <div className="flex gap-2">
                {[30, 60, 90, 120, 180, 240].map((min) => (
                  <button
                    key={min}
                    onClick={() => setDuration(min)}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      duration === min
                        ? 'bg-green-600 text-white'
                        : 'bg-green-900/40 border border-green-500/30 text-green-200 hover:bg-green-800/50'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>

            {/* Pomodoro Configuration */}
            <div className="border-t border-green-500/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-green-300 font-semibold">🍅 Pomodoro Timer</label>
                <button
                  onClick={() => setUsePomodoro(!usePomodoro)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    usePomodoro
                      ? 'bg-green-600 text-white'
                      : 'bg-green-900/40 border border-green-500/30 text-green-300'
                  }`}
                >
                  {usePomodoro ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {usePomodoro && (
                <div className="space-y-3">
                  <div className="text-xs text-green-400 mb-2">
                    Alternate between focus and break intervals
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPomodoroPreset('25/5')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        pomodoroPreset === '25/5'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/40 border border-green-500/30 text-green-200'
                      }`}
                    >
                      25 / 5
                    </button>
                    <button
                      onClick={() => setPomodoroPreset('50/10')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        pomodoroPreset === '50/10'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/40 border border-green-500/30 text-green-200'
                      }`}
                    >
                      50 / 10
                    </button>
                    <button
                      onClick={() => setPomodoroPreset('custom')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        pomodoroPreset === 'custom'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/40 border border-green-500/30 text-green-200'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {pomodoroPreset === 'custom' && (
                    <div className="flex gap-3 mt-3">
                      <div className="flex-1">
                        <label className="block text-xs text-green-400 mb-1">Focus (min)</label>
                        <input
                          type="number"
                          value={customFocusMin}
                          onChange={(e) => setCustomFocusMin(parseInt(e.target.value) || 25)}
                          min="1"
                          max="120"
                          className="w-full bg-green-950 border border-green-500/30 rounded px-3 py-2 text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-green-400 mb-1">Break (min)</label>
                        <input
                          type="number"
                          value={customBreakMin}
                          onChange={(e) => setCustomBreakMin(parseInt(e.target.value) || 5)}
                          min="1"
                          max="60"
                          className="w-full bg-green-950 border border-green-500/30 rounded px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-green-300 bg-green-950/50 rounded p-2">
                    {pomodoroPreset === '25/5' && '25 min focus, 5 min break (classic)'}
                    {pomodoroPreset === '50/10' && '50 min focus, 10 min break (deep work)'}
                    {pomodoroPreset === 'custom' && `${customFocusMin} min focus, ${customBreakMin} min break`}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-green-300">Duration:</span>
                <span className="font-semibold">{duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">XP Reward:</span>
                <span className="font-bold text-green-400">+{xpEarned} XP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-300">XP per hour:</span>
                <span className="font-semibold text-green-400">60 XP</span>
              </div>
            </div>
          </div>

          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
            <div className="font-semibold text-yellow-300 mb-2">📦 Recommended Equipment:</div>
            <p className="text-sm text-yellow-200 mb-3">
              <strong>kSafe / Kitchen Safe</strong> - Time-locked container (~$50)
            </p>
            <p className="text-xs text-yellow-200">
              This app uses the honor system for now. Future versions will include photo verification.
            </p>
          </div>

          <button
            onClick={handleStart}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Start {duration}-Minute Block
          </button>

          <Link
            href="/mobile"
            className="block w-full text-center text-green-300 hover:text-green-100 py-2"
          >
            Cancel
          </Link>
        </div>
      </div>
    )
  }

  if (step === 'running') {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100

    // Get current Pomodoro config
    const getPomodoroValues = () => {
      if (!usePomodoro) return { enabled: false, focusMin: 25, breakMin: 5 }

      if (pomodoroPreset === '25/5') {
        return { enabled: true, focusMin: 25, breakMin: 5 }
      } else if (pomodoroPreset === '50/10') {
        return { enabled: true, focusMin: 50, breakMin: 10 }
      } else {
        return { enabled: true, focusMin: customFocusMin, breakMin: customBreakMin }
      }
    }

    const pomodoro = getPomodoroValues()

    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-8xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold">Phone-Free Block Active</h1>
          <p className="text-green-200">Your phone should be locked away. Stay focused.</p>

          {/* Pomodoro Timer */}
          {usePomodoro && startTime && (
            <div className="my-6">
              <PomodoroTimer
                context={bossInfo ? 'boss' : 'phone-block'}
                startedAt={startTime}
                endedAt={null}
                enabled={pomodoro.enabled}
                focusMinutes={pomodoro.focusMin}
                breakMinutes={pomodoro.breakMin}
              />
            </div>
          )}

          <div className="bg-green-900/40 border border-green-500/30 rounded-full p-12 my-8">
            <div className="text-7xl font-bold tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-green-300 text-sm mt-2">block time remaining</div>
          </div>

          <div className="w-full bg-green-950 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-4 space-y-2">
            <div className="text-sm text-green-300">You're earning</div>
            <div className="text-4xl font-bold text-green-400">+{xpEarned} XP</div>
            <div className="text-xs text-green-300">when this block completes</div>
          </div>

          <p className="text-sm text-green-300">
            Can't access this app right now? That's the point. Your phone should be locked away.
          </p>

          <button
            onClick={() => setTimeLeft(0)}
            className="text-xs text-green-500 hover:text-green-300 underline mt-4"
          >
            (Skip timer for testing)
          </button>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    const bgColor = bossInfo ? 'from-black via-red-950 to-black' : 'from-black via-green-950 to-black'
    const defeated = bossAttackResult?.defeated || false

    return (
      <div className={`min-h-screen bg-gradient-to-b ${bgColor} text-white flex flex-col items-center justify-center p-6`}>
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-8xl mb-4">{defeated ? '🏆' : bossInfo ? '⚔️' : '🎉'}</div>
          <h1 className="text-4xl font-bold">{defeated ? 'BOSS DEFEATED!' : 'Block Complete!'}</h1>
          <p className="text-xl text-green-200">
            You stayed phone-free for {duration} minutes. That's discipline.
          </p>

          {/* Boss Attack Results */}
          {bossAttackResult && (
            <div className="bg-red-900/40 border border-red-500/30 rounded-lg p-6 space-y-3">
              <div className="text-sm text-red-300">Boss Attack:</div>
              <div className="font-bold text-2xl text-red-100">{bossInfo?.title}</div>
              <div className="text-4xl font-bold text-red-400">
                {bossAttackResult.damage} damage dealt!
              </div>
              {defeated && (
                <div className="bg-yellow-900/40 border border-yellow-500/40 rounded-lg p-3 mt-3">
                  <div className="text-yellow-200 font-semibold">Boss Defeated!</div>
                  <div className="text-3xl font-bold text-yellow-400 mt-2">
                    +{bossAttackResult.xpEarned} XP
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Regular Block XP */}
          {!defeated && (
            <div className={`${bossInfo ? 'bg-red-900/40 border-red-500/30' : 'bg-green-900/40 border-green-500/30'} rounded-lg p-6 space-y-3`}>
              <div className={`text-sm ${bossInfo ? 'text-red-300' : 'text-green-300'}`}>Block Completed:</div>
              <div className="font-semibold text-lg">{duration} minutes</div>
              <div className={`text-5xl font-bold ${bossInfo ? 'text-red-400' : 'text-green-400'} mt-4`}>+{xpEarned} XP</div>
            </div>
          )}

          {!bossInfo && (
            <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 text-sm">
              <div className="font-semibold mb-2">💡 Tip:</div>
              <p className="text-purple-200">
                Stack phone-free blocks daily. Consistency beats intensity.
              </p>
            </div>
          )}

          <button
            onClick={() => router.push(bossInfo ? `/boss/${bossInfo.id}` : '/mobile')}
            className={`w-full ${bossInfo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg`}
          >
            {bossInfo ? (defeated ? 'View Boss Details' : 'Continue Battle') : 'Back to Home'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default function PhoneFreeBlockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <PhoneFreeBlockContent />
    </Suspense>
  )
}
