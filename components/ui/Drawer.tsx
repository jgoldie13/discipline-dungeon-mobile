/**
 * Drawer - Bottom sheet drawer (mobile-friendly)
 * Features: Slides up from bottom, swipe to close, safe-area support
 */

'use client'

import { useEffect } from 'react'
import { cn } from './cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
}

export function Drawer({ open, onClose, children, title, className }: DrawerProps) {
  // Close on escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content - slides up from bottom */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'glass-panel border-t border-white/10',
          'rounded-t-[--radius-2xl]',
          'shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'pb-[env(safe-area-inset-bottom)]',
          'animate-in slide-in-from-bottom duration-300',
          className
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full" />
        </div>

        {title && (
          <div className="px-6 py-3 border-b border-white/10">
            <h2 className="text-lg font-serif uppercase tracking-widest text-mana">
              {title}
            </h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
