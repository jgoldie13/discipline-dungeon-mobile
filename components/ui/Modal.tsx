/**
 * Modal - Centered overlay dialog
 * Features: Backdrop blur, escape to close, focus trap
 */

'use client'

import { useEffect } from 'react'
import { cn } from './cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
}

export function Modal({ open, onClose, children, title, className }: ModalProps) {
  // Close on escape key
  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  // Prevent body scroll when modal is open
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md mx-4',
          'glass-panel',
          'rounded-[--radius-xl]',
          'shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        {title && (
          <div className="px-6 py-4 border-b border-white/10">
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
