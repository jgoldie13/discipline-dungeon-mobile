'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { cn } from './cn'

type ToastPayload = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
}

type ToastInstance = ToastPayload & { id: string }

type ToastContextValue = {
  push: (toast: ToastPayload) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastInstance[]>([])

  const push = useCallback((toast: ToastPayload) => {
    const id = crypto.randomUUID()
    const duration = toast.durationMs ?? 4200
    const instance: ToastInstance = { ...toast, id }
    setToasts((prev) => [...prev, instance])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider')
  }
  return ctx.push
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastInstance[]
  onDismiss: (id: string) => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto w-full max-w-md rounded-[--radius-lg] border shadow-lg bg-surface-1/95 backdrop-blur p-4 text-text',
            'transition-transform duration-200 ease-out',
            toast.variant === 'success' && 'border-positive/50',
            toast.variant === 'warning' && 'border-warning/60',
            toast.variant === 'danger' && 'border-negative/60'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-semibold text-base">{toast.title}</div>
              {toast.description && (
                <div className="text-sm text-muted mt-1">{toast.description}</div>
              )}
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={toast.onAction}
                  className="mt-2 text-sm font-semibold text-focus hover:underline"
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-muted hover:text-text text-sm"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
