type BadgeVariant = 'verified' | 'tampered' | 'neutral' | 'warning' | 'party' | 'lawyer' | 'expert' | 'court'

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const styles: Record<BadgeVariant, string> = {
  verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  tampered: 'bg-red-500/10 text-red-400 border-red-500/20',
  neutral: 'bg-white/5 text-white/50 border-white/10',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  party: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  lawyer: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  expert: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  court: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
}

export default function Badge({ variant, children, size = 'md', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-medium border ${styles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
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
