'use client'

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PomodoroTimer } from '@/components/PomodoroTimer'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { BottomCTA } from '@/components/ui/BottomCTA'
import { useUserSettings } from '@/lib/settings/useUserSettings'
import { createEngine } from '@/lib/policy/PolicyEngine'
import { useToast } from '@/components/ui/Toast'

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240]

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

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
  const { settings, isLoading: settingsLoading } = useUserSettings()
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

  const engine = useMemo(() => (settings ? createEngine(settings) : null), [settings])

  const durationOptions = useMemo(() => {
    if (!engine) return DURATION_PRESETS
    const { min, max, default: defaultMin } = engine.getBlockDurationOptions()
    const filtered = DURATION_PRESETS.filter((value) => value >= min && value <= max)
    if (filtered.length === 0) return [defaultMin]
    return filtered
  }, [engine])

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
        const errText = await response.text()
        pushToast({
          title: 'Block not saved',
          description: errText || 'Duration may be outside allowed range.',
          variant: 'danger',
        })
        setStep('setup')
      }
    } catch (error) {
      console.error('Error saving phone-free block:', error)
      pushToast({ title: 'Error saving block', description: 'Please try again.', variant: 'danger' })
      setStep('setup')
    }
  }, [startTime, usePomodoro, pomodoroPreset, customFocusMin, customBreakMin, duration, bossInfo, attackBoss, pushToast])

  useEffect(() => {
    const bossId = searchParams.get('bossId')
    if (bossId) {
      fetchBossInfo(bossId)
    }

    const preset = searchParams.get('preset')
    if (preset) {
      const presetVal = parseInt(preset)
      if (durationOptions.includes(presetVal)) {
        setDuration(presetVal)
      }
    }
  }, [searchParams, fetchBossInfo, durationOptions])

  // Set default duration when settings load
  useEffect(() => {
    if (engine) {
      const defaults = engine.getBlockDurationOptions()
      const nextDuration = durationOptions.includes(defaults.default)
        ? defaults.default
        : durationOptions[0] ?? defaults.default
      setDuration(nextDuration)
    }
  }, [engine, durationOptions])

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
    if (settingsLoading && !engine) return
    if (engine) {
      const { min, max } = engine.getBlockDurationOptions()
      if (duration < min || duration > max) {
        pushToast({
          title: 'Duration not allowed',
          description: `Choose between ${min} and ${max} minutes`,
          variant: 'warning',
        })
        return
      }
    }
    const currentTime = new Date()
    setStartTime(currentTime)
    setNow(Date.now())
    setStep('running')
  }

  const xpResult = engine?.calculateBlockXp(duration, { isBossBlock: !!bossInfo }) || {
    baseXp: duration,
    verifiedBonus: 0,
    bossBonus: 0,
    totalXp: duration,
  }
  const xpEarned = xpResult.totalXp
  const xpPerHour = duration > 0 ? Math.round((xpEarned / duration) * 60) : xpEarned

  if (settingsLoading && !settings) {
    return (
      <div className="min-h-dvh bg-transparent text-dd-text flex items-center justify-center">
        <p className="text-dd-muted">Loading block settings...</p>
      </div>
    )
  }

  if (step === 'setup') {
    return (
      <div className="min-h-dvh bg-transparent text-dd-text overflow-x-hidden">
        <header className="glass-panel rounded-none p-4 flex items-center gap-3">
          <Link
            href={bossInfo ? `/boss/${bossInfo.id}` : '/mobile'}
            className="text-2xl shrink-0 text-dd-text hover:text-mana"
          >
            ←
          </Link>
          <h1 className="text-base sm:text-lg md:text-xl font-serif uppercase tracking-widest text-mana truncate">
            {bossInfo ? 'Attack Boss' : 'Phone-Free Block'}
          </h1>
        </header>

        <div className="p-4 sm:p-6 pb-32 md:pb-8 space-y-4 sm:space-y-6 max-w-full">
          {bossInfo && (
            <Card elevation="2" className="glass-panel border-blood/40">
              <div className="space-y-3">
                <div className="text-sm text-blood font-semibold">Boss Battle</div>
                <div className="text-2xl font-bold text-dd-text">{bossInfo.title}</div>
                <ProgressBar
                  variant="boss"
                  value={bossInfo.bossHpRemaining}
                  max={bossInfo.bossHp}
                  label="Boss HP"
                  meta={`${bossInfo.bossHpRemaining} / ${bossInfo.bossHp}`}
                />
                <div className="text-xs text-dd-muted">
                  Each minute of focused work = 1 damage to boss
                </div>
              </div>
            </Card>
          )}

          <Card className="glass-panel p-6">
            <div className="text-center space-y-3">
              <h2 className="text-base sm:text-xl md:text-2xl font-serif uppercase tracking-wide sm:tracking-widest text-mana leading-tight">
                {bossInfo ? 'Attack with Focus' : 'Lock Phone'}
              </h2>
              <p className="text-dd-text text-xs sm:text-sm md:text-base">
                {bossInfo
                  ? 'Put your phone away and focus. Deal damage to the boss with deep work.'
                  : 'Put your phone in a time-locked container. Earn XP for phone-free focus time.'
                }
              </p>
            </div>
          </Card>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-dd-text font-medium mb-2">Duration (minutes)</label>
              <div className="grid grid-cols-4 gap-2">
                {durationOptions.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuration(min)}
                    className={`px-3 py-2 rounded-[--radius-lg] border text-xs sm:text-sm font-semibold transition-all duration-150 ${
                      duration === min
                        ? 'bg-mana/20 text-mana border-mana/50 glow-blue'
                        : 'bg-dd-surface/60 text-dd-text border-dd-border/60 hover:border-gold/50 hover:text-mana'
                    }`}
                    aria-pressed={duration === min}
                  >
                    {formatDurationLabel(min)}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-dd-border/50 pt-4">
              <div className="flex items-center justify-between mb-3">
                <Switch
                  checked={usePomodoro}
                  onChange={setUsePomodoro}
                  label="Pomodoro Timer"
                />
              </div>

              {usePomodoro && (
                <div className="space-y-3">
                  <div className="text-xs text-dd-muted mb-2">
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
                        <label className="block text-xs text-dd-muted mb-1">Focus (min)</label>
                        <input
                          type="number"
                          value={customFocusMin}
                          onChange={(e) => setCustomFocusMin(parseInt(e.target.value) || 25)}
                          min="1"
                          max="120"
                          className="dd-input px-3 py-2"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-dd-muted mb-1">Break (min)</label>
                        <input
                          type="number"
                          value={customBreakMin}
                          onChange={(e) => setCustomBreakMin(parseInt(e.target.value) || 5)}
                          min="1"
                          max="60"
                          className="dd-input px-3 py-2"
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-dd-muted bg-dd-surface/80 border border-dd-border/50 rounded p-2">
                    {pomodoroPreset === '25/5' && '25 min focus, 5 min break (classic)'}
                    {pomodoroPreset === '50/10' && '50 min focus, 10 min break (deep work)'}
                    {pomodoroPreset === 'custom' && `${customFocusMin} min focus, ${customBreakMin} min break`}
                  </div>
                </div>
              )}
            </div>

            <Card className="scroll-card p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-dd-text">Duration:</span>
                  <span className="font-semibold text-dd-text tabular-nums">
                    {formatDurationLabel(duration)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-dd-text">XP Reward:</span>
                  <span className="font-bold text-mana tabular-nums">+{xpEarned} XP</span>
                </div>
                <div className="flex justify-between items-center gap-3">
                  <span className="text-dd-text">XP per hour:</span>
                  <span className="font-semibold text-mana tabular-nums">{xpPerHour} XP</span>
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
              Start {formatDurationLabel(duration)} Block
            </Button>
          </BottomCTA>
        </div>
      </div>
    )
  }

  if (step === 'running') {
    const minutes = Math.floor(timeLeft / 60)
    const seconds = timeLeft % 60

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
      <div className="min-h-dvh bg-transparent text-dd-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-3xl font-serif uppercase tracking-widest text-blood">
            Phone-Free Block Active
          </h1>
          <p className="text-dd-muted">
            Your phone should be locked away. Stay focused.
          </p>

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

          <div className="glass-panel border-blood/40 rounded-2xl p-12 my-8">
            <div className="text-7xl font-bold tabular-nums text-blood">
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
            <div className="text-dd-muted text-sm mt-2">block time remaining</div>
          </div>

          <ProgressBar
            variant="hp"
            value={duration * 60 - timeLeft}
            max={duration * 60}
            className="my-4"
          />

          <Card className="glass-panel border-blood/30 p-4">
            <div className="text-sm text-dd-muted">You are earning</div>
            <div className="text-4xl font-bold text-blood tabular-nums">+{xpEarned} XP</div>
            <div className="text-xs text-dd-muted">when this block completes</div>
          </Card>

          <p className="text-sm text-dd-muted">
            Can&apos;t access this app right now? That&apos;s the point. Your phone should be locked away.
          </p>

          <button
            onClick={() => {
              if (startTime) {
                setNow(startTime.getTime() + duration * 60 * 1000)
              }
            }}
            className="text-xs text-dd-muted hover:text-dd-text underline mt-4"
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
      <div className="min-h-dvh bg-transparent text-dd-text flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl font-serif uppercase tracking-widest text-blood">
            {defeated ? 'BOSS DEFEATED' : 'Block Complete'}
          </h1>
          <p className="text-xl text-dd-muted">
            You stayed phone-free for {duration} minutes. That&apos;s discipline.
          </p>

          {bossAttackResult && (
            <Card elevation="2" className="glass-panel border-blood/40">
              <div className="space-y-3">
                <div className="text-sm text-blood">Boss Attack</div>
                <div className="font-bold text-2xl text-dd-text">{bossInfo?.title}</div>
                <div className="text-4xl font-bold text-blood tabular-nums">
                  {bossAttackResult.damage} damage dealt
                </div>
                {defeated && (
                  <div className="scroll-card border border-gold/30 p-3 mt-3">
                    <div className="text-gold font-semibold">Boss Defeated</div>
                    <div className="text-3xl font-bold text-gold tabular-nums mt-2">
                      +{bossAttackResult.xpEarned} XP
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {!defeated && (
            <Card className="scroll-card">
              <div className="space-y-3">
                <div className="text-sm text-dd-muted">Block Completed</div>
                <div className="font-semibold text-lg text-dd-text tabular-nums">{duration} minutes</div>
                <div className="text-5xl font-bold text-mana tabular-nums">+{xpEarned} XP</div>
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
      <div className="min-h-dvh bg-transparent text-dd-text flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    }>
      <PhoneFreeBlockContent />
    </Suspense>
  )
}
