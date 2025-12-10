import { useMemo } from 'react'

export type PomodoroPhase = 'focus' | 'break' | 'finished' | 'disabled'

export interface UsePomodoroTimerProps {
  startedAt?: Date | string | null
  endedAt?: Date | string | null
  focusMinutes: number
  breakMinutes: number
  enabled: boolean
  totalDurationMin?: number // Total block duration to align cycles
  now: number // Single time source from parent
}

export interface UsePomodoroTimerResult {
  phase: PomodoroPhase
  timeRemainingMs: number
  totalCycleMs: number
  cycleIndex: number
  isRunning: boolean
  formattedTime: string
}

function toMs(dateLike?: Date | string | null): number | null {
  if (!dateLike) return null
  const d = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function usePomodoroTimer(
  props: UsePomodoroTimerProps,
): UsePomodoroTimerResult {
  const {
    startedAt,
    endedAt,
    focusMinutes,
    breakMinutes,
    enabled,
    totalDurationMin,
    now,
  } = props

  return useMemo<UsePomodoroTimerResult>(() => {
    const focusMs = focusMinutes * 60_000
    const breakMs = breakMinutes * 60_000
    const cycleMs = focusMs + breakMs

    // Disabled / not started
    const startMs = toMs(startedAt)
    if (!enabled || !startMs) {
      return {
        phase: 'disabled',
        timeRemainingMs: 0,
        totalCycleMs: cycleMs,
        cycleIndex: 0,
        isRunning: false,
        formattedTime: formatMs(0),
      }
    }

    const endMs = toMs(endedAt)
    const totalBlockMs =
      totalDurationMin != null ? totalDurationMin * 60_000 : null

    // Raw elapsed since start
    const rawElapsed = Math.max(0, now - startMs)

    // Clamp elapsed to whichever "end" we know about
    let elapsed = rawElapsed
    if (endMs != null) {
      elapsed = Math.min(elapsed, endMs - startMs)
    } else if (totalBlockMs != null) {
      elapsed = Math.min(elapsed, totalBlockMs)
    }

    const finished =
      (endMs != null && rawElapsed >= endMs - startMs) ||
      (endMs == null && totalBlockMs != null && rawElapsed >= totalBlockMs)

    if (finished) {
      return {
        phase: 'finished',
        timeRemainingMs: 0,
        totalCycleMs: cycleMs,
        cycleIndex: Math.max(0, Math.floor((elapsed - 1) / cycleMs)),
        isRunning: false,
        formattedTime: formatMs(0),
      }
    }

    // Core alignment logic: cycles of focus+break modulo elapsed time
    const cycleIndex = Math.floor(elapsed / cycleMs)
    const timeIntoCycle = elapsed % cycleMs

    let phase: PomodoroPhase
    let timeRemainingMs: number

    if (timeIntoCycle < focusMs) {
      phase = 'focus'
      timeRemainingMs = focusMs - timeIntoCycle
    } else {
      phase = 'break'
      timeRemainingMs = cycleMs - timeIntoCycle
    }

    return {
      phase,
      timeRemainingMs,
      totalCycleMs: cycleMs,
      cycleIndex,
      isRunning: true,
      formattedTime: formatMs(timeRemainingMs),
    }
  }, [
    startedAt,
    endedAt,
    focusMinutes,
    breakMinutes,
    enabled,
    totalDurationMin,
    now,
  ])
}
