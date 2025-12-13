/**
 * Card - PixelLab-inspired neutral surface component
 * Features: Neutral charcoal background, subtle border, large rounded corners
 */

import { cn } from './cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  elevation?: '1' | '2' // Maps to surface-1 or surface-2
  padding?: 'none' | 'sm' | 'md' | 'lg'
  radius?: 'md' | 'lg' | 'xl' | '2xl'
  onClick?: () => void
}

const paddingVariants = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const radiusVariants = {
  md: 'rounded-[--radius-md]',
  lg: 'rounded-[--radius-lg]',
  xl: 'rounded-[--radius-xl]',
  '2xl': 'rounded-[--radius-2xl]',
}

export function Card({
  children,
  className,
  elevation = '1',
  padding = 'md',
  radius = 'lg',
  onClick,
}: CardProps) {
  const surfaceColor = elevation === '1' ? 'bg-surface-1' : 'bg-surface-2'

  return (
    <div
      className={cn(
        surfaceColor,
        'border border-border',
        radiusVariants[radius],
        paddingVariants[padding],
        onClick && 'cursor-pointer active:scale-[0.98] transition-transform',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
