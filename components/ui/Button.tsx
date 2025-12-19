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
        'font-semibold transition-colors rounded-[--radius-lg] focus:outline-none focus:ring-2 focus:ring-mana/50 focus:ring-offset-2 focus:ring-offset-slate-950',
        'disabled:opacity-50 disabled:cursor-not-allowed',

        // Variant styles
        variant === 'primary' &&
          'bg-gold-solid text-slate-950 border border-gold/40 font-bold font-serif uppercase tracking-wide hover:bg-gold active:scale-[0.98]',
        variant === 'secondary' &&
          'bg-slate-900/70 text-slate-200 border border-white/10 hover:bg-slate-900/90',
        variant === 'ghost' &&
          'bg-transparent text-slate-300 hover:text-slate-100 hover:bg-slate-900/60',
        variant === 'destructive' &&
          'bg-blood/20 text-blood border border-blood hover:bg-blood/30 active:scale-[0.98]',

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
