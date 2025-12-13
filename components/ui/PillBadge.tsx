/**
 * PillBadge - Small pill-shaped status label (PixelLab style)
 * Features: Compact, rounded-full, semantic color variants
 */

import { cn } from './cn'

interface PillBadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'positive' | 'warning' | 'negative' | 'muted'
  size?: 'sm' | 'md'
  className?: string
}

const variantStyles = {
  default: 'bg-surface-2 text-text border-border',
  positive: 'bg-positive/10 text-positive border-positive/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  negative: 'bg-negative/10 text-negative border-negative/20',
  muted: 'bg-surface-1 text-muted border-border',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function PillBadge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: PillBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center',
        'rounded-[--radius-full]',
        'border',
        'font-medium',
        'whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
