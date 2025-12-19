/**
 * Collapsible - Expandable/collapsible section
 * Features: Smooth height animation, chevron indicator
 */

'use client'

import { useState } from 'react'
import { cn } from './cn'

interface CollapsibleProps {
  trigger: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  className?: string
}

export function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  className,
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn('glass-panel rounded-[--radius-lg]', className)}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-dd-surface/70 transition-colors"
      >
        <div className="flex-1">{trigger}</div>
        <svg
          className={cn(
            'w-5 h-5 text-dd-muted transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - with smooth height transition */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-dd-border/50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
