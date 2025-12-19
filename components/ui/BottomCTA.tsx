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
        'fixed bottom-0 left-0 right-0 z-50',
        'border-t border-white/10',
        'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]',
        variant === 'gradient' &&
          'bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-950/80 backdrop-blur-sm',
        variant === 'default' && 'bg-slate-900/80 backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  )
}
