import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Gavel, Menu, X, ArrowRight } from 'lucide-react'

export default function Navbar() {
  const { pathname, hash } = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Track scroll position for transparent vs subtle border
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname, hash])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-200 ${
        isScrolled
          ? 'bg-maroon/90 backdrop-blur-md border-b border-white/[0.08]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-18 py-3.5 flex items-center justify-between">
        {/* Left: Logo with Gavel in white + Kahani in Montserrat 600 white */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Gavel className="w-4 h-4 text-white" />
          </div>
          <span className="font-sans font-semibold text-xl text-white tracking-tight">
            Kahani
          </span>
        </Link>

        {/* Center: Desktop Links in Montserrat 400 white/85% */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
          <NavLink to="/" active={pathname === '/' && !hash}>
            Home
          </NavLink>
          <NavLink to="/cases" active={pathname.startsWith('/cases')}>
            Cases
          </NavLink>
          <NavLink to="/verify" active={pathname.startsWith('/verify')}>
            Verify
          </NavLink>
          <NavLink to="/mobile" active={pathname.startsWith('/mobile')}>
            Mobile Capture
          </NavLink>
          <NavLink to="/#about" active={hash === '#about'}>
            About
          </NavLink>
        </nav>

        {/* Right: Desktop White pill "Open Cases" with ink text */}
        <div className="hidden md:flex items-center shrink-0">
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-ink font-sans font-medium text-xs hover:bg-cream transition-all duration-200 shadow-sm hover:scale-[1.02]"
          >
            <span>Open Cases</span>
            <div className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center">
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/15 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Cream Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pb-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-cream text-ink rounded-card p-5 border border-cream-deep shadow-2xl space-y-4">
            <div className="flex flex-col space-y-1">
              <MobileNavLink to="/" active={pathname === '/' && !hash}>
                Home
              </MobileNavLink>
              <MobileNavLink to="/cases" active={pathname.startsWith('/cases')}>
                Cases
              </MobileNavLink>
              <MobileNavLink to="/verify" active={pathname.startsWith('/verify')}>
                Verify
              </MobileNavLink>
              <MobileNavLink to="/mobile" active={pathname.startsWith('/mobile')}>
                Mobile Capture
              </MobileNavLink>
              <MobileNavLink to="/#about" active={hash === '#about'}>
                About
              </MobileNavLink>
            </div>

            <div className="pt-3 border-t border-ink/10">
              <Link
                to="/cases"
                className="w-full inline-flex items-center justify-between px-5 py-3 rounded-full bg-ink text-cream font-medium text-sm hover:bg-maroon-deep transition-colors"
              >
                <span>Open Cases</span>
                <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
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
      className={`px-3.5 py-1.5 rounded-full text-sm font-sans font-normal transition-all duration-150 ${
        active
          ? 'text-white bg-white/10 font-medium'
          : 'text-white/85 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({
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
      className={`px-4 py-2.5 rounded-xl text-sm font-sans font-medium transition-colors ${
        active
          ? 'bg-ink/10 text-ink font-semibold'
          : 'text-ink/75 hover:text-ink hover:bg-ink/5'
      }`}
    >
      {children}
    </Link>
  )
}


