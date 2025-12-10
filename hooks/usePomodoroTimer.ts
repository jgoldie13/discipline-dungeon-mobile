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

  // Calculate total block duration
  const totalBlockMs = totalDurationMin ? totalDurationMin * 60 * 1000 : null

  // If we have a total duration, check if we should adjust the final cycle
  let adjustedElapsedMs = elapsedMs
  let isInAdjustedFinalCycle = false

  if (totalBlockMs && !endMs) {
    const timeRemainingInBlockMs = totalBlockMs - elapsedMs

    // If we're in the final cycle and it won't fit a full cycle
    if (timeRemainingInBlockMs < cycleMs && timeRemainingInBlockMs > 0) {
      isInAdjustedFinalCycle = true

      // Calculate how many complete cycles fit before this final cycle
      const completeCycles = Math.floor((totalBlockMs - timeRemainingInBlockMs) / cycleMs)
      const completeCyclesMs = completeCycles * cycleMs

      // Position within the final (adjusted) cycle
      const withinFinalCycleMs = elapsedMs - completeCyclesMs

      // Determine if we should be in focus or break for this final cycle
      // Prioritize ending on a break if possible
      let finalFocusMs: number
      let finalBreakMs: number

      if (timeRemainingInBlockMs >= breakMs) {
        // We have enough time for at least a break
        finalFocusMs = timeRemainingInBlockMs - breakMs
        finalBreakMs = breakMs
      } else {
        // Not enough time for a full break, just do focus until end
        finalFocusMs = timeRemainingInBlockMs
        finalBreakMs = 0
      }

      const finalCycleMs = finalFocusMs + finalBreakMs
      let phase: 'focus' | 'break'
      let timeRemainingMs: number

      if (withinFinalCycleMs < finalFocusMs) {
        phase = 'focus'
        timeRemainingMs = finalFocusMs - withinFinalCycleMs
      } else {
        phase = 'break'
        timeRemainingMs = finalCycleMs - withinFinalCycleMs
      }

      const totalSeconds = Math.ceil(timeRemainingMs / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

      return {
        phase,
        timeRemainingMs,
        totalCycleMs: finalCycleMs,
        cycleIndex: completeCycles,
        isRunning: true,
        formattedTime,
      }
    }

    // If block time is up
    if (elapsedMs >= totalBlockMs) {
      return {
        phase: 'finished',
        timeRemainingMs: 0,
        totalCycleMs: cycleMs,
        cycleIndex: Math.floor(totalBlockMs / cycleMs),
        isRunning: false,
        formattedTime: '00:00',
      }
    }
  }

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

  // Normal cycle logic (not in final adjusted cycle)
  const cycleIndex = Math.floor(adjustedElapsedMs / cycleMs)
  const withinCycleMs = adjustedElapsedMs % cycleMs

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
