import { Link } from 'react-router-dom'
import { ArrowRight, Lock, Link2, FileText, Shield } from 'lucide-react'
import Button from '../components/Button'

const features = [
  {
    icon: Lock,
    title: 'Hash Lock',
    accent: 'sealed at upload',
    description:
      'Every file is SHA-256 hashed the moment it arrives on the server. The fingerprint is locked forever — any byte-level change is instantly detected.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Link2,
    title: 'Custody Chain',
    accent: 'tamper-evident',
    description:
      'Each handover appends a cryptographically linked event. The hash of every entry seals the next, creating an unbreakable audit trail.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  {
    icon: FileText,
    title: 'Court Certificate',
    accent: 'legally compliant',
    description:
      'Generate a Section 63(4)(c) BSA 2023 certificate PDF with QR code, device details, hash value, and the full chain of custody — ready for court.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen pt-14">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[88vh] px-6 text-center overflow-hidden">
        {/* Background radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(16,185,129,0.07) 0%, transparent 70%), ' +
              'radial-gradient(ellipse 40% 30% at 70% 60%, rgba(99,102,241,0.05) 0%, transparent 60%)',
          }}
        />

        {/* Top badge */}
        <div className="relative mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Shield className="w-3.5 h-3.5" />
          Cryptographic Evidence Integrity Platform
        </div>

        {/* Headline */}
        <h1 className="relative max-w-3xl text-5xl sm:text-6xl font-semibold leading-[1.12] tracking-tight text-white mb-6">
          Evidence that{' '}
          <span className="font-serif-italic text-emerald-400">stays true</span>
          <br />
          from seizure to{' '}
          <span className="font-serif-italic text-white/70">court</span>
        </h1>

        {/* Subtitle */}
        <p className="relative max-w-xl text-lg text-white/50 mb-10 leading-relaxed">
          SHA-256 sealed, tamper-evident chain of custody, and a{' '}
          <span className="text-white/70">Section 63 BSA</span> certificate PDF —
          built for Indian legal proceedings.
        </p>

        {/* CTAs */}
        <div className="relative flex items-center gap-3">
          <Link to="/cases">
            <Button size="lg" className="gap-2">
              Open Cases
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="ghost">
              View Source
            </Button>
          </a>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-8 bg-gradient-to-b from-transparent to-white/60" />
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="card p-6 hover:border-white/[0.14] hover:translate-y-[-2px] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.5)] group"
            >
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-200`}
              >
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>

              {/* Title */}
              <h3 className="text-base font-semibold text-white mb-1">
                {f.title}{' '}
                <span className={`font-serif-italic font-normal ${f.color}`}>
                  — {f.accent}
                </span>
              </h3>

              {/* Description */}
              <p className="text-sm text-white/45 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom stat strip */}
        <div className="mt-10 card p-5 flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
          {[
            { label: 'Hash Algorithm', value: 'SHA-256' },
            { label: 'Legal Compliance', value: 'BSA 2023 §63' },
            { label: 'Chain Integrity', value: 'Block-linked' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xl font-semibold text-white font-mono">
                {s.value}
              </div>
              <div className="text-xs text-white/35 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
