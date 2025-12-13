'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Drawer } from './ui/Drawer'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'
import { cn } from './ui/cn'
import { logMicrotaskEvent } from '@/lib/events/eventClient'
import type { MicrotaskChoice, MicrotaskSource } from '@/lib/events/eventTypes'

const MICRO_TASKS = [
  { id: 'block_10', label: 'Start 10-min block', href: '/phone/block?preset=10', icon: '⏱️' },
  { id: 'block_30', label: 'Start 30-min block', href: '/phone/block?preset=30', icon: '🔒' },
  { id: 'urge_scroll', label: 'Log a scroll urge', href: '/phone/urge?reason=scroll', icon: '📝' },
  { id: 'phone_log', label: 'Log phone use', href: '/phone/log', icon: '📱' },
  { id: 'tasks', label: 'Knock out a task', href: '/tasks', icon: '✅' },
  { id: 'build', label: 'View build progress', href: '/build', icon: '🏗️' },
] as const

type MicroTaskId = (typeof MICRO_TASKS)[number]['id']

interface MicroTasksContextValue {
  open: (source: 'bottom_nav' | 'mobile_button') => void
  close: () => void
  isOpen: boolean
}

const MicroTasksContext = createContext<MicroTasksContextValue | null>(null)

export function MicroTasksProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [source, setSource] = useState<MicrotaskSource>('bottom_nav')
  const router = useRouter()
  const pathname = usePathname()
  const pushToast = useToast()
  const hasLoggedIntent = useRef(false)

  // Log scroll_intent when sheet opens
  useEffect(() => {
    if (isOpen && !hasLoggedIntent.current) {
      hasLoggedIntent.current = true
      logMicrotaskEvent({
        type: 'scroll_intent',
        source,
        page: pathname || '/',
      })
    }
    if (!isOpen) {
      hasLoggedIntent.current = false
    }
  }, [isOpen, source, pathname])

  const open = useCallback((src: MicrotaskSource) => {
    setSource(src)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleSelect = useCallback(
    (task: (typeof MICRO_TASKS)[number]) => {
      // Log microtask selection
      logMicrotaskEvent({
        type: 'microtask_selected',
        choice: task.id as MicrotaskChoice,
        source,
        page: pathname || '/',
      })

      close()
      pushToast({
        title: 'Good trade. Quest queued.',
        description: task.label,
        variant: 'success',
        actionLabel: 'View Build',
        onAction: () => router.push('/build'),
      })
      router.push(task.href)
    },
    [close, pushToast, router, source, pathname]
  )

  const handlePickRandom = useCallback(() => {
    const randomTask = MICRO_TASKS[Math.floor(Math.random() * MICRO_TASKS.length)]
    handleSelect(randomTask)
  }, [handleSelect])

  const handleLogUrgeInstead = useCallback(() => {
    close()
    router.push('/phone/urge?reason=scroll')
  }, [close, router])

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])

  return (
    <MicroTasksContext.Provider value={value}>
      {children}
      <Drawer
        open={isOpen}
        onClose={close}
        title="Swap scrolling for a 2-minute quest"
      >
        <div className="space-y-2">
          {MICRO_TASKS.map((task) => (
            <button
              key={task.id}
              onClick={() => handleSelect(task)}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-[--radius-lg]',
                'bg-surface-2 hover:bg-surface-2/80 border border-border',
                'text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus'
              )}
            >
              <span className="text-xl">{task.icon}</span>
              <span className="font-medium text-text">{task.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <Button
            variant="secondary"
            className="w-full"
            onClick={handlePickRandom}
          >
            Pick for me
          </Button>
          <button
            onClick={handleLogUrgeInstead}
            className="w-full text-sm text-muted hover:text-text py-2 transition-colors focus:outline-none focus-visible:underline"
          >
            Log a scroll urge instead
          </button>
        </div>
      </Drawer>
    </MicroTasksContext.Provider>
  )
}

export function useMicroTasks() {
  const ctx = useContext(MicroTasksContext)
  if (!ctx) {
    throw new Error('useMicroTasks must be used inside MicroTasksProvider')
  }
  return ctx
}
