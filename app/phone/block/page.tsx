'use client'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PomodoroTimer } from '@/components/PomodoroTimer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Chip } from '@/components/ui/Chip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { BottomCTA } from '@/components/ui/BottomCTA'
import { useToast } from '@/components/ui/Toast'

interface BossInfo {
  id: string
  title: string
  bossHpRemaining: number
  bossHp: number
}

function PhoneFreeBlockContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pushToast = useToast()
  const [step, setStep] = useState<'setup' | 'running' | 'complete'>('setup')
  const [duration, setDuration] = useState(60)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [now, setNow] = useState(0)
  const [bossInfo, setBossInfo] = useState<BossInfo | null>(null)
  const [bossAttackResult, setBossAttackResult] = useState<{
    damage: number
    defeated: boolean
    xpEarned: number
    message: string
  } | null>(null)

  const [usePomodoro, setUsePomodoro] = useState(false)
  const [pomodoroPreset, setPomodoroPreset] = useState<'25/5' | '50/10' | 'custom'>('25/5')
  const [customFocusMin, setCustomFocusMin] = useState(25)
  const [customBreakMin, setCustomBreakMin] = useState(5)

  const fetchBossInfo = useCallback(async (bossId: string) => {
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
  }, [])

  const attackBoss = useCallback(async (blockId: string) => {
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
  }, [bossInfo])

  const saveBlock = useCallback(async () => {
    if (!startTime) return

    try {
      const endTime = new Date()

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

        if (bossInfo) {
          await attackBoss(data.block.id)
        }

        pushToast({
          title: 'Block complete',
          description: `+${data.xpEarned} XP${data.buildPoints ? `, +${data.buildPoints} build pts` : ''}`,
          variant: 'success',
          actionLabel: 'View Build',
          onAction: () => (window.location.href = '/build'),
        })
        setStep('complete')
      } else {
        console.error('Failed to save phone-free block')
        pushToast({ title: 'Error saving block', description: 'Please try again.', variant: 'danger' })
        setStep('complete')
      }
    } catch (error) {
      console.error('Error saving phone-free block:', error)
      pushToast({ title: 'Error saving block', description: 'Please try again.', variant: 'danger' })
      setStep('complete')
    }
  }, [startTime, usePomodoro, pomodoroPreset, customFocusMin, customBreakMin, duration, bossInfo, attackBoss, pushToast])

  useEffect(() => {
    const bossId = searchParams.get('bossId')
    if (bossId) {
      fetchBossInfo(bossId)
    }
  }, [searchParams, fetchBossInfo])

  useEffect(() => {
    if (step !== 'running') return

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [step])

  const timeLeft = startTime
    ? Math.max(0, Math.floor((startTime.getTime() + duration * 60 * 1000 - now) / 1000))
    : 0

  useEffect(() => {
    if (step === 'running' && timeLeft === 0 && startTime) {
      saveBlock()
    }
  }, [step, timeLeft, startTime, saveBlock])

  const handleStart = () => {
    const currentTime = new Date()
    setStartTime(currentTime)
    setNow(Date.now())
    setStep('running')
  }

  const xpEarned = duration

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-bg text-text">
        <header className="bg-surface-1 border-b border-border p-4 flex items-center gap-4">
          <Link href={bossInfo ? `/boss/${bossInfo.id}` : '/mobile'} className="text-2xl">
            ←
          </Link>
          <h1 className="text-xl font-bold">
            {bossInfo ? 'Attack Boss' : 'Phone-Free Block'}
          </h1>
        </header>

        <div className="p-6 space-y-6">
          {bossInfo && (
            <Card elevation="2" className="border-negative">
              <div className="space-y-3">
                <div className="text-sm text-negative font-semibold">Boss Battle</div>
                <div className="text-2xl font-bold text-text">{bossInfo.title}</div>
                <ProgressBar
                  variant="boss"
                  value={bossInfo.bossHpRemaining}
                  max={bossInfo.bossHp}
                  label="Boss HP"
                  meta={`${bossInfo.bossHpRemaining} / ${bossInfo.bossHp}`}
                />
                <div className="text-xs text-muted">
                  Each minute of focused work = 1 damage to boss
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-text">
                {bossInfo ? 'Attack with Focus' : 'Lock Your Phone Away'}
              </h2>
              <p className="text-muted">
                {bossInfo
                  ? 'Put your phone away and focus. Deal damage to the boss with deep work.'
                  : 'Put your phone in a time-locked container. Earn XP for phone-free focus time.'
                }
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-2">Duration (minutes)</label>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90, 120, 180, 240].map((min) => (
                  <Chip
                    key={min}
                    active={duration === min}
                    onClick={() => setDuration(min)}
                    className="w-full justify-center"
                  >
                    {min}m
                  </Chip>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <Switch
                  checked={usePomodoro}
                  onChange={setUsePomodoro}
                  label="Pomodoro Timer"
                />
              </div>

              {usePomodoro && (
                <div className="space-y-3">
                  <div className="text-xs text-muted mb-2">
                    Alternate between focus and break intervals
                  </div>
                  <SegmentedControl
                    options={[
                      { value: '25/5', label: '25 / 5' },
                      { value: '50/10', label: '50 / 10' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                    value={pomodoroPreset}
                    onChange={(val) => setPomodoroPreset(val as '25/5' | '50/10' | 'custom')}
                    className="w-full"
                  />

                  {pomodoroPreset === 'custom' && (
                    <div className="flex gap-3 mt-3">
                      <div className="flex-1">
                        <label className="block text-xs text-muted mb-1">Focus (min)</label>
                        <input
                          type="number"
                          value={customFocusMin}
                          onChange={(e) => setCustomFocusMin(parseInt(e.target.value) || 25)}
                          min="1"
                          max="120"
                          className="w-full bg-bg border border-border rounded px-3 py-2 text-text"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted mb-1">Break (min)</label>
                        <input
                          type="number"
                          value={customBreakMin}
                          onChange={(e) => setCustomBreakMin(parseInt(e.target.value) || 5)}
                          min="1"
                          max="60"
                          className="w-full bg-bg border border-border rounded px-3 py-2 text-text"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted bg-surface-1 rounded p-2">
                    {pomodoroPreset === '25/5' && '25 min focus, 5 min break (classic)'}
                    {pomodoroPreset === '50/10' && '50 min focus, 10 min break (deep work)'}
                    {pomodoroPreset === 'custom' && `${customFocusMin} min focus, ${customBreakMin} min break`}
                  </div>
                </div>
              )}
            </div>

            <Card className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Duration:</span>
                  <span className="font-semibold text-text tabular-nums">{duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">XP Reward:</span>
                  <span className="font-bold text-positive tabular-nums">+{xpEarned} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">XP per hour:</span>
                  <span className="font-semibold text-positive tabular-nums">60 XP</span>
                </div>
              </div>
            </Card>
          </div>

          <BottomCTA>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStart}
            >
              Start {duration}-Minute Block
            </Button>
          </BottomCTA>
        </div>
      </div>
    )
  }

  if (step === 'running') {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60
    const progress = ((duration * 60 - timeLeft) / (duration * 60)) * 100

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
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-3xl font-bold">Phone-Free Block Active</h1>
          <p className="text-muted">Your phone should be locked away. Stay focused.</p>

          {usePomodoro && startTime && (
            <div className="my-6">
              <PomodoroTimer
                context={bossInfo ? 'boss' : 'phone-block'}
                startedAt={startTime}
                endedAt={null}
                enabled={pomodoro.enabled}
                focusMinutes={pomodoro.focusMin}
                breakMinutes={pomodoro.breakMin}
                totalDurationMin={duration}
                now={now}
              />
            </div>
          )}

          <div className="bg-surface-1 border border-border rounded-2xl p-12 my-8">
            <div className="text-7xl font-bold tabular-nums text-text">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-muted text-sm mt-2">block time remaining</div>
          </div>

          <ProgressBar
            variant="xp"
            value={duration * 60 - timeLeft}
            max={duration * 60}
            className="my-4"
          />

          <Card className="p-4">
            <div className="text-sm text-muted">You are earning</div>
            <div className="text-4xl font-bold text-positive tabular-nums">+{xpEarned} XP</div>
            <div className="text-xs text-muted">when this block completes</div>
          </Card>

          <p className="text-sm text-muted">
            Can&apos;t access this app right now? That&apos;s the point. Your phone should be locked away.
          </p>

          <button
            onClick={() => {
              if (startTime) {
                setNow(startTime.getTime() + duration * 60 * 1000)
              }
            }}
            className="text-xs text-muted hover:text-text underline mt-4"
          >
            (Skip timer for testing)
          </button>
        </div>
      </div>
    )
  }

  if (step === 'complete') {
    const defeated = bossAttackResult?.defeated || false

    return (
      <div className="min-h-screen bg-bg text-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl font-bold">{defeated ? 'BOSS DEFEATED' : 'Block Complete'}</h1>
          <p className="text-xl text-muted">
            You stayed phone-free for {duration} minutes. That&apos;s discipline.
          </p>

          {bossAttackResult && (
            <Card elevation="2" className="border-negative">
              <div className="space-y-3">
                <div className="text-sm text-negative">Boss Attack</div>
                <div className="font-bold text-2xl text-text">{bossInfo?.title}</div>
                <div className="text-4xl font-bold text-negative tabular-nums">
                  {bossAttackResult.damage} damage dealt
                </div>
                {defeated && (
                  <div className="bg-warning/10 border border-warning rounded-lg p-3 mt-3">
                    <div className="text-warning font-semibold">Boss Defeated</div>
                    <div className="text-3xl font-bold text-warning tabular-nums mt-2">
                      +{bossAttackResult.xpEarned} XP
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {!defeated && (
            <Card>
              <div className="space-y-3">
                <div className="text-sm text-muted">Block Completed</div>
                <div className="font-semibold text-lg text-text tabular-nums">{duration} minutes</div>
                <div className="text-5xl font-bold text-positive tabular-nums">+{xpEarned} XP</div>
              </div>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push(bossInfo ? `/boss/${bossInfo.id}` : '/mobile')}
          >
            {bossInfo ? (defeated ? 'View Boss Details' : 'Continue Battle') : 'Back to Home'}
          </Button>
        </div>
      </div>
    )
  }

  return null
}

export default function PhoneFreeBlockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg text-text flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <PhoneFreeBlockContent />
    </Suspense>
  )
}
