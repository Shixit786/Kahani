type BadgeVariant =
  | 'verified'
  | 'tampered'
  | 'neutral'
  | 'warning'
  | 'party'
  | 'lawyer'
  | 'expert'
  | 'court'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  className?: string
}

const variantConfig: Record<
  BadgeVariant,
  { dotColor: string; textColor: string }
> = {
  verified: {
    dotColor: 'bg-[#3FA27A]',
    textColor: 'text-[#2E7D5B]',
  },
  tampered: {
    dotColor: 'bg-[#E5484D]',
    textColor: 'text-[#C22830]',
  },
  warning: {
    dotColor: 'bg-[#D9A441]',
    textColor: 'text-[#A8741A]',
  },
  neutral: {
    dotColor: 'bg-ink/30',
    textColor: 'text-ink/75',
  },
  party: {
    dotColor: 'bg-sky-600',
    textColor: 'text-sky-900',
  },
  lawyer: {
    dotColor: 'bg-purple-600',
    textColor: 'text-purple-900',
  },
  expert: {
    dotColor: 'bg-amber-600',
    textColor: 'text-amber-900',
  },
  court: {
    dotColor: 'bg-rose-600',
    textColor: 'text-rose-900',
  },
}

const sizeStyles = {
  sm: 'px-2.5 py-0.5 text-[11px]',
  md: 'px-3 py-0.5 text-xs',
  lg: 'px-3.5 py-1 text-sm',
}

export default function Badge({
  variant,
  children,
  size = 'md',
  dot = true,
  className = '',
}: BadgeProps) {
  const config = variantConfig[variant] ?? variantConfig.neutral

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium bg-cream border border-cream-deep shadow-sm tracking-wide ${config.textColor} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotColor}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  )
}

/** Map actorRole string → badge variant */
export function roleBadgeVariant(role: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    Party: 'party',
    Lawyer: 'lawyer',
    Expert: 'expert',
    Court: 'court',
  }
  return map[role] ?? 'neutral'
}

