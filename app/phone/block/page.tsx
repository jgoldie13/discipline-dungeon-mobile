'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PhoneFreeBlockPage() {
  const router = useRouter()
  const [step, setStep] = useState<'setup' | 'running' | 'complete'>('setup')
  const [duration, setDuration] = useState(60) // minutes
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (step === 'running' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && step === 'running' && startTime) {
      // Block completed - save to database
      saveBlock()
    }
  }, [step, timeLeft, startTime])

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

  const handleStart = () => {
    const now = new Date()
    setStartTime(now)
    setTimeLeft(duration * 60) // Convert to seconds
    setStep('running')
  }

  const xpEarned = duration // 1 XP per minute

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white">
        <header className="bg-green-900/30 border-b border-green-500/20 p-4 flex items-center gap-4">
          <Link href="/mobile" className="text-2xl">←</Link>
          <h1 className="text-xl font-bold">Phone-Free Block</h1>
        </header>

        <div className="p-6 space-y-6">
          <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-6 space-y-4">
            <div className="text-6xl text-center mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-center">Lock Your Phone Away</h2>
            <p className="text-green-200 text-center">
              Put your phone in a time-locked container. Earn massive XP for phone-free focus time.
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-green-950 to-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="text-8xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold">Block Complete!</h1>
          <p className="text-xl text-green-200">
            You stayed phone-free for {duration} minutes. That's discipline.
          </p>

          <div className="bg-green-900/40 border border-green-500/30 rounded-lg p-6 space-y-3">
            <div className="text-sm text-green-300">Block Completed:</div>
            <div className="font-semibold text-lg">{duration} minutes</div>
            <div className="text-5xl font-bold text-green-400 mt-4">+{xpEarned} XP</div>
          </div>

          <div className="bg-purple-900/40 border border-purple-500/30 rounded-lg p-4 text-sm">
            <div className="font-semibold mb-2">💡 Tip:</div>
            <p className="text-purple-200">
              Stack phone-free blocks daily. Consistency beats intensity.
            </p>
          </div>

          <button
            onClick={() => router.push('/mobile')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return null
}
