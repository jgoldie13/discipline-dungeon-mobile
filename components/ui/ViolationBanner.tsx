import { cn } from './cn'

type ViolationSeverity = 'warning' | 'negative'

interface ViolationBannerProps {
  title: string
  details: string
  timestamp?: Date | string
  severity?: ViolationSeverity
  className?: string
}

export function ViolationBanner({
  title,
  details,
  timestamp,
  severity = 'negative',
  className,
}: ViolationBannerProps) {
  const severityStyles = {
    warning: {
      border: 'border-warning',
      bg: 'bg-yellow-950/40',
      titleColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    negative: {
      border: 'border-negative',
      bg: 'bg-red-950/40',
      titleColor: 'text-negative',
      iconBg: 'bg-negative/10',
    },
  }

  const styles = severityStyles[severity]

  const icon = severity === 'warning' ? '⚠️' : '✕'

  const formattedTimestamp = timestamp
    ? typeof timestamp === 'string'
      ? new Date(timestamp).toLocaleString()
      : timestamp.toLocaleString()
    : null

  return (
    <div
      className={cn(
        'rounded-2xl border-2 p-6 shadow-lg',
        styles.border,
        styles.bg,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex gap-4">
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
            styles.iconBg
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-bold text-lg mb-2', styles.titleColor)}>
            {title}
          </h4>
          <p className="text-text text-sm leading-relaxed mb-2">{details}</p>
          {formattedTimestamp && (
            <p className="text-muted text-xs tabular-nums">
              {formattedTimestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
