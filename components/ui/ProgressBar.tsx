import { cn } from './cn'

type ProgressVariant = 'xp' | 'hp' | 'boss'
type ProgressSeverity = 'neutral' | 'warning' | 'negative' | 'positive'

interface ProgressBarProps {
  variant: ProgressVariant
  value: number
  max: number
  label?: string
  meta?: string
  severity?: ProgressSeverity
  className?: string
}

export function ProgressBar({
  variant,
  value,
  max,
  label,
  meta,
  severity,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  // Auto-determine severity based on variant and percentage if not provided
  const effectiveSeverity = severity || getSeverityFromVariant(variant, percentage)

  const barColor = {
    neutral: 'bg-surface-2',
    positive: 'bg-positive',
    warning: 'bg-warning',
    negative: 'bg-negative',
  }[effectiveSeverity]

  const textColor = {
    neutral: 'text-text',
    positive: 'text-positive',
    warning: 'text-warning',
    negative: 'text-negative',
  }[effectiveSeverity]

  return (
    <div className={cn('space-y-2', className)}>
      {(label || meta) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted">{label}</span>}
          {meta && (
            <span className={cn('font-semibold tabular-nums', textColor)}>
              {meta}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <div className="w-full bg-bg rounded-full h-3 overflow-hidden border border-border">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              barColor
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
      </div>
    </div>
  )
}

function getSeverityFromVariant(
  variant: ProgressVariant,
  percentage: number
): ProgressSeverity {
  if (variant === 'hp') {
    if (percentage >= 85) return 'positive'
    if (percentage >= 50) return 'warning'
    return 'negative'
  }

  if (variant === 'boss') {
    if (percentage <= 25) return 'warning'
    return 'negative'
  }

  // XP is neutral by default
  return 'positive'
}
