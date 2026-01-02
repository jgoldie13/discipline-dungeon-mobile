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
        // Base styles - PixelLab large radius
        'font-semibold transition-colors rounded-[--radius-lg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Variant styles
        variant === 'primary' &&
          'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.6)] font-bold tracking-wider uppercase',
        variant === 'secondary' &&
          'bg-dd-surface/80 text-dd-text border border-dd-border/70 hover:bg-dd-surface/90',
        variant === 'ghost' &&
          'bg-transparent text-dd-muted hover:text-dd-text hover:bg-dd-surface/70',
        variant === 'destructive' &&
          'bg-rose-900/50 text-rose-400 border border-rose-700 hover:bg-rose-900',

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
