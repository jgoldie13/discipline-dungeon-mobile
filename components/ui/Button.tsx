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
        'font-semibold transition-colors rounded-[--radius-lg] focus:outline-none focus:ring-2 focus:ring-dd-glow-blue/40 focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Variant styles
        variant === 'primary' &&
          'bg-gold-solid text-slate-950 border border-gold/40 font-bold font-serif uppercase tracking-wide hover:bg-gold active:scale-[0.98]',
        variant === 'secondary' &&
          'bg-dd-surface/80 text-dd-text border border-dd-border/70 hover:bg-dd-surface/90',
        variant === 'ghost' &&
          'bg-transparent text-dd-muted hover:text-dd-text hover:bg-dd-surface/70',
        variant === 'destructive' &&
          'bg-blood/20 text-blood border border-blood/60 hover:bg-blood/30 active:scale-[0.98]',

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
