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
        'glass-panel rounded-2xl p-6',
        elevation === '1' && 'bg-slate-900/60',
        elevation === '2' && 'bg-slate-900/80',
        className
      )}
    >
      {(title || subtitle || rightSlot) && (
        <div className="mb-4 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-serif uppercase tracking-widest text-mana">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
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
