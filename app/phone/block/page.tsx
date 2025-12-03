'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface BossInfo {
  id: string
  title: string
  bossHpRemaining: number
  bossHp: number
}

export default function PhoneFreeBlockPage() {
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
      const response = await fetch('/api/phone/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMin: duration,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
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

    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-8xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold">Phone-Free Block Active</h1>
          <p className="text-green-200">Your phone should be locked away. Stay focused.</p>

          <div className="bg-green-900/40 border border-green-500/30 rounded-full p-12 my-8">
            <div className="text-7xl font-bold tabular-nums">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-green-300 text-sm mt-2">time remaining</div>
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
