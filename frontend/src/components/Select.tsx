import { type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  variant?: 'dark' | 'light'
}

export default function Select({
  label,
  error,
  options,
  variant = 'dark',
  className = '',
  id,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const isLight = variant === 'light'

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className={`text-sm font-medium ${isLight ? 'text-ink' : 'text-white/80'}`}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold ${
          isLight
            ? `bg-white/80 text-ink ${
                error ? 'border-status-tampered' : 'border-ink/20 hover:border-ink/35'
              }`
            : `bg-maroon-deep text-white ${
                error ? 'border-status-tampered' : 'border-white/20 hover:border-white/35'
              }`
        } ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            className={isLight ? 'bg-cream text-ink' : 'bg-maroon-deep text-white'}
          >
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-status-tampered font-medium">{error}</p>}
    </div>
  )
}

