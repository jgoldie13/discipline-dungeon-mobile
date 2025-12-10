'use client'

import { usePomodoroTimer } from '@/hooks/usePomodoroTimer'

export type PomodoroTimerProps = {
  startedAt?: string | Date | null
  endedAt?: string | Date | null
  enabled: boolean
  focusMinutes?: number
  breakMinutes?: number
  context: 'phone-block' | 'boss'
  totalDurationMin?: number
}

export function PomodoroTimer({
  startedAt,
  endedAt,
  enabled,
  focusMinutes = 25,
  breakMinutes = 5,
  context,
  totalDurationMin,
}: PomodoroTimerProps) {
  const { phase, formattedTime, cycleIndex, isRunning } = usePomodoroTimer({
    startedAt,
    endedAt,
    focusMinutes,
    breakMinutes,
    enabled,
    totalDurationMin,
  })

  if (phase === 'disabled') {
    return null
  }

  if (phase === 'finished') {
    return (
      <div className="bg-gray-900/40 border border-gray-500/30 rounded-lg p-4 text-center">
        <div className="text-sm text-gray-400">Pomodoro Complete</div>
        <div className="text-2xl font-bold text-gray-300 mt-2">✓ Session Finished</div>
      </div>
    )
  }

  // Color scheme based on phase and context
  const isFocus = phase === 'focus'
  const contextColor = context === 'boss' ? 'red' : 'green'

  const bgColor = isFocus
    ? `bg-${contextColor}-900/40`
    : 'bg-blue-900/40'

  const borderColor = isFocus
    ? `border-${contextColor}-500/30`
    : 'border-blue-500/30'

  const textColor = isFocus
    ? `text-${contextColor}-100`
    : 'text-blue-100'

  const accentColor = isFocus
    ? `text-${contextColor}-400`
    : 'text-blue-400'

  const phaseLabel = isFocus ? '🎯 Focus' : '☕ Break'
  const phaseEmoji = isFocus ? '⚡' : '🌙'

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-6 space-y-3`}>
      {/* Phase indicator */}
      <div className="flex items-center justify-between">
        <div className={`text-sm font-semibold ${textColor}`}>
          {phaseLabel} • Cycle {cycleIndex + 1}
        </div>
        <div className="text-2xl">{phaseEmoji}</div>
      </div>

      {/* Countdown */}
      <div className={`text-6xl font-bold tabular-nums ${accentColor} text-center`}>
        {formattedTime}
      </div>

      {/* Progress info */}
      <div className={`text-xs ${textColor} text-center`}>
        {isFocus
          ? `${focusMinutes} min focus session`
          : `${breakMinutes} min break`}
      </div>

      {/* Visual progress bar */}
      <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            isFocus ? `bg-${contextColor}-500` : 'bg-blue-500'
          }`}
          style={{
            width: `${isRunning ? 100 : 0}%`,
            animation: isRunning ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Tip */}
      {isFocus && (
        <div className={`text-xs ${textColor} text-center mt-2 opacity-70`}>
          Stay focused. Phone away.
        </div>
      )}
      {!isFocus && (
        <div className={`text-xs ${textColor} text-center mt-2 opacity-70`}>
          Take a break. Stretch, hydrate, rest eyes.
        </div>
      )}
    </div>
  )
}
