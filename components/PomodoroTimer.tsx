'use client'

import { usePomodoroTimer } from '@/hooks/usePomodoroTimer'
import { cn } from '@/components/ui/cn'

export type PomodoroTimerProps = {
  startedAt?: string | Date | null
  endedAt?: string | Date | null
  enabled: boolean
  focusMinutes?: number
  breakMinutes?: number
  context: 'phone-block' | 'boss'
  totalDurationMin?: number
  now: number // Single time source from parent
}

export function PomodoroTimer({
  startedAt,
  endedAt,
  enabled,
  focusMinutes = 25,
  breakMinutes = 5,
  context,
  totalDurationMin,
  now,
}: PomodoroTimerProps) {
  const { phase, formattedTime, cycleIndex, isRunning } = usePomodoroTimer({
    startedAt,
    endedAt,
    focusMinutes,
    breakMinutes,
    enabled,
    totalDurationMin,
    now,
  })

  if (phase === 'disabled') {
    return null
  }

  if (phase === 'finished') {
    return (
      <div className="glass-panel rounded-lg p-4 text-center border border-gold/40">
        <div className="text-sm text-dd-muted">Pomodoro Complete</div>
        <div className="text-2xl font-bold text-gold mt-2">✓ Session Finished</div>
      </div>
    )
  }

  // Color scheme based on phase and context
  const isFocus = phase === 'focus'
  const isBoss = context === 'boss'
  const frameTone = isFocus
    ? isBoss
      ? 'border-blood/40'
      : 'border-mana-border'
    : 'border-gold/40'
  const textTone = isFocus
    ? isBoss
      ? 'text-blood'
      : 'text-mana'
    : 'text-gold'
  const accentTone = textTone
  const barColor = isFocus
    ? isBoss
      ? 'bg-blood'
      : 'bg-mana'
    : 'bg-gold'
  const barGlow = isFocus
    ? isBoss
      ? 'shadow-[0_0_12px_rgba(244,63,94,0.45)]'
      : 'shadow-[0_0_12px_rgba(34,211,238,0.45)]'
    : 'shadow-[0_0_12px_rgba(245,158,11,0.45)]'

  const phaseLabel = isFocus ? '🎯 Focus' : '☕ Break'
  const phaseEmoji = isFocus ? '⚡' : '🌙'

  return (
    <div className={cn('glass-panel rounded-lg p-6 space-y-3', frameTone)}>
      {/* Phase indicator */}
      <div className="flex items-center justify-between">
        <div className={cn('text-sm font-semibold', textTone)}>
          {phaseLabel} • Cycle {cycleIndex + 1}
        </div>
        <div className="text-2xl">{phaseEmoji}</div>
      </div>

      {/* Countdown */}
      <div className={cn('text-6xl font-bold tabular-nums text-center', accentTone)}>
        {formattedTime}
      </div>

      {/* Progress info */}
      <div className="text-xs text-dd-muted text-center">
        {isFocus
          ? `${focusMinutes} min focus session`
          : `${breakMinutes} min break`}
      </div>

      {/* Visual progress bar */}
      <div className="w-full bg-dd-surface/60 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-1000', barColor, barGlow)}
          style={{
            width: `${isRunning ? 100 : 0}%`,
            animation: isRunning ? 'pulse 2s ease-in-out infinite' : 'none',
          }}
        />
      </div>

      {/* Tip */}
      {isFocus && (
        <div className="text-xs text-dd-muted text-center mt-2 opacity-70">
          Stay focused. Phone away.
        </div>
      )}
      {!isFocus && (
        <div className="text-xs text-dd-muted text-center mt-2 opacity-70">
          Take a break. Stretch, hydrate, rest eyes.
        </div>
      )}
    </div>
  )
}
