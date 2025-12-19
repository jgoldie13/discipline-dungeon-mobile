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
      border: 'border-gold/40',
      bg: 'bg-slate-900/70',
      titleColor: 'text-gold',
      iconBg: 'bg-gold/10',
    },
    negative: {
      border: 'border-blood/50',
      bg: 'bg-slate-900/70',
      titleColor: 'text-blood',
      iconBg: 'bg-blood/10',
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
        'glass-panel rounded-2xl border-2 p-6 shadow-lg',
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
          <p className="text-slate-200 text-sm leading-relaxed mb-2">{details}</p>
          {formattedTimestamp && (
            <p className="text-slate-400 text-xs tabular-nums">
              {formattedTimestamp}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
