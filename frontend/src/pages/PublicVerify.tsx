import { useState, useEffect, useCallback, useRef } from 'react'
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
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import HashText from '../components/HashText'
import { getEvidenceById, verifyChain, getTsr, type Evidence } from '../lib/api'

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

  const [evidenceIdInput, setEvidenceIdInput] = useState(id || '')
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [chainOk, setChainOk] = useState<boolean | null>(null)
  const [chainCount, setChainCount] = useState<number>(0)
  const [tsrData, setTsrData] = useState<{ tsaTime: string | null; tsaStatus: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // In-browser verification dropzone
  const [verifyFile, setVerifyFile] = useState<File | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [computedHash, setComputedHash] = useState<string>('')
  const [verifyResult, setVerifyResult] = useState<{
    computedHash: string
    match: boolean | null
  } | null>(null)

  const [copiedHash, setCopiedHash] = useState(false)
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null)
  const dropInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async (targetId: string) => {
    if (!targetId.trim()) return
    try {
      setLoading(true)
      const data = await getEvidenceById(targetId.trim())
      setEvidence(data.evidence)
      setChainCount(data.custodyChain?.length || 0)

      const chainRes = await verifyChain(targetId.trim())
      setChainOk(chainRes.ok)

      const tsr = await getTsr(targetId.trim())
      setTsrData(tsr)
      toast.success('Sealed evidence record loaded')
    } catch {
      setEvidence(null)
      toast.error('Record not found for ID: ' + targetId)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      loadData(id)
    }
  }, [id, loadData])

  const handleFileDrop = async (file: File) => {
    setVerifyFile(file)
    setVerifying(true)
    setVerifyResult(null)
    try {
      const hash = await computeBrowserSha256(file)
      setComputedHash(hash)
      if (evidence) {
        const match = hash.toLowerCase() === evidence.sha256.toLowerCase()
        setVerifyResult({ computedHash: hash, match })
        if (match) {
          toast.success('Integrity 100% verified against sealed record!')
        } else {
          toast.error('Hash mismatch! File differs from sealed record.')
        }
      } else {
        setVerifyResult({ computedHash: hash, match: null })
        toast.success('File SHA-256 hash computed!')
      }
    } catch {
      toast.error('Failed to compute file hash')
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (evidenceIdInput.trim()) {
      loadData(evidenceIdInput.trim())
    }
  }

  const certutilCmd = evidence
    ? `certutil -hashfile "${evidence.filename}" SHA256`
    : `certutil -hashfile "${verifyFile?.name || 'evidence.dat'}" SHA256`
  const sha256sumCmd = evidence
    ? `sha256sum "${evidence.filename}"`
    : `sha256sum "${verifyFile?.name || 'evidence.dat'}"`

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-6 space-y-8">
        {/* ── Hero (Centered) ─────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="mb-2">
            <Badge variant="verified" size="sm">
              Section 63 BSA Independent Audit
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-[56px] font-medium text-white tracking-tight leading-tight">
            <span className="font-serif-italic font-normal text-gold">Independent</span> Evidence Audit
          </h1>
          <p className="text-xs md:text-sm text-white/75 max-w-xl mx-auto font-light leading-relaxed">
            Verify SHA-256 checksums in a zero-knowledge browser cleanroom, inspect cryptographic chain of custody, and validate court-admissible Section 63 BSA certificates.
          </p>
        </div>

        {/* ── Centered Cream Card With Drop Zone ─────────────────────── */}
        <div className="p-6 md:p-8 rounded-card bg-cream text-ink border border-cream-deep shadow-cream space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cream-deep">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Cleanroom <span className="font-serif-italic font-normal">File Verification</span>
              </h2>
              <p className="text-xs text-ink/70 font-light mt-0.5">
                Processed 100% locally using browser Web Crypto. No bytes are uploaded to any server.
              </p>
            </div>
            <Badge variant="verified" size="sm">
              ZERO-KNOWLEDGE
            </Badge>
          </div>

          {/* Centered Drop Zone */}
          <div
            onClick={() => dropInputRef.current?.click()}
            className="border-2 border-dashed border-ink/20 hover:border-gold rounded-2xl p-8 text-center cursor-pointer transition-all bg-white/80 hover:bg-white group"
          >
            <input
              ref={dropInputRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileDrop(f)
              }}
              disabled={verifying}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-cream-deep/60 flex items-center justify-center text-ink group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-sm font-semibold text-ink block">
                  {verifying
                    ? 'Computing cleanroom hash...'
                    : verifyFile
                    ? verifyFile.name
                    : 'Drop or select evidence file to verify'}
                </span>
                <span className="text-xs text-ink/60 font-light block">
                  {verifyFile
                    ? `${formatBytes(verifyFile.size)} • Click to choose a different file`
                    : 'Computes irreversible SHA-256 checksum on your machine'}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Result Inside Cream Card */}
          {verifyResult && (
            <div
              className={`p-4 rounded-2xl border transition-all ${
                verifyResult.match === true
                  ? 'bg-[#EAF5EF] border-[#3FA27A]/40'
                  : verifyResult.match === false
                  ? 'bg-[#FDECEC] border-[#E5484D]/40'
                  : 'bg-white border-cream-deep'
              }`}
            >
              <div className="flex items-start gap-3">
                {verifyResult.match === true ? (
                  <CheckCircle2 className="w-5 h-5 text-[#3FA27A] shrink-0 mt-0.5" />
                ) : verifyResult.match === false ? (
                  <XCircle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5" />
                ) : (
                  <FileCheck2 className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                )}

                <div className="space-y-1.5 text-xs w-full">
                  <div className="font-semibold text-sm text-ink">
                    {verifyResult.match === true
                      ? 'Integrity 100% Confirmed ✓'
                      : verifyResult.match === false
                      ? 'File Tamper Detected ✗'
                      : 'File SHA-256 Calculated'}
                  </div>
                  <p className="text-ink/75 leading-relaxed">
                    {verifyResult.match === true
                      ? 'The calculated SHA-256 checksum matches the sealed court record byte-for-byte.'
                      : verifyResult.match === false
                      ? 'The file has been modified or corrupted. Checksum differs from the master record.'
                      : 'Irreversible cryptographic hash calculated from file content.'}
                  </p>

                  <div className="p-3 bg-ink text-cream rounded-xl font-mono text-xs break-all select-all border border-ink/20 mt-2 shadow-inner">
                    <span className="text-cream/60 block text-[10px] mb-0.5">COMPUTED SHA-256:</span>
                    <span className="text-gold">{verifyResult.computedHash}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Record Lookup Search (If not already loaded) */}
          {!evidence && (
            <form onSubmit={handleSearchSubmit} className="pt-2">
              <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                Match Against An Existing Evidence ID
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={evidenceIdInput}
                  onChange={(e) => setEvidenceIdInput(e.target.value)}
                  placeholder="Paste Evidence ID (e.g. 6718d7f...)"
                  className="flex-1 px-4 py-2.5 rounded-full bg-white border border-cream-deep text-ink text-xs focus:outline-none focus:ring-2 focus:ring-gold/50 shadow-sm"
                />
                <Button type="submit" size="sm" disabled={loading || !evidenceIdInput.trim()}>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  <span>{loading ? 'Searching...' : 'Lookup'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* ── Sealed Evidence Record Card (If Loaded) ────────────────── */}
        {evidence && (
          <div className="p-6 md:p-8 rounded-card bg-cream text-ink border border-cream-deep shadow-cream space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-cream-deep">
              <div>
                <span className="text-[10px] font-mono uppercase text-ink/60 block font-semibold">
                  SEALED COURT RECORD
                </span>
                <h3 className="text-lg font-semibold text-ink font-mono break-all mt-0.5">
                  {evidence._id}
                </h3>
                <div className="text-xs text-ink/75 mt-1 font-light">
                  File: <span className="font-semibold text-ink">{evidence.filename}</span> ({formatBytes(evidence.sizeBytes)})
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={chainOk ? 'verified' : 'tampered'} size="sm">
                  {chainOk ? `Chain Intact (${chainCount} events)` : 'Chain Audit Warning'}
                </Badge>
                <Badge variant="neutral" size="sm">
                  <Radio className="w-3 h-3 mr-1 text-gold" />
                  <span>RFC 3161 {tsrData?.tsaStatus === 'verified' ? 'FreeTSA Anchored' : 'TSA Record'}</span>
                </Badge>
              </div>
            </div>

            {/* Stored SHA-256 Checksum */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-ink/60">
                <span className="uppercase font-semibold">STORED MASTER CHECKSUM</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(evidence.sha256, 'hash')}
                  className="inline-flex items-center gap-1 text-ink hover:text-gold transition-colors cursor-pointer font-medium"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-[#3FA27A]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy Stored Hash'}</span>
                </button>
              </div>
              <div className="p-3 bg-ink text-cream rounded-xl font-mono text-xs break-all select-all border border-ink/20 shadow-inner">
                {evidence.sha256}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link
                to={`/evidence/${evidence._id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-gold transition-colors"
              >
                <span>Open Full Custody Ledger & Certificate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Offline CLI Verification (Dark Surface Card) ────────────── */}
        <Card className="p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-gold" />
            <h3 className="text-base font-medium text-white">Trustless Offline CLI Verification</h3>
          </div>
          <p className="text-xs text-white/70 leading-relaxed font-light">
            You don't need to trust our server. You can independently verify your file offline using standard system tools:
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 bg-ink text-cream rounded-xl border border-ink/20 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-cream/50">
                <span>WINDOWS POWERSHELL / CMD</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(certutilCmd, 'win')}
                  className="text-gold hover:text-white cursor-pointer font-sans text-[11px]"
                >
                  {copiedCmd === 'win' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <div className="text-cream select-all break-all">{certutilCmd}</div>
            </div>

            <div className="p-3.5 bg-ink text-cream rounded-xl border border-ink/20 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-cream/50">
                <span>LINUX / MACOS TERMINAL</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(sha256sumCmd, 'nix')}
                  className="text-gold hover:text-white cursor-pointer font-sans text-[11px]"
                >
                  {copiedCmd === 'nix' ? 'Copied' : 'Copy command'}
                </button>
              </div>
              <div className="text-cream select-all break-all">{sha256sumCmd}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
