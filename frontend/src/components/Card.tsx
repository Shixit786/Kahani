import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'dark' | 'light'
  glow?: 'verified' | 'tampered' | 'warning' | 'gold' | 'emerald' | 'red' | 'amber' | 'none'
  hover?: boolean
}

export default function Card({
  children,
  className = '',
  variant = 'dark',
  glow = 'none',
  hover = false,
}: CardProps) {
  const glowClass = {
    verified: 'shadow-[0_0_24px_-4px_rgba(63,162,122,0.3)] border-status-verified/30',
    emerald: 'shadow-[0_0_24px_-4px_rgba(63,162,122,0.3)] border-status-verified/30',
    tampered: 'shadow-[0_0_24px_-4px_rgba(229,72,77,0.35)] border-status-tampered/30',
    red: 'shadow-[0_0_24px_-4px_rgba(229,72,77,0.35)] border-status-tampered/30',
    warning: 'shadow-[0_0_24px_-4px_rgba(217,164,65,0.3)] border-status-warning/30',
    amber: 'shadow-[0_0_24px_-4px_rgba(217,164,65,0.3)] border-status-warning/30',
    gold: 'shadow-gold border-gold/30',
    none: '',
  }[glow]

  const baseVariant =
    variant === 'light'
      ? 'bg-cream text-ink border border-cream-deep shadow-cream'
      : 'bg-surface border border-surface-subtle backdrop-blur-sm text-white'

  return (
    <div
      className={`rounded-card ${baseVariant} ${glowClass} ${
        hover
          ? 'transition-all duration-200 hover:border-white/20 hover:-translate-y-0.5'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

