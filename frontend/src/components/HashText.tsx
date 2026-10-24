import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface HashTextProps {
  hash: string
  /** Characters to show at start and end when shortened (default 6) */
  chars?: number
  length?: number
  className?: string
  theme?: 'maroon' | 'cream'
}

export default function HashText({
  hash,
  chars = 6,
  length,
  className = '',
  theme = 'maroon',
}: HashTextProps) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const charCount = length ?? chars
  const short = `${hash.slice(0, charCount)}…${hash.slice(-charCount)}`

  const copy = async () => {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCream = theme === 'cream'

  return (
    <span
      className={`inline-flex items-center gap-1.5 group font-mono ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hash text */}
      <span
        className={`text-xs transition-colors relative cursor-default ${
          isCream
            ? 'text-ink/80 group-hover:text-ink'
            : 'text-white/80 group-hover:text-white'
        }`}
        title={hash}
      >
        {hovered ? (
          <span
            className={`absolute bottom-full left-0 mb-1 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap shadow-xl z-20 font-mono tracking-tight ${
              isCream
                ? 'bg-cream text-ink border border-cream-deep shadow-cream'
                : 'bg-[#2A070B] text-white/95 border border-white/20'
            }`}
          >
            {hash}
          </span>
        ) : null}
        {short}
      </span>

      {/* Copy button */}
      <button
        onClick={copy}
        type="button"
        className={`opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded ${
          isCream
            ? 'text-ink/40 hover:text-ink'
            : 'text-white/40 hover:text-gold'
        }`}
        title="Copy full hash"
      >
        {copied ? (
          <Check className="w-3 h-3 text-[#3FA27A]" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </span>
  )
}

