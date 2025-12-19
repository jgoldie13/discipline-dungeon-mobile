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

  // Keep the login experience clean (no app navigation before auth).
  if (pathname === '/login') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-dd-border/60 bg-dd-surface/85 backdrop-blur-sm">
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
                    ? 'text-mana bg-dd-surface/70 border border-dd-border/60 glow-blue'
                    : 'text-dd-muted hover:text-dd-text hover:bg-dd-surface/60'
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
              'text-dd-muted hover:text-dd-text hover:bg-dd-surface/60',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-dd-glow-blue/40'
            )}
          >
            Scroll
          </button>
        </li>
      </ul>
    </nav>
  )
}
