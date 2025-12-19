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
        'glass-panel',
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
              isActive && 'bg-mana/20 text-mana border border-mana/40',
              !isActive && 'text-slate-300 hover:text-slate-100'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
