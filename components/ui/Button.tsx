import { cn } from './cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        'font-semibold transition-colors rounded-xl focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-bg',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Variant styles
        variant === 'primary' &&
          'bg-surface-2 text-text border border-border hover:bg-surface-1 active:scale-[0.98]',
        variant === 'secondary' &&
          'bg-surface-1 text-muted border border-border hover:bg-surface-2 hover:text-text',
        variant === 'ghost' &&
          'bg-transparent text-muted hover:text-text hover:bg-surface-1',
        variant === 'destructive' &&
          'bg-negative text-white border-2 border-negative hover:bg-red-600 active:scale-[0.98] font-bold shadow-lg shadow-negative/20',

        // Size styles
        size === 'sm' && 'px-4 py-2 text-sm',
        size === 'md' && 'px-6 py-3 text-base',
        size === 'lg' && 'px-8 py-4 text-lg',

        className
      )}
      disabled={disabled}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
