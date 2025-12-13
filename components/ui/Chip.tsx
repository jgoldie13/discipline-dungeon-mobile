/**
 * Chip - Selectable pill-shaped button (toggle variant of PillBadge)
 * Features: Active/inactive states, semantic colors
 */

import { cn } from './cn'

interface ChipProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  variant?: 'default' | 'positive' | 'warning' | 'negative'
  className?: string
}

const variantStyles = {
  default: {
    active: 'bg-surface-2 text-text border-text/40',
    inactive: 'bg-surface-1 text-muted border-border hover:border-text/20',
  },
  positive: {
    active: 'bg-positive text-white border-positive',
    inactive: 'bg-positive/10 text-positive border-positive/20 hover:border-positive/40',
  },
  warning: {
    active: 'bg-warning text-black border-warning',
    inactive: 'bg-warning/10 text-warning border-warning/20 hover:border-warning/40',
  },
  negative: {
    active: 'bg-negative text-white border-negative',
    inactive: 'bg-negative/10 text-negative border-negative/20 hover:border-negative/40',
  },
}

export function Chip({
  children,
  active = false,
  onClick,
  variant = 'default',
  className,
}: ChipProps) {
  const styles = active ? variantStyles[variant].active : variantStyles[variant].inactive

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center',
        'px-4 py-2',
        'rounded-[--radius-full]',
        'border',
        'text-sm font-medium',
        'transition-all',
        'active:scale-95',
        styles,
        className
      )}
    >
      {children}
    </button>
  )
}
