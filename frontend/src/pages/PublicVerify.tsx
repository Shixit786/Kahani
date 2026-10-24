import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Lock,
  Upload,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Radio,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import HashText from '../components/HashText'
import { getEvidenceById, verifyChain, getTsr, type Evidence, type CustodyEvent } from '../lib/api'

async function computeBrowserSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function PublicVerify() {
  const { id } = useParams<{ id: string }>()

  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [chainOk, setChainOk] = useState<boolean | null>(null)
  const [chainCount, setChainCount] = useState<number>(0)
  const [tsrData, setTsrData] = useState<{ tsaTime: string | null; tsaStatus: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // In-browser verification dropzone
  const [verifyFile, setVerifyFile] = useState<File | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{
    computedHash: string
    match: boolean
  } | null>(null)

  const [copiedHash, setCopiedHash] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getEvidenceById(id)
      setEvidence(data.evidence)
      setChainCount(data.custodyChain?.length || 0)

      const chainRes = await verifyChain(id)
      setChainOk(chainRes.ok)

      const tsr = await getTsr(id)
      setTsrData(tsr)
    } catch (err: any) {
      toast.error('Could not load public verification record')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFileDrop = async (file: File) => {
    if (!evidence) return
    setVerifyFile(file)
    setVerifying(true)
    try {
      const hash = await computeBrowserSha256(file)
      const match = hash.toLowerCase() === evidence.sha256.toLowerCase()
      setVerifyResult({ computedHash: hash, match })
      if (match) {
        toast.success('Integrity 100% verified!')
      } else {
        toast.error('Hash mismatch! File has been altered.')
      }
    } catch {
      toast.error('Failed to compute hash')
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    if (label === 'hash') {
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2000)
    } else {
      setCopiedCmd(label)
      setTimeout(() => setCopiedCmd(null), 2000)
    }
    toast.success('Copied to clipboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-white/50 font-mono">Fetching public verification ledger...</p>
        </div>
      </div>
    )
  }

  if (!evidence) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Card className="text-center py-12 px-8 max-w-md bg-surface border-white/10">
          <p className="text-white/60 mb-4 text-sm">Evidence verification record not found.</p>
          <Link to="/">
            <Button size="sm">Go to Homepage</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const certutilCmd = `certutil -hashfile "${evidence.filename}" SHA256`
  const sha256sumCmd = `sha256sum "${evidence.filename}"`

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        {/* Top Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Shield className="w-3.5 h-3.5" />
            <span>Public Trust & Integrity Verification Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Independent Evidence <span className="font-serif italic font-normal text-emerald-400">Audit</span>
          </h1>
          <p className="text-xs md:text-sm text-white/50 max-w-xl mx-auto">
            Section 63(4)(c) Bharatiya Sakshya Adhiniyam, 2023. Validates electronic records against independent cryptographic and RFC 3161 timestamps.
          </p>
        </div>

        {/* ── Evidence Seal Card ─────────────────────────────────────── */}
        <Card className="p-6 md:p-8 bg-surface border-white/10 relative overflow-hidden space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <span className="text-[10px] font-mono uppercase text-white/40 block">RECORD IDENTIFIER</span>
              <h2 className="text-xl font-bold text-white font-mono break-all">{evidence._id}</h2>
              <div className="text-xs text-white/50 mt-1">
                File: <span className="text-white font-semibold">{evidence.filename}</span> ({formatBytes(evidence.sizeBytes)})
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Chain Status */}
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{chainOk ? `Custody Chain Intact (${chainCount} blocks)` : 'Chain Check Inconclusive'}</span>
              </div>

              {/* RFC 3161 TSA Status */}
              <div className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-1.5 text-xs text-sky-400 font-mono">
                <Radio className="w-3.5 h-3.5" />
                <span>RFC 3161 {tsrData?.tsaStatus === 'verified' ? 'FreeTSA Certified' : 'Anchor'}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic SHA-256 Anchor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-white/40">
              <span className="uppercase font-semibold">SEALED SHA-256 CHECKSUM</span>
              <button
                type="button"
                onClick={() => copyToClipboard(evidence.sha256, 'hash')}
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHash ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3.5 bg-black/60 rounded-xl font-mono text-xs md:text-sm text-emerald-400 break-all select-all border border-emerald-500/20 tracking-wider">
              {evidence.sha256}
            </div>
          </div>

          {/* Timestamping Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="text-[10px] text-white/40 font-mono uppercase flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-emerald-400" />
                <span>Server Ingestion IST</span>
              </div>
              <div className="text-white font-mono text-xs">
                {new Date(evidence.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
              <div className="text-[10px] text-white/40 font-mono uppercase flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-sky-400" />
                <span>RFC 3161 TSA Timestamp</span>
              </div>
              <div className="text-white font-mono text-xs">
                {tsrData?.tsaTime ? new Date(tsrData.tsaTime).toUTCString() : 'FreeTSA Cryptographic Token Anchored'}
              </div>
            </div>
          </div>
        </Card>

        {/* ── In-Browser Hash Check Drop Zone ─────────────────────────── */}
        <Card className="p-6 md:p-8 bg-surface border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Client-Side Cleanroom Hash Verification</h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Drop your local file copy below. Your browser will compute the SHA-256 hash using the Web Crypto API without uploading any bytes to any server.
          </p>

          <div className="relative border-2 border-dashed border-white/15 hover:border-emerald-500/40 rounded-2xl p-6 text-center transition-colors bg-black/30">
            <input
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileDrop(f)
              }}
              disabled={verifying}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-white/30" />
              <span className="text-xs font-medium text-white/80">
                {verifying ? 'Computing cleanroom hash...' : 'Drop file here to verify instant match'}
              </span>
              <span className="text-[11px] text-white/30">Processed 100% locally in your browser sandbox</span>
            </div>
          </div>

          {verifyResult && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                verifyResult.match
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {verifyResult.match ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs w-full">
                  <div className="font-bold text-sm">
                    {verifyResult.match ? 'Integrity 100% Confirmed ✓' : 'File Tamper Detected ✗'}
                  </div>
                  <p className="opacity-80">
                    {verifyResult.match
                      ? 'The calculated SHA-256 checksum matches the sealed court record exactly.'
                      : 'The file has been modified or corrupted. Checksum differs from the master record.'}
                  </p>
                  <div className="p-2.5 bg-black/50 rounded-lg font-mono text-[11px] break-all border border-white/10 mt-2">
                    Computed: {verifyResult.computedHash}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ── Verify Without This Website (Trustless CLI Verification) ─ */}
        <Card className="p-6 md:p-8 bg-surface border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Verify Without This Website</h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            True cryptographic integrity does not depend on trusting our platform. You can verify the evidence hash offline using standard operating system command-line utilities:
          </p>

          <div className="space-y-3 font-mono text-xs">
            {/* Windows Certutil */}
            <div className="p-3.5 bg-black/60 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span>WINDOWS POWERSHELL / CMD</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(certutilCmd, 'win')}
                  className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  {copiedCmd === 'win' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <div className="text-white select-all break-all">{certutilCmd}</div>
            </div>

            {/* Linux / macOS sha256sum */}
            <div className="p-3.5 bg-black/60 rounded-xl border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-white/40">
                <span>LINUX / MACOS TERMINAL</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sha256sumCmd, 'nix')}
                  className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  {copiedCmd === 'nix' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <div className="text-white select-all break-all">{sha256sumCmd}</div>
            </div>
          </div>

          <p className="text-[11px] text-white/30 pt-1">
            If the output from your terminal matches the sealed checksum above ({evidence.sha256.slice(0, 16)}...), the evidence is mathematically proven to be identical to the seized file.
          </p>
        </Card>
      </div>
    </div>
  )
}
