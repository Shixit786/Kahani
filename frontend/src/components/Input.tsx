import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  variant?: 'dark' | 'light'
}

export default function Input({
  label,
  error,
  hint,
  variant = 'dark',
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  const isLight = variant === 'light'

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-white/80'}`}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold ${
          isLight
            ? `bg-white/80 text-ink placeholder:text-ink/40 ${
                error ? 'border-status-tampered' : 'border-ink/20 hover:border-ink/35'
              }`
            : `bg-white/[0.04] text-white placeholder:text-white/30 ${
                error ? 'border-status-tampered' : 'border-white/20 hover:border-white/35'
              }`
        } ${className}`}
        {...props}
      />
      {hint && !error && (
        <p className={`text-xs ${isLight ? 'text-ink/60' : 'text-white/50'}`}>
          {hint}
        </p>
      )}
      {error && <p className="text-xs text-status-tampered font-medium">{error}</p>}
    </div>
  )
}

