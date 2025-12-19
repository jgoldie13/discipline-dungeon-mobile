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
    active: 'bg-mana/20 text-mana border-mana/40',
    inactive: 'bg-dd-surface/60 text-dd-muted border-dd-border/60 hover:border-mana/40',
  },
  positive: {
    active: 'bg-mana/20 text-mana border-mana/40',
    inactive: 'bg-mana/10 text-mana border-mana/20 hover:border-mana/40',
  },
  warning: {
    active: 'bg-gold/20 text-gold border-gold/40',
    inactive: 'bg-gold/10 text-gold border-gold/20 hover:border-gold/40',
  },
  negative: {
    active: 'bg-blood/20 text-blood border-blood/40',
    inactive: 'bg-blood/10 text-blood border-blood/20 hover:border-blood/40',
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
