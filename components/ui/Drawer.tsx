/**
 * Drawer - Bottom sheet drawer (mobile-friendly)
 * Features: Slides up from bottom, swipe to close, safe-area support
 */

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
}

export function Drawer({ open, onClose, children, title, className }: DrawerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

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

  if (!open || !mounted) return null

  console.log('Drawer rendering with open=true')

  const drawerContent = (
    <div className="fixed inset-0 z-50" style={{ zIndex: 9999, position: 'fixed' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dd-bg/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content - slides up from bottom */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0',
          'glass-panel border-t border-dd-border/60',
          'rounded-t-[--radius-2xl]',
          'shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'pb-[env(safe-area-inset-bottom)]',
          'transition-transform duration-300 ease-out',
          className
        )}
        style={{
          transform: open ? 'translateY(0)' : 'translateY(100%)'
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-dd-border/50 rounded-full" />
        </div>

        {title && (
          <div className="px-6 py-3 border-b border-dd-border/60">
            <h2 className="text-lg font-serif uppercase tracking-widest text-mana">
              {title}
            </h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )

  return createPortal(drawerContent, document.body)
}
