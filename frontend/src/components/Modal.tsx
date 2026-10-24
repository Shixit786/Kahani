import { type ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open?: boolean
  isOpen?: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg'
}

export default function Modal({
  open,
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  const isVisible = isOpen ?? open ?? false

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = isVisible ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isVisible])

  if (!isVisible) return null

  const maxWidths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#2A070B]/85 backdrop-blur-md" />

      {/* Panel */}
      <div
        className={`relative w-full ${maxWidths[maxWidth]} bg-cream text-ink rounded-card border border-cream-deep shadow-2xl shadow-black/60 animate-in fade-in zoom-in-95 duration-150 overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-cream-deep">
          <div>
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
            {description && (
              <p className="text-xs text-ink/70 mt-1 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink/50 hover:text-ink hover:bg-black/5 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

