import { Link } from 'react-router-dom'
import { Lock, Link2, FileText, ShieldCheck, Shield, CheckCircle2, Scale, ArrowRight, Check } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'

export default function Home() {
  const tiltedCards = [
    {
      icon: Lock,
      title: 'Hash Lock',
      line: 'SHA-256 fingerprint',
      rotation: '-rotate-[4deg]',
      offset: 'translate-y-2 sm:translate-y-3',
    },
    {
      icon: Link2,
      title: 'Custody Chain',
      line: 'Every hand, recorded',
      rotation: 'rotate-[2deg]',
      offset: 'translate-y-0',
    },
    {
      icon: ShieldCheck,
      title: 'Forensic Check',
      line: 'Flags & two-party match',
      rotation: '-rotate-[2deg]',
      offset: 'translate-y-3 sm:translate-y-4',
    },
    {
      icon: FileText,
      title: 'Court Certificate',
      line: 'Section 63 BSA draft',
      rotation: 'rotate-[4deg]',
      offset: 'translate-y-1',
    },
  ]

  return (
    <div className="min-h-screen pt-20">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[86vh] px-6 text-center overflow-hidden">
        {/* Soft vignette and warm gold/maroon ambient accents */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 65% 55% at 50% 32%, rgba(201,163,91,0.07) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 55% 45% at 50% 85%, rgba(42,7,11,0.85) 0%, transparent 80%)',
          }}
        />

        {/* Top badge - cream pill */}
        <div className="relative mb-6">
          <Badge variant="verified" size="md">
            Section 63(4)(c) BSA 2023 Compliant
          </Badge>
        </div>

        {/* Headline: ~64px desktop / 38px mobile */}
        <h1 className="relative max-w-4xl text-[38px] sm:text-5xl lg:text-[64px] font-sans font-medium leading-[1.12] tracking-tight text-white mb-6">
          <em className="font-serif-italic font-normal not-italic text-gold">Trusted</em>{' '}
          Evidence, Locked the Moment It Arrives
        </h1>

        {/* Subtitle in Montserrat 300 white/75% */}
        <p className="relative max-w-2xl text-base sm:text-lg text-white/75 mb-10 leading-relaxed font-sans font-light">
          Hash every file, record every hand that touches it, and give courts a certificate they can verify themselves.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-wrap items-center justify-center gap-4 mb-16">
          <Link to="/cases">
            <Button size="lg">
              Open a Case
            </Button>
          </Link>
          <Link to="/verify">
            <Button size="lg" variant="secondary">
              Verify a File
            </Button>
          </Link>
        </div>

        {/* Row of 4 tilted cream cards overlapping the bottom */}
        <div className="relative w-full max-w-5xl mx-auto px-4 pt-4 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {tiltedCards.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className={`transform ${item.rotation} ${item.offset} hover:rotate-0 hover:-translate-y-2 transition-all duration-300 ease-out cursor-default`}
                >
                  <div className="bg-cream text-ink border border-cream-deep rounded-card p-6 shadow-cream text-left flex flex-col justify-between h-44 hover:shadow-2xl transition-shadow">
                    <div className="w-10 h-10 rounded-full bg-ink/5 border border-ink/10 flex items-center justify-center text-ink">
                      <Icon className="w-5 h-5 text-ink" />
                    </div>
                    <div>
                      <h3 className="font-serif-italic text-xl text-ink leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-ink/75 font-sans mt-1 leading-relaxed font-normal">
                        {item.line}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Scroll indicator line */}
        <div className="flex flex-col items-center gap-2 opacity-30 mt-6">
          <div className="w-px h-8 bg-gradient-to-b from-transparent via-gold to-transparent" />
        </div>
      </section>

      {/* ── About Section (anchored by #about) ─────────────────────────── */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-24 scroll-mt-20">
        <div className="text-center mb-14">
          <span className="text-xs uppercase tracking-widest text-gold font-medium">
            Forensic Assurance Framework
          </span>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mt-2">
            Built for <span className="font-serif-italic text-cream">Judicial Integrity</span>
          </h2>
          <p className="text-sm text-white/70 max-w-2xl mx-auto mt-3 font-light leading-relaxed">
            The Bharatiya Sakshya Adhiniyam, 2023 mandates that electronic records presented in court must establish unbroken custody, source identification, and tamper-proof verification.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-8 relative overflow-hidden group hover:border-gold/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-gold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Seizure Hash Lock
            </h3>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-light">
              Files are streamed through browser and server SHA-256 engines at the exact moment of handover. Any single bit modification permanently breaks the checksum.
            </p>
          </Card>

          <Card className="p-8 relative overflow-hidden group hover:border-gold/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-cream">
              <Link2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Cryptographic Audit Chain
            </h3>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-light">
              Each handover, lawyer view, forensic extraction, or court deposit appends a block linked to the previous entry hash. Retroactive editing is mathematically impossible.
            </p>
          </Card>

          <Card className="p-8 relative overflow-hidden group hover:border-gold/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 text-gold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Section 63(4)(c) Certificate
            </h3>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed font-light">
              Automated generation of clean, court-admissible certificate PDFs with Part A party declarations, Part B expert certifications, and trustless verification QR codes.
            </p>
          </Card>
        </div>

        {/* Bottom stats strip */}
        <div className="mt-12">
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              <div className="pt-3 sm:pt-0">
                <div className="text-2xl font-medium text-white font-mono">
                  SHA-256
                </div>
                <div className="text-xs text-white/50 mt-1 uppercase tracking-wider font-light">
                  Cryptographic Standard
                </div>
              </div>
              <div className="pt-3 sm:pt-0">
                <div className="text-2xl font-medium text-gold font-mono">
                  BSA 2023 §63
                </div>
                <div className="text-xs text-white/50 mt-1 uppercase tracking-wider font-light">
                  Statutory Compliance
                </div>
              </div>
              <div className="pt-3 sm:pt-0">
                <div className="text-2xl font-medium text-white font-mono">
                  RFC 3161
                </div>
                <div className="text-xs text-white/50 mt-1 uppercase tracking-wider font-light">
                  FreeTSA Timestamped
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}


