import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Lock,
  Plus,
  RefreshCw,
  HardDrive,
  Cpu,
  Smartphone,
  Cloud,
  HelpCircle,
  Clock,
  User,
  Zap,
  Check,
  Copy,
  FileSignature,
  FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Select from '../components/Select'
import HashText from '../components/HashText'
import {
  getEvidenceById,
  verifyFile,
  verifyChain,
  demoTamper,
  addCustodyEvent,
  getCertificateUrl,
  type Evidence,
  type CustodyEvent,
  type VerifyFileResult,
  type VerifyChainResult,
} from '../lib/api'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getDeviceIcon(type: string) {
  switch (type) {
    case 'Computer':
      return <Cpu className="w-4 h-4" />
    case 'Mobile':
      return <Smartphone className="w-4 h-4" />
    case 'Flash Drive':
      return <HardDrive className="w-4 h-4" />
    case 'Cloud':
      return <Cloud className="w-4 h-4" />
    default:
      return <HelpCircle className="w-4 h-4" />
  }
}

function getRoleBadgeVariant(role: string): 'verified' | 'tampered' | 'warning' | 'neutral' {
  switch (role) {
    case 'Court':
      return 'verified'
    case 'Expert':
      return 'warning'
    case 'Lawyer':
      return 'neutral'
    default:
      return 'neutral'
  }
}

