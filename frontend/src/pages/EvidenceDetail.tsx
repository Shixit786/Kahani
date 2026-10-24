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
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

export default function EvidenceDetail() {
  const { id } = useParams<{ id: string }>()

  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const [custodyChain, setCustodyChain] = useState<CustodyEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Verify File State
  const [verifyFileState, setVerifyFileState] = useState<File | null>(null)
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
      toast.error(err.response?.data?.error || 'Failed to load evidence')
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
        toast.success('Chain of custody intact! All blocks verified.')
      } else {
        toast.error(`Tamper detected at event seqNo #${res.brokenAt}!`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to verify chain')
    } finally {
      setVerifyingChain(false)
    }
  }

  // Verify File Submission
  const handleFileVerification = async (file: File) => {
    if (!id) return
    try {
      setVerifyingFile(true)
      setVerifyFileState(file)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('actor', 'Forensic Auditor')

      const res = await verifyFile(id, formData)
      setFileVerifyResult(res)
      if (res.match) {
        toast.success('Integrity verified! File hash matches stored SHA-256.')
      } else {
        toast.error('Integrity violation! File hash does NOT match.')
      }
      // Re-fetch evidence to show new verification custody event
      loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed')
    } finally {
      setVerifyingFile(false)
    }
  }

  // Trigger Demo Tamper
  const handleDemoTamper = async () => {
    if (!id) return
    try {
      setTampering(true)
      await demoTamper(id)
      toast('Tamper injected into database! Verifying chain...', { icon: '⚠️' })
      // Reload custody events & verify chain immediately
      await loadEvidence()
      const check = await verifyChain(id)
      setChainVerifyResult(check)
      if (!check.ok) {
        toast.error(`Tamper detected! Broken at SeqNo #${check.brokenAt}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Demo tamper failed')
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
      toast.success('Custody event recorded and hashed')
      setEventModalOpen(false)
      setEventForm({ action: '', actor: '', actorRole: 'Expert', details: '' })
      await loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add custody event')
    } finally {
      setAddingEvent(false)
    }
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
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 bg-white/5 rounded" />
            <div className="h-36 bg-surface rounded-2xl border border-white/5" />
            <div className="h-48 bg-surface rounded-2xl border border-white/5" />
          </div>
        </div>
      </div>
    )
  }

  if (!evidence) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Card className="text-center py-12 px-8 max-w-md">
          <p className="text-white/60 mb-4">Evidence item not found</p>
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
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to={`/cases/${evidence.caseId}`}
            className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Case Matter</span>
          </Link>
        </div>

        {/* Evidence Header */}
        <Card className="mb-8 p-6 md:p-8 bg-surface/90 border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="verified" size="sm" className="font-mono gap-1">
                  <Lock className="w-3 h-3" />
                  <span>HASH LOCKED</span>
                </Badge>
                <span className="text-xs text-white/40 font-mono">
                  ID: {evidence._id}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  {getDeviceIcon(evidence.deviceType)}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight break-all">
                    {evidence.filename}
                  </h1>
                  <p className="text-xs text-white/40 mt-0.5">
                    {formatBytes(evidence.sizeBytes)} • {evidence.mimeType || 'Binary file'}
                  </p>
                </div>
              </div>

              {/* Device metadata badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70">
                  <span className="text-white/40">Device:</span> {evidence.deviceType}
                </span>
                {evidence.makeModel && (
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70">
                    <span className="text-white/40">Make/Model:</span> {evidence.makeModel}
                  </span>
                )}
                {evidence.serialNo && (
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 font-mono">
                    <span className="text-white/40">S/N:</span> {evidence.serialNo}
                  </span>
                )}
                {evidence.deviceId && (
                  <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 font-mono">
                    <span className="text-white/40">IMEI/ID:</span> {evidence.deviceId}
                  </span>
                )}
              </div>

              {evidence.notes && (
                <p className="text-xs text-white/60 bg-black/30 p-3 rounded-xl border border-white/5">
                  <span className="text-white/40 font-medium">Notes:</span> {evidence.notes}
                </p>
              )}
            </div>

            {/* Certificate Download Action */}
            <div className="shrink-0 flex flex-col gap-2">
              <a
                href={getCertificateUrl(evidence._id)}
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <Button size="md" className="gap-2 w-full justify-center shadow-lg shadow-emerald-500/10">
                  <Download className="w-4 h-4" />
                  <span>Section 63 BSA Certificate</span>
                </Button>
              </a>
              <p className="text-[11px] text-white/40 text-center">
                Signed forensic PDF with QR Code
              </p>
            </div>
          </div>
        </Card>

        {/* SHA-256 Hash Display Card */}
        <Card className="mb-8 p-6 bg-surface border-white/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                Cryptographic Anchor (SHA-256)
              </h2>
            </div>
            <button
              onClick={copyFullHash}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {hashCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied full hash</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SHA-256 Checksum</span>
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
                Pre-upload client match confirmed: <span className="font-mono text-white/60">{evidence.clientSha256.slice(0, 16)}...</span>
              </span>
            </div>
          )}
        </Card>

        {/* Verification & Integrity Controls (2-column layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 1. File Re-Verification */}
          <Card className="p-6 bg-surface border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">
                  File Integrity Verification
                </h3>
              </div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Provide a file copy to compute its SHA-256 hash in a cleanroom audit and compare it against the sealed record.
              </p>

              {/* File input / dropzone */}
              <div className="relative border border-dashed border-white/15 hover:border-emerald-500/40 rounded-xl p-4 text-center transition-colors bg-black/20">
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileVerification(f)
                  }}
                  disabled={verifyingFile}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <Upload className="w-5 h-5 text-white/30" />
                  <span className="text-xs font-medium text-white/80">
                    {verifyingFile ? 'Computing SHA-256 Hash...' : 'Choose or drop file copy to verify'}
                  </span>
                  <span className="text-[10px] text-white/30">
                    Appends an audit record to custody chain
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
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-sm">
                        {fileVerifyResult.match
                          ? 'Integrity Verified — 100% Match'
                          : 'Tamper Detected — Hash Mismatch!'}
                      </div>
                      <div className="font-mono text-[11px] opacity-80 break-all">
                        Current: {fileVerifyResult.currentHash}
                      </div>
                      {!fileVerifyResult.match && (
                        <div className="font-mono text-[11px] opacity-80 break-all">
                          Original: {fileVerifyResult.originalHash}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 2. Chain Integrity Audit & Tamper Simulation */}
          <Card className="p-6 bg-surface border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">
                  Hash Chain Audit & Verification
                </h3>
              </div>
              <p className="text-xs text-white/50 mb-4 leading-relaxed">
                Audits all {custodyChain.length} blocks in the custody chain. Each event is validated against its previous hash and signature.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={handleVerifyChain}
                  disabled={verifyingChain}
                  className="gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
                  <span>{verifyingChain ? 'Auditing Chain...' : 'Verify Custody Chain'}</span>
                </Button>

                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDemoTamper}
                  disabled={tampering}
                  className="gap-1.5"
                  title="Directly alters event #2 in database to simulate a malicious tamper"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{tampering ? 'Tampering...' : 'Demo Tamper (Inject Fault)'}</span>
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
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-sm">
                        {chainVerifyResult.ok
                          ? 'Chain Cryptographically Sound'
                          : `Tamper Detected at Event #${chainVerifyResult.brokenAt}!`}
                      </div>
                      <div className="opacity-80">
                        {chainVerifyResult.ok
                          ? `All ${custodyChain.length} events verified with valid back-link hashes.`
                          : chainVerifyResult.reason || 'Cryptographic hash chain break detected.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Chain of Custody Timeline Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Chain of Custody <span className="font-serif italic text-white/50">Timeline</span>
              </h2>
              <p className="text-xs text-white/40 mt-0.5">
                Append-only cryptographic ledger with timestamp & actor role authentication
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setEventModalOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Custody Event</span>
            </Button>
          </div>

          {/* Timeline List */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-white/10">
            {custodyChain.map((ev) => (
              <div key={ev._id || ev.seqNo} className="relative group">
                {/* Timeline dot */}
                <div className="absolute -left-6 top-4 w-5 h-5 rounded-full bg-surface border-2 border-emerald-500/60 flex items-center justify-center -translate-x-1/2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>

                <Card className="p-5 bg-surface/80 border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                        #{ev.seqNo}
                      </span>
                      <h4 className="font-semibold text-sm text-white">{ev.action}</h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={getRoleBadgeVariant(ev.actorRole)} size="sm">
                        {ev.actorRole}
                      </Badge>
                      <span className="text-white/60 font-medium">{ev.actor}</span>
                    </div>
                  </div>

                  {ev.details && (
                    <p className="text-xs text-white/70 mb-3 bg-black/30 p-2.5 rounded-lg border border-white/5">
                      {ev.details}
                    </p>
                  )}

                  {/* Hash back-link row */}
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

                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">
                    <Clock className="w-3 h-3 text-white/20" />
                    <span>IST: {ev.timestampIST}</span>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Log Custody Event Modal */}
        <Modal
          isOpen={eventModalOpen}
          onClose={() => setEventModalOpen(false)}
          title="Append Custody Event"
          description="Log a transfer, laboratory examination, or courtroom presentation in the tamper-evident chain."
        >
          <form onSubmit={handleAddEvent} className="space-y-4 pt-2">
            <Input
              label="Action Description"
              placeholder="e.g. Transferred to State Forensic Science Laboratory"
              value={eventForm.action}
              onChange={(e) => setEventForm({ ...eventForm, action: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Actor / Officer Name"
                placeholder="e.g. Dr. P. K. Sen"
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
        </Modal>
      </div>
    </div>
  )
}
