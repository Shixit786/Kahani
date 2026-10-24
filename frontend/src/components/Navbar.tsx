import { Link, useLocation } from 'react-router-dom'
import { Scale } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-surface-subtle bg-maroon/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-cream text-ink flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <Scale className="w-4 h-4 text-ink" />
          </div>
          <span className="font-serif-italic text-2xl text-white tracking-tight">
            Kahani
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-2">
          <NavLink to="/cases" active={pathname.startsWith('/cases')}>
            Cases
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function NavLink({
  to,
  active,
  children,
}: {
  to: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-cream text-ink shadow-sm'
          : 'text-white/70 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  )
}

