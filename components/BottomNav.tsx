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
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-slate-900/90 backdrop-blur-xl">
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
                    ? 'text-mana bg-slate-900/70 border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
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
              'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-mana/50'
            )}
          >
            Scroll
          </button>
        </li>
      </ul>
    </nav>
  )
}
