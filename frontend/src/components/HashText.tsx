import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface HashTextProps {
  hash: string
  /** Characters to show at start and end when shortened (default 6) */
  chars?: number
  length?: number
  className?: string
}

export default function HashText({ hash, chars = 6, length, className = '' }: HashTextProps) {
  const [copied, setCopied] = useState(false)
  const [hovered, setHovered] = useState(false)

  const charCount = length ?? chars
  const short = `${hash.slice(0, charCount)}…${hash.slice(-charCount)}`

  const copy = async () => {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 group ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hash text */}
      <span
        className="font-mono text-xs text-emerald-400/80 relative"
        title={hash}
      >
        {hovered ? (
          <span className="absolute bottom-full left-0 mb-1 px-2 py-1 rounded-lg bg-[#1E1E28] border border-white/10 text-xs text-white/80 whitespace-nowrap shadow-xl z-10 font-mono">
            {hash}
          </span>
        ) : null}
        {short}
      </span>

      {/* Copy button */}
      <button
        onClick={copy}
        className="opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-white/30 hover:text-emerald-400"
        title="Copy full hash"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Copy className="w-3 h-3" />
        )}
      </button>
    </span>
  )
}