// Side-by-side hash comparison with differing characters highlighted
function DiffHashDisplay({ original, current }: { original: string; current: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs pt-2">
      <div className="bg-black/50 p-3 rounded-xl border border-white/10 space-y-1">
        <div className="text-[10px] text-white/40 uppercase font-semibold">Original Stored Hash</div>
        <div className="text-emerald-400 break-all select-all leading-relaxed">{original}</div>
      </div>
      <div className="bg-black/50 p-3 rounded-xl border border-rose-500/30 space-y-1">
        <div className="text-[10px] text-rose-400 uppercase font-semibold">
          Computed File Hash (Mismatches Highlighted)
        </div>
        <div className="break-all select-all leading-relaxed">
          {current.split('').map((char, index) => {
            const isDiff = char !== original[index]
            return (
              <span
                key={index}
                className={
                  isDiff
                    ? 'bg-rose-500/40 text-rose-200 font-bold px-0.5 rounded shadow-sm'
                    : 'text-white/80'
                }
              >
                {char}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function EvidenceDetail() {
  const { id } = useParams<{ id: string }>()

  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [custodyChain, setCustodyChain] = useState<CustodyEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Verify File State
  const [verifyingFile, setVerifyingFile] = useState(false)
  const [fileVerifyResult, setFileVerifyResult] = useState<VerifyFileResult | null>(null)

  // Chain Verify State
  const [verifyingChain, setVerifyingChain] = useState(false)
  const [chainVerifyResult, setChainVerifyResult] = useState<VerifyChainResult | null>(null)

  // Demo Tamper State
  const [tampering, setTampering] = useState(false)

  // Add Event Modal
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [addingEvent, setAddingEvent] = useState(false)
  const [eventForm, setEventForm] = useState({
    action: '',
    actor: '',
    actorRole: 'Expert' as CustodyEvent['actorRole'],
    details: '',
  })

  // Copied hash state
  const [hashCopied, setHashCopied] = useState(false)

  const loadEvidence = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getEvidenceById(id)
      setEvidence(data.evidence)
      setCustodyChain(data.custodyChain)
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load evidence record')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadEvidence()
  }, [loadEvidence])

  // Run chain verification
  const handleVerifyChain = async () => {
    if (!id) return
    try {
      setVerifyingChain(true)
      const res = await verifyChain(id)
      setChainVerifyResult(res)
      if (res.ok) {
        toast.success(`Chain intact — ${custodyChain.length} entries verified ✓`)
      } else {
        toast.error(`Tampering detected at entry #${res.brokenAt} — ${res.reason}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to verify custody chain')
    } finally {
      setVerifyingChain(false)
    }
  }

  // Verify File Submission
  const handleFileVerification = async (file: File) => {
    if (!id) return
    try {
      setVerifyingFile(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('actor', 'Forensic Verifier')

      const res = await verifyFile(id, formData)
      setFileVerifyResult(res)
      if (res.match) {
        toast.success('Integrity Verified ✓ Stored hash matches file!')
      } else {
        toast.error('File Altered ✗ Byte mismatch detected!')
      }
      // Re-fetch evidence to show new verification custody event
      await loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'File verification failed')
    } finally {
      setVerifyingFile(false)
    }
  }

  // Trigger Demo Tamper (Ghost button)
  const handleDemoTamper = async () => {
    if (!id) return
    try {
      setTampering(true)
      await demoTamper(id)
      toast.success('Entry #2 secretly modified in database', {
        icon: '⚠️',
        duration: 4000,
      })
      // Reload custody events & verify chain immediately so node pulses red
      await loadEvidence()
      const check = await verifyChain(id)
      setChainVerifyResult(check)
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Demo tamper failed')
    } finally {
      setTampering(false)
    }
  }

  // Add Custody Event
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !eventForm.action.trim() || !eventForm.actor.trim()) {
      toast.error('Action and Actor are required')
      return
    }

    try {
      setAddingEvent(true)
      await addCustodyEvent(id, eventForm)
      toast.success('Custody event appended to cryptographic chain')
      setEventModalOpen(false)
      setEventForm({ action: '', actor: '', actorRole: 'Expert', details: '' })
      await loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to append custody event')
    } finally {
      setAddingEvent(false)
    }
  }

  const applyPreset = (presetAction: string, presetRole: CustodyEvent['actorRole']) => {
    setEventForm((prev) => ({
      ...prev,
      action: presetAction,
      actorRole: presetRole,
    }))
  }

  const copyFullHash = () => {
    if (!evidence?.sha256) return
    navigator.clipboard.writeText(evidence.sha256)
    setHashCopied(true)
    toast.success('SHA-256 hash copied to clipboard')
    setTimeout(() => setHashCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-6 space-y-6">
          <div className="h-4 w-28 bg-white/5 rounded animate-pulse" />
          <div className="h-32 bg-surface rounded-2xl border border-white/5 animate-pulse" />
          <div className="h-44 bg-surface rounded-2xl border border-white/5 animate-pulse" />
          <div className="h-64 bg-surface rounded-2xl border border-white/5 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!evidence) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Card className="text-center py-12 px-8 max-w-md bg-surface border-white/10">
          <p className="text-white/60 mb-4 text-sm">Evidence item could not be found.</p>
          <Button size="sm" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Back Link to Case */}
        <div className="mb-6">
          <Link
            to={`/cases/${evidence.caseId}`}
            className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Case Matter</span>
          </Link>
        </div>

        {/* ── Info Card (File, Size, Hash, Device Details, Notes, Uploader) ── */}
        <Card className="mb-8 p-6 md:p-8 bg-surface border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/[0.04] rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="verified" size="sm" className="font-mono gap-1">
                  <Lock className="w-3 h-3" />
                  <span>HASH LOCKED</span>
                </Badge>
                <span className="text-xs text-white/40 font-mono">ID: {evidence._id}</span>
                <span className="text-xs text-white/40">•</span>
                <span className="text-xs text-white/50">
                  Uploader: <span className="text-white font-medium">{evidence.uploadedBy}</span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  {getDeviceIcon(evidence.deviceType)}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-serif italic text-white tracking-tight break-all">
                    {evidence.filename}
                  </h1>
                  <p className="text-xs text-white/40 mt-0.5">
                    {formatBytes(evidence.sizeBytes)} • {evidence.mimeType || 'Binary file'}
                  </p>
                </div>
              </div>

              {/* Device Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-white/40 text-[10px] font-mono uppercase">Device Type</div>
                  <div className="text-white font-medium mt-0.5">{evidence.deviceType}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-white/40 text-[10px] font-mono uppercase">Make / Model</div>
                  <div className="text-white font-medium mt-0.5 truncate">
                    {evidence.makeModel || 'Not recorded'}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-white/40 text-[10px] font-mono uppercase">Serial No</div>
                  <div className="text-white font-mono mt-0.5 truncate">
                    {evidence.serialNo || 'N/A'}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-white/40 text-[10px] font-mono uppercase">IMEI / Device ID</div>
                  <div className="text-white font-mono mt-0.5 truncate">
                    {evidence.deviceId || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {evidence.notes && (
                <div className="text-xs text-white/70 bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed">
                  <span className="text-white/40 font-semibold uppercase text-[10px] block mb-1">
                    Acquisition & Custody Notes:
                  </span>
                  {evidence.notes}
                </div>
              )}
            </div>

              {/* Certificate Download Button (Phase 3 Draft requirement) */}
            <div className="shrink-0 flex flex-col gap-2.5 lg:w-72">
              <a
                href={getCertificateUrl(evidence._id)}
                target="_blank"
                rel="noreferrer"
                className="w-full"
              >
                <Button size="md" className="gap-2 w-full justify-center shadow-lg shadow-emerald-500/10">
                  <Download className="w-4 h-4" />
                  <span>Download Certificate (Draft)</span>
                </Button>
              </a>
              <p className="text-[11px] text-amber-400/90 text-center leading-tight bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                Draft — must be reviewed and signed by party & expert (Section 63 BSA)
              </p>
            </div>
          </div>
        </Card>

        {/* ── Sealed SHA-256 Checksum Display Card ───────────────────── */}
        <Card className="mb-8 p-6 bg-surface border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
                Sealed SHA-256 Checksum (Cryptographic Anchor)
              </h2>
            </div>
            <button
              type="button"
              onClick={copyFullHash}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
            >
              {hashCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied full hash</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Full SHA-256</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs md:text-sm text-emerald-400 break-all select-all tracking-wider">
            {evidence.sha256}
          </div>

          {evidence.clientSha256 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Pre-upload client match confirmed:{' '}
                <span className="font-mono text-white/60">
                  {evidence.clientSha256.slice(0, 16)}...
                </span>
              </span>
            </div>
          )}
        </Card>

        {/* ── Verification & Integrity Controls (2-column layout) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 1. Verify File Drop Zone */}
          <Card className="p-6 bg-surface border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Verify File Integrity</h3>
              </div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Drop a file copy to compute its fresh SHA-256 hash and cross-verify byte-for-byte against the sealed anchor.
              </p>

              {/* File input / dropzone */}
              <div className="relative border border-dashed border-white/15 hover:border-emerald-500/40 rounded-xl p-4 text-center transition-colors bg-black/30">
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileVerification(f)
                  }}
                  disabled={verifyingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1.5 py-1.5">
                  <Upload className="w-5 h-5 text-white/30" />
                  <span className="text-xs font-medium text-white/80">
                    {verifyingFile ? 'Computing cleanroom hash...' : 'Drop or browse file to verify'}
                  </span>
                  <span className="text-[10px] text-white/30">
                    Calculates fresh SHA-256 in memory without persisting
                  </span>
                </div>
              </div>

              {/* Verification Result Banner */}
              {fileVerifyResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border transition-all ${
                    fileVerifyResult.match
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {fileVerifyResult.match ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs w-full">
                      <div className="font-bold text-sm">
                        {fileVerifyResult.match ? 'Integrity Verified ✓' : 'File Altered ✗'}
                      </div>
                      <p className="text-xs opacity-80">
                        {fileVerifyResult.match
                          ? '100% cryptographic match confirmed. The file is unaltered since ingestion.'
                          : 'Cryptographic hash mismatch! The provided file differs from the sealed master.'}
                      </p>

                      {/* Side-by-side with differing chars highlighted */}
                      {!fileVerifyResult.match && (
                        <DiffHashDisplay
                          original={fileVerifyResult.originalHash}
                          current={fileVerifyResult.currentHash}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 2. Verify Chain & Ghost Simulate Tamper */}
          <Card className="p-6 bg-surface border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Custody Chain Integrity</h3>
              </div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Verifies every link in the append-only ledger ({custodyChain.length} events). Checks
                cryptographic back-links and entry hashes.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={handleVerifyChain}
                  disabled={verifyingChain}
                  className="gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
                  <span>{verifyingChain ? 'Auditing chain...' : 'Verify Chain'}</span>
                </Button>

                {/* Ghost "Simulate Tamper" button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDemoTamper}
                  disabled={tampering}
                  className="gap-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  title="Alters event #2 in database to demonstrate tamper detection"
                >
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>{tampering ? 'Tampering...' : 'Simulate Tamper'}</span>
                </Button>
              </div>

              {/* Chain Result Banner */}
              {chainVerifyResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border transition-all ${
                    chainVerifyResult.ok
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {chainVerifyResult.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-sm">
                        {chainVerifyResult.ok
                          ? `Chain intact — ${custodyChain.length} entries verified`
                          : `Tampering detected at entry #${chainVerifyResult.brokenAt} — reason`}
                      </div>
                      <div className="opacity-80">
                        {chainVerifyResult.ok
                          ? `All ${custodyChain.length} blocks verified with valid mathematical back-links.`
                          : chainVerifyResult.reason}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Vertical Custody Timeline Section ──────────────────────── */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Chain of Custody <span className="font-serif italic text-white/50">Timeline</span>
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Append-only cryptographic ledger with timestamp & actor role authentication
              </p>
            </div>
            <Button size="sm" onClick={() => setEventModalOpen(true)} className="gap-1.5 self-start sm:self-auto">
              <Plus className="w-4 h-4" />
              <span>Add Custody Event</span>
            </Button>
          </div>

          {/* Timeline List with Glowing Connecting Line */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500/60 before:via-emerald-500/30 before:to-emerald-500/10 before:shadow-[0_0_8px_rgba(16,185,129,0.4)]">
            {custodyChain.map((ev) => {
              const isTamperedNode = chainVerifyResult?.brokenAt === ev.seqNo

              return (
                <div key={ev._id || ev.seqNo} className="relative group">
                  {/* Timeline node dot (turns red with pulse if tampered!) */}
                  <div
                    className={`absolute -left-6 top-4 w-5 h-5 rounded-full bg-surface border-2 flex items-center justify-center -translate-x-1/2 transition-all ${
                      isTamperedNode
                        ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_16px_rgba(239,68,68,0.8)] animate-pulse scale-125'
                        : 'border-emerald-500/60 group-hover:border-emerald-400 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isTamperedNode ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  <Card
                    className={`p-5 transition-all ${
                      isTamperedNode
                        ? 'bg-rose-500/5 border-rose-500/50 shadow-lg shadow-rose-500/10'
                        : 'bg-surface/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded border ${
                            isTamperedNode
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                              : 'bg-white/5 text-white/70 border-white/10'
                          }`}
                        >
                          #{ev.seqNo}
                        </span>
                        <h4
                          className={`font-semibold text-sm ${
                            isTamperedNode ? 'text-rose-300' : 'text-white'
                          }`}
                        >
                          {ev.action}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant={getRoleBadgeVariant(ev.actorRole)} size="sm">
                          {ev.actorRole}
                        </Badge>
                        <span className="text-white/60 font-medium">{ev.actor}</span>
                      </div>
                    </div>

                    {ev.details && (
                      <p className="text-xs text-white/70 mb-3 bg-black/40 p-3 rounded-lg border border-white/5 leading-relaxed">
                        {ev.details}
                      </p>
                    )}

                    {/* Monospace previous / entry hash row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-3 border-t border-white/5 text-white/40">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/20">PREV:</span>
                        <HashText hash={ev.prevHash} length={10} className="text-[11px]" />
                      </div>
                      <div className="flex items-center gap-1.5 md:justify-end">
                        <span className="text-white/20">ENTRY HASH:</span>
                        <HashText hash={ev.entryHash} length={10} className="text-[11px]" />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-white/30">
                      <Clock className="w-3 h-3 text-white/20" />
                      <span>IST: {ev.timestampIST}</span>
                    </div>
                  </Card>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Add Custody Event Modal with Presets ─────────────────────── */}
        <Modal
          open={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          title="Append Custody Event"
          description="Log a transfer, laboratory examination, or courtroom presentation in the tamper-evident chain."
        >
          <div className="space-y-4 pt-2">
            {/* Presets Button Group */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">
                Quick Action Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Viewed by lawyer', action: 'Viewed by lawyer', role: 'Lawyer' as const },
                  { label: 'Copied by expert', action: 'Copied by expert', role: 'Expert' as const },
                  { label: 'Sent to court', action: 'Sent to court', role: 'Court' as const },
                  { label: 'Returned', action: 'Returned', role: 'Party' as const },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.action, p.role)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors text-white/70"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4 pt-1">
              <Input
                label="Action Description"
                placeholder="e.g. Viewed by lawyer / Examined at Forensic Lab"
                value={eventForm.action}
                onChange={(e) => setEventForm({ ...eventForm, action: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Actor / Officer Name"
                  placeholder="e.g. Adv. Ravi Sharma / Dr. P. K. Sen"
                  value={eventForm.actor}
                  onChange={(e) => setEventForm({ ...eventForm, actor: e.target.value })}
                  required
                />

                <Select
                  label="Actor Role"
                  value={eventForm.actorRole}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      actorRole: e.target.value as CustodyEvent['actorRole'],
                    })
                  }
                  options={[
                    { value: 'Party', label: 'Party / Custodian' },
                    { value: 'Lawyer', label: 'Lawyer / Advocate' },
                    { value: 'Expert', label: 'Expert / Forensic Analyst' },
                    { value: 'Court', label: 'Court / Registrar' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Custody Event Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of examination, condition of seal, forensic tool used..."
                  value={eventForm.details}
                  onChange={(e) => setEventForm({ ...eventForm, details: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEventModalOpen(false)}
                  disabled={addingEvent}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addingEvent}>
                  {addingEvent ? 'Appending Block...' : 'Append Custody Event'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  )
}
