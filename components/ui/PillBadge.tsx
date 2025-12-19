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
  default: 'bg-dd-surface/70 text-dd-text border-dd-border/60',
  positive: 'bg-mana/10 text-mana border-mana-border',
  warning: 'bg-gold/10 text-gold border-gold/40',
  negative: 'bg-blood/10 text-blood border-blood/40',
  muted: 'bg-dd-surface/50 text-dd-muted border-dd-border/50',
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
