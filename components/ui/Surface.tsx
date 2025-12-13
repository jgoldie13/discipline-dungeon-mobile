import { cn } from './cn'

type SurfaceElevation = '1' | '2'

interface SurfaceProps {
  title?: string
  subtitle?: string
  rightSlot?: React.ReactNode
  children: React.ReactNode
  elevation?: SurfaceElevation
  className?: string
}

export function Surface({
  title,
  subtitle,
  rightSlot,
  children,
  elevation = '1',
  className,
}: SurfaceProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border p-6',
        elevation === '1' && 'bg-surface-1',
        elevation === '2' && 'bg-surface-2',
        className
      )}
    >
      {(title || subtitle || rightSlot) && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-text">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-muted mt-1">{subtitle}</p>
              )}
            </div>
            {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
          </div>
        </div>
      )}
      <div>{children}</div>
    </div>
  )
}
