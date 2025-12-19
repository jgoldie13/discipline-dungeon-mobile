/**
 * AppShell - Page layout wrapper with header/footer slots
 * Features: Safe-area support, optional header/footer, scrollable content
 */

import { cn } from './cn'

interface AppShellProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function AppShell({ children, header, footer, className }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      {header && (
        <header className="flex-shrink-0 glass-panel rounded-none">
          {header}
        </header>
      )}

      {/* Main content - scrollable */}
      <main
        className={cn(
          'flex-1 overflow-y-auto',
          footer ? 'pb-24' : '', // Add padding if footer exists
          className
        )}
      >
        {children}
      </main>

      {/* Footer */}
      {footer && footer}
    </div>
  )
}
