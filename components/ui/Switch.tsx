/**
 * Switch - Toggle switch component
 * Features: Animated thumb, accessible, semantic colors
 */

import { cn } from './cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  variant?: 'default' | 'positive'
  className?: string
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  variant = 'default',
  className,
}: SwitchProps) {
  const activeColor = variant === 'positive' ? 'bg-mana' : 'bg-dd-surface/70'

  return (
    <label
      className={cn(
        'inline-flex items-center gap-3 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={cn(
            'w-11 h-6 rounded-[--radius-full] border-2 transition-colors',
            checked ? `${activeColor} border-transparent` : 'bg-dd-surface/50 border-dd-border/50'
          )}
        />
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
            checked && 'translate-x-5'
          )}
        />
      </div>
      {label && <span className="text-sm text-dd-text select-none">{label}</span>}
    </label>
  )
}
