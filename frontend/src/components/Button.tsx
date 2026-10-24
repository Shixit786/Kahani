import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  hideArrow?: boolean
  children: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  hideArrow = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'group inline-flex items-center justify-center font-sans font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none'

  const sizes = {
    sm: 'text-xs py-1.5 px-3.5',
    md: 'text-xs md:text-sm py-2 px-5',
    lg: 'text-sm md:text-base py-2.5 px-6',
  }

  if (variant === 'primary') {
    const circleSizes = {
      sm: 'w-6 h-6',
      md: 'w-8 h-8',
      lg: 'w-9 h-9',
    }

    const iconSizes = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4',
    }

    return (
      <button
        className={`${base} bg-white text-ink rounded-full hover:bg-cream hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-black/20 gap-2.5 pl-2 pr-5 ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {!hideArrow && (
          <span
            className={`${circleSizes[size]} rounded-full bg-ink text-white flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:translate-x-0.5`}
          >
            {loading ? (
              <Loader2 className={`${iconSizes[size]} animate-spin`} />
            ) : (
              <ArrowRight className={iconSizes[size]} />
            )}
          </span>
        )}
        {hideArrow && loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
        <span>{children}</span>
      </button>
    )
  }

  if (variant === 'secondary') {
    return (
      <button
        className={`${base} bg-transparent border border-white/30 text-white rounded-full hover:bg-white/10 hover:border-white/50 active:bg-white/15 ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
        {children}
      </button>
    )
  }

  if (variant === 'ghost') {
    return (
      <button
        className={`${base} bg-transparent text-white/80 hover:text-white underline-offset-4 hover:underline px-2 py-1 ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
        {children}
      </button>
    )
  }

  // Danger variant
  return (
    <button
      className={`${base} bg-transparent border border-status-tampered/40 text-status-tampered rounded-full hover:bg-status-tampered/10 hover:border-status-tampered/70 active:bg-status-tampered/20 ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
      {children}
    </button>
  )
}
