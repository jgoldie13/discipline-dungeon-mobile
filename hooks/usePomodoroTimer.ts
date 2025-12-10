import { useState, useEffect } from 'react'

export type PomodoroPhase = 'focus' | 'break' | 'finished' | 'disabled'

export interface UsePomodoroTimerProps {
  startedAt?: Date | string | null
  endedAt?: Date | string | null
  focusMinutes: number
  breakMinutes: number
  enabled: boolean
  totalDurationMin?: number // Total block duration to align cycles
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
  totalDurationMin,
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
  }, [enabled, startedAt, totalDurationMin, focusMinutes, breakMinutes])

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

  // Calculate total block duration in ms
  const totalBlockMs = totalDurationMin ? totalDurationMin * 60 * 1000 : null

  // If block time is up (based on total duration)
  if (totalBlockMs && elapsedMs >= totalBlockMs) {
    return {
      phase: 'finished',
      timeRemainingMs: 0,
      totalCycleMs: cycleMs,
      cycleIndex: Math.floor(totalBlockMs / cycleMs),
      isRunning: false,
      formattedTime: '00:00',
    }
  }

  // Calculate how much time remains in the block
  const blockTimeRemainingMs = totalBlockMs ? totalBlockMs - elapsedMs : Infinity

  // Determine current cycle and position within it
  const currentCycleIndex = Math.floor(elapsedMs / cycleMs)
  const msIntoCurrentCycle = elapsedMs % cycleMs

  // Check if we're in a normal cycle or need to adjust the final cycle
  const isLastCycle = totalBlockMs && (blockTimeRemainingMs <= cycleMs && blockTimeRemainingMs > 0)

  let phase: 'focus' | 'break'
  let timeRemainingMs: number
  let actualCycleMs = cycleMs

  if (isLastCycle) {
    // This is the final cycle - adjust to fit exactly in remaining time
    const finalCycleMs = blockTimeRemainingMs

    // Try to end on a break if possible
    let finalFocusMs: number
    let finalBreakMs: number

    if (finalCycleMs >= breakMs) {
      // We have room for a break at the end
      finalFocusMs = finalCycleMs - breakMs
      finalBreakMs = breakMs
    } else {
      // Not enough time for a break, just focus until end
      finalFocusMs = finalCycleMs
      finalBreakMs = 0
    }

    actualCycleMs = finalCycleMs

    // Determine where we are in this final cycle
    if (msIntoCurrentCycle < finalFocusMs) {
      phase = 'focus'
      timeRemainingMs = finalFocusMs - msIntoCurrentCycle
    } else if (finalBreakMs > 0) {
      phase = 'break'
      timeRemainingMs = finalCycleMs - msIntoCurrentCycle
    } else {
      // Edge case: we're past the focus portion but there's no break
      phase = 'focus'
      timeRemainingMs = Math.max(0, finalCycleMs - msIntoCurrentCycle)
    }
  } else {
    // Normal cycle logic
    if (msIntoCurrentCycle < focusMs) {
      phase = 'focus'
      timeRemainingMs = focusMs - msIntoCurrentCycle
    } else {
      phase = 'break'
      timeRemainingMs = cycleMs - msIntoCurrentCycle
    }
  }

  // Format time as MM:SS
  const totalSeconds = Math.ceil(timeRemainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return {
    phase,
    timeRemainingMs,
    totalCycleMs: actualCycleMs,
    cycleIndex: currentCycleIndex,
    isRunning: true,
    formattedTime,
  }
}
