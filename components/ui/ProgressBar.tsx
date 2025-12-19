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

  const usesMana = variant === 'xp'
  const usesBlood = variant === 'hp' || variant === 'boss'

  const barColor = usesMana
    ? 'bg-mana'
    : usesBlood
      ? 'bg-blood'
      : {
          neutral: 'bg-dd-surface/70',
          positive: 'bg-mana',
          warning: 'bg-gold',
          negative: 'bg-blood',
        }[effectiveSeverity]

  const barGlow = usesMana
    ? 'shadow-[0_0_12px_rgba(34,211,238,0.45)]'
    : usesBlood
      ? 'shadow-[0_0_12px_rgba(244,63,94,0.45)]'
      : ''

  const textColor = usesMana
    ? 'text-mana'
    : usesBlood
      ? 'text-blood'
      : {
          neutral: 'text-dd-text',
          positive: 'text-mana',
          warning: 'text-gold',
          negative: 'text-blood',
        }[effectiveSeverity]

  return (
    <div className={cn('space-y-2', className)}>
      {(label || meta) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-dd-muted">{label}</span>}
          {meta && (
            <span className={cn('font-semibold tabular-nums', textColor)}>
              {meta}
            </span>
          )}
        </div>
      )}

      <div className="relative">
      <div className="w-full bg-dd-surface/50 rounded-full h-3 overflow-hidden border border-dd-border/50">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out',
              barColor,
              barGlow
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
