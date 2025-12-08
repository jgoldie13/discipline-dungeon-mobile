import { useState, useEffect } from 'react'

export type PomodoroPhase = 'focus' | 'break' | 'finished' | 'disabled'

export interface UsePomodoroTimerProps {
  startedAt?: Date | string | null
  endedAt?: Date | string | null
  focusMinutes: number
  breakMinutes: number
  enabled: boolean
}

export interface UsePomodoroTimerResult {
  phase: PomodoroPhase
  timeRemainingMs: number
  totalCycleMs: number
  cycleIndex: number
  isRunning: boolean
  formattedTime: string
}

export function usePomodoroTimer({
  startedAt,
  endedAt,
  focusMinutes,
  breakMinutes,
  enabled,
}: UsePomodoroTimerProps): UsePomodoroTimerResult {
  const [now, setNow] = useState<number>(Date.now())

  // Update "now" every second
  useEffect(() => {
    if (!enabled || !startedAt) {
      return
    }

    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [enabled, startedAt])

  // If disabled or not started, return disabled state
  if (!enabled || !startedAt) {
    return {
      phase: 'disabled',
      timeRemainingMs: 0,
      totalCycleMs: 0,
      cycleIndex: 0,
      isRunning: false,
      formattedTime: '00:00',
    }
  }

  const startMs = new Date(startedAt).getTime()
  const endMs = endedAt ? new Date(endedAt).getTime() : null

  // Convert minutes to milliseconds
  const focusMs = focusMinutes * 60 * 1000
  const breakMs = breakMinutes * 60 * 1000
  const cycleMs = focusMs + breakMs

  // Calculate elapsed time
  const elapsedMs = Math.max(0, now - startMs)

  // If session has ended
  if (endMs && now >= endMs) {
    return {
      phase: 'finished',
      timeRemainingMs: 0,
      totalCycleMs: cycleMs,
      cycleIndex: Math.floor(elapsedMs / cycleMs),
      isRunning: false,
      formattedTime: '00:00',
    }
  }

  // Calculate current cycle
  const cycleIndex = Math.floor(elapsedMs / cycleMs)
  const withinCycleMs = elapsedMs % cycleMs

  let phase: 'focus' | 'break'
  let timeRemainingMs: number

  if (withinCycleMs < focusMs) {
    // Currently in focus phase
    phase = 'focus'
    timeRemainingMs = focusMs - withinCycleMs
  } else {
    // Currently in break phase
    phase = 'break'
    timeRemainingMs = cycleMs - withinCycleMs
  }

  // Format time as MM:SS
  const totalSeconds = Math.ceil(timeRemainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return {
    phase,
    timeRemainingMs,
    totalCycleMs: cycleMs,
    cycleIndex,
    isRunning: true,
    formattedTime,
  }
}
