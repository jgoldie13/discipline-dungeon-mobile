/**
 * SegmentedControl - iOS-style segmented picker
 * Features: Grouped buttons with sliding active indicator
 */

import { cn } from './cn'

interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center',
        'bg-surface-1 border border-border',
        'rounded-[--radius-lg]',
        'p-1',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-4 py-2',
              'rounded-[--radius-md]',
              'text-sm font-medium',
              'transition-all',
              isActive && 'bg-surface-2 text-text shadow-sm',
              !isActive && 'text-muted hover:text-text'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
