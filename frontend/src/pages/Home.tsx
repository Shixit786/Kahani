import { Link } from 'react-router-dom'
import { Lock, Link2, FileText, Shield, CheckCircle2, QrCode } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'
import Badge from '../components/Badge'

export default function Home() {
  return (
    <div className="min-h-screen pt-16">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[85vh] px-6 text-center overflow-hidden">
        {/* Soft vignette and warm gold/maroon ambient accents */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 35%, rgba(201,163,91,0.06) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 50% 40% at 50% 80%, rgba(42,7,11,0.8) 0%, transparent 80%)',
          }}
        />

        {/* Top badge - cream pill with verified dot */}
        <div className="relative mb-8">
          <Badge variant="verified" size="md">
            Section 63(4)(c) BSA 2023 Compliant
          </Badge>
        </div>

        {/* Headline: large Montserrat 500 with Playfair italic accents */}
        <h1 className="relative max-w-4xl text-4xl sm:text-6xl md:text-7xl font-medium leading-[1.15] tracking-tight text-white mb-6">
          <span className="font-serif-italic font-normal text-gold">Evidence</span>{' '}
          That Stays True,
          <br />
          From Seizure to{' '}
          <span className="font-serif-italic font-normal text-cream">Verdict</span>
        </h1>

        {/* Subtitle: Montserrat 300-400, line-height 1.6 */}
        <p className="relative max-w-2xl text-base sm:text-lg text-white/75 mb-10 leading-relaxed font-light">
          SHA-256 cryptographic locking, immutable tamper-evident chain of custody,
          and automated Indian court certificates for forensic electronic evidence.
        </p>

        {/* CTAs */}
        <div className="relative flex flex-wrap items-center justify-center gap-4">
          <Link to="/cases">
            <Button size="lg">
              Explore Cases
            </Button>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="secondary">
              View Legal Specs
            </Button>
          </a>
        </div>

        {/* Floating preview showcase: an elegant rotated cream card */}
        <div className="relative mt-14 max-w-2xl w-full">
          <div className="transform -rotate-1 hover:rotate-0 transition-transform duration-300">
            <Card variant="light" className="p-6 text-left shadow-2xl border border-cream-deep">
              <div className="flex items-center justify-between pb-4 border-b border-ink/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center">
                    <Shield className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider uppercase text-ink/60">
                      Bharatiya Sakshya Adhiniyam, 2023
                    </div>
                    <div className="text-sm font-semibold text-ink">
                      Certificate Under Section 63(4)(c)
                    </div>
                  </div>
                </div>
                <Badge variant="verified" size="sm">
                  Chain Intact
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white/70 border border-ink/10">
                  <span className="text-ink/60 block">Hash Lock</span>
                  <span className="font-mono font-medium text-ink">SHA-256 Locked</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 border border-ink/10">
                  <span className="text-ink/60 block">Chain Events</span>
                  <span className="font-medium text-ink">Cryptographically Sealed</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-white/70 border border-ink/10 flex items-center justify-between">
                  <div>
                    <span className="text-ink/60 block">Court Seal</span>
                    <span className="font-medium text-ink">Section 63 Ready</span>
                  </div>
                  <QrCode className="w-5 h-5 text-ink/70" />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Scroll indicator line */}
        <div className="mt-12 flex flex-col items-center gap-2 opacity-40">
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-gold to-transparent" />
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-widest text-gold font-medium">
            Forensic Assurance
          </span>
          <h2 className="text-3xl sm:text-4xl font-medium text-white mt-2">
            Engineered for <span className="font-serif-italic text-cream">Judicial Scrutiny</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-8 relative overflow-hidden group hover:border-gold/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-gold">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Hash Lock{' '}
              <span className="font-serif-italic font-normal text-gold block sm:inline">
                — Seizure Sealing
              </span>
            </h3>
            <p className="text-sm text-white/75 leading-relaxed font-light">
              Files are streamed through SHA-256 hashing at ingestion. Any single byte tampering breaks the fingerprint immediately.
            </p>
          </Card>

          <Card className="p-8 relative overflow-hidden group hover:border-gold/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-cream">
              <Link2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Custody Chain{' '}
              <span className="font-serif-italic font-normal text-cream block sm:inline">
                — Block Linked
              </span>
            </h3>
            <p className="text-sm text-white/75 leading-relaxed font-light">
              Every custody transfer cryptographically references the previous entry's hash. Retroactive alteration invalidates all successor records.
            </p>
          </Card>

          <Card className="p-8 relative overflow-hidden group hover:border-gold/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform text-gold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Court Certificate{' '}
              <span className="font-serif-italic font-normal text-gold block sm:inline">
                — BSA Section 63
              </span>
            </h3>
            <p className="text-sm text-white/75 leading-relaxed font-light">
              Generates court-admissible PDFs with Part A party declaration, Part B expert certification, and verification QR code.
            </p>
          </Card>
        </div>

        {/* Bottom stat strip */}
        <div className="mt-12">
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/10">
              <div className="pt-3 sm:pt-0">
                <div className="text-2xl font-medium text-white font-mono">
                  SHA-256
                </div>
                <div className="text-xs text-white/50 mt-1 uppercase tracking-wider font-light">
                  Primary Hashing Standard
                </div>
              </div>
              <div className="pt-3 sm:pt-0">
                <div className="text-2xl font-medium text-gold font-mono">
                  BSA 2023 §63(4)(c)
                </div>
                <div className="text-xs text-white/50 mt-1 uppercase tracking-wider font-light">
                  Indian Evidence Framework
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

