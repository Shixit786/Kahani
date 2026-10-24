import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  glow?: 'emerald' | 'red' | 'amber' | 'none'
  hover?: boolean
}

export default function Card({ children, className = '', glow = 'none', hover = false }: CardProps) {
  const glowClass = {
    emerald: 'glow-emerald',
    red: 'glow-red',
    amber: 'glow-amber',
    none: 'shadow-[0_1px_3px_rgba(0,0,0,0.5)]',
  }[glow]

  return (
    <div
      className={`card p-6 ${glowClass} ${
        hover ? 'transition-all duration-200 hover:border-white/[0.14] hover:translate-y-[-1px]' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
