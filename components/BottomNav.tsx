"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from './ui/cn'
import { useMicroTasks } from './MicroTasksSheet'

const tabs = [
  { href: '/mobile', label: 'Home' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/phone/block', label: 'Block' },
  { href: '/build', label: 'Build' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { open: openMicroTasks } = useMicroTasks()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface-1/90 backdrop-blur">
      <ul className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (pathname?.startsWith(tab.href) && tab.href !== '/')
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  'text-sm font-semibold px-3 py-2 rounded-[--radius-lg] transition-colors',
                  active
                    ? 'text-text bg-surface-2 border border-border'
                    : 'text-muted hover:text-text hover:bg-surface-2/60'
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            onClick={() => openMicroTasks('bottom_nav')}
            className={cn(
              'text-sm font-semibold px-3 py-2 rounded-[--radius-lg] transition-colors',
              'text-muted hover:text-text hover:bg-surface-2/60',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-focus'
            )}
          >
            Scroll
          </button>
        </li>
      </ul>
    </nav>
  )
}
