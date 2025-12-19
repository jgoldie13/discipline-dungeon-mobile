/**
 * BottomCTA - Sticky bottom action bar (PixelLab style)
 * Features: Safe-area inset support, gradient backdrop, primary action emphasis
 */

import { cn } from './cn'

interface BottomCTAProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'gradient'
}

export function BottomCTA({
  children,
  className,
  variant = 'gradient',
}: BottomCTAProps) {
  return (
    <div
      className={cn(
        'fixed bottom-16 md:bottom-0 left-0 right-0 z-50',
        'border-t border-dd-border/60',
        'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]',
        variant === 'gradient' &&
          'bg-gradient-to-t from-dd-bg via-dd-bg/95 to-dd-bg/80 backdrop-blur-sm',
        variant === 'default' && 'bg-dd-surface/85 backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  )
}
