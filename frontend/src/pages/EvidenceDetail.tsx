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
  Phone,
  FileText,
  MessageSquare,
  ShieldAlert,
  GitCompare,
  ExternalLink,
  ChevronRight,
  Info,
  Radio,
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
  getAnalysis,
  updateSenderMap,
  updateCorroboration,
  uploadCounterpart,
  uploadReexport,
  getLegalRequestDraft,
  getTsr,
  type Evidence,
  type CustodyEvent,
  type VerifyFileResult,
  type VerifyChainResult,
  type AnalysisResult,
  type ChatDiffResult,
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

function getRoleBadgeVariant(role: string): 'verified' | 'tampered' | 'warning' | 'neutral' | 'party' | 'lawyer' | 'expert' | 'court' {
  switch (role) {
    case 'Court':
      return 'court'
    case 'Expert':
      return 'expert'
    case 'Lawyer':
      return 'lawyer'
    case 'Party':
      return 'party'
    default:
      return 'neutral'
  }
}

// Side-by-side hash comparison with differing characters highlighted
function DiffHashDisplay({ original, current }: { original: string; current: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs pt-2">
      <div className="bg-ink p-3 rounded-xl border border-ink/20 space-y-1">
        <div className="text-[10px] text-cream/60 uppercase font-semibold">Original Stored Hash</div>
        <div className="text-gold break-all select-all leading-relaxed">{original}</div>
      </div>
      <div className="bg-ink p-3 rounded-xl border border-status-tampered/40 space-y-1">
        <div className="text-[10px] text-status-tampered uppercase font-semibold">
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
                    ? 'bg-status-tampered text-white font-bold px-0.5 rounded shadow-sm'
                    : 'text-cream/80'
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

  // Active Forensic Tab
  const [forensicTab, setForensicTab] = useState<'messages' | 'report' | 'senders' | 'corroboration' | 'diff'>('messages')

  // Analysis State (Phase 4 & 5)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  // TSR info (Phase 7)
  const [tsrInfo, setTsrInfo] = useState<{ tsaStatus: string; tsaTime: string | null } | null>(null)

  // Sender Map inputs
  const [phoneInputs, setPhoneInputs] = useState<Record<string, string>>({})
  const [savingPhone, setSavingPhone] = useState<string | null>(null)

  // Legal Request Draft Modal
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [draftType, setDraftType] = useState<'kyc' | 'cdr'>('kyc')
  const [draftContent, setDraftContent] = useState('')
  const [loadingDraft, setLoadingDraft] = useState(false)
  const [copiedDraft, setCopiedDraft] = useState(false)

  // Compare / Diff State (Phase 5)
  const [diffSubTab, setDiffSubTab] = useState<'counterpart' | 'reexport'>('counterpart')
  const [diffResult, setDiffResult] = useState<ChatDiffResult | null>(null)
  const [uploadingDiff, setUploadingDiff] = useState(false)

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

      // Fetch TSR status
      getTsr(id).then((t) => setTsrInfo(t)).catch(() => {})

      // Fetch Analysis if text/WhatsApp file
      if (data.evidence.filename.endsWith('.txt') || data.evidence.mimeType.includes('text')) {
        setLoadingAnalysis(true)
        getAnalysis(id)
          .then((res) => {
            setAnalysis(res)
            // Initialize phone inputs
            const initialInputs: Record<string, string> = {}
            res.senders.forEach((s) => {
              initialInputs[s.label] = s.phoneNumber || ''
            })
            setPhoneInputs(initialInputs)
          })
          .catch((e) => console.error(e))
          .finally(() => setLoadingAnalysis(false))
      }
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

  // Save Sender Phone Mapping
  const handleSavePhone = async (label: string) => {
    if (!id) return
    const phoneNumber = phoneInputs[label]
    try {
      setSavingPhone(label)
      await updateSenderMap(id, { label, phoneNumber, actor: 'Forensic Analyst' })
      toast.success(`Sender "${label}" mapped to ${phoneNumber || 'pending'}`)
      await loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save phone mapping')
    } finally {
      setSavingPhone(null)
    }
  }

  // Update Corroboration Item
  const handleToggleCorroboration = async (itemKey: string, currentStatus: string) => {
    if (!id) return
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    try {
      await updateCorroboration(id, itemKey, {
        status: newStatus,
        by: 'Forensic Investigator',
        note: `Status updated to ${newStatus}`,
      })
      toast.success(`Corroboration updated: ${itemKey}`)
      await loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update corroboration')
    }
  }

  // Open Legal Request Draft Modal
  const handleOpenDraft = async (type: 'kyc' | 'cdr') => {
    if (!id) return
    setDraftType(type)
    setDraftModalOpen(true)
    setLoadingDraft(true)
    try {
      const text = await getLegalRequestDraft(id, type)
      setDraftContent(text)
    } catch {
      toast.error('Failed to generate draft')
    } finally {
      setLoadingDraft(false)
    }
  }

  // Upload Counterpart or Re-export for Diff
  const handleDiffUpload = async (file: File) => {
    if (!id) return
    try {
      setUploadingDiff(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadedBy', diffSubTab === 'counterpart' ? 'Counterpart Party' : 'Forensic Custodian')
      formData.append('witness', 'Certified Auditor')

      let res: any
      if (diffSubTab === 'counterpart') {
        res = await uploadCounterpart(id, formData)
      } else {
        res = await uploadReexport(id, formData)
      }

      setDiffResult(res.diff)
      toast.success(`${diffSubTab === 'counterpart' ? 'Counterpart' : 'Fresh re-export'} analyzed and diff generated!`)
      await loadEvidence()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to analyze diff')
    } finally {
      setUploadingDiff(false)
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

  const currentTrust = analysis?.trustLevel || evidence.trustLevel || 'LOW'

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        {/* Back Link to Case */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={`/cases/${evidence.caseId}`}
            className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Case Matter</span>
          </Link>

          {/* Public Verification Link (Phase 7) */}
          <Link
            to={`/verify/${evidence._id}`}
            className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-white font-medium transition-colors"
          >
            <span>Public Verification Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── Info Card (File, Size, Hash, Device Details, Notes, Uploader) ── */}
        <Card className="mb-8 p-6 md:p-8 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
            <div className="space-y-4 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="verified" size="sm" className="font-mono">
                  HASH LOCKED
                </Badge>

                {/* Phase 6: Trust Badge — Cream pill with colored dot + colored text */}
                <div className="group relative">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium bg-cream border border-cream-deep shadow-sm cursor-help ${
                      currentTrust === 'HIGH'
                        ? 'text-[#2E7D5B]'
                        : currentTrust === 'MEDIUM'
                        ? 'text-[#A8741A]'
                        : 'text-[#C22830]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        currentTrust === 'HIGH'
                          ? 'bg-[#3FA27A]'
                          : currentTrust === 'MEDIUM'
                          ? 'bg-[#D9A441]'
                          : 'bg-[#E5484D]'
                      }`}
                    />
                    <span>
                      {currentTrust === 'HIGH'
                        ? 'High — Expert Verified'
                        : currentTrust === 'MEDIUM'
                        ? 'Medium — Corroborated'
                        : 'Low — Self-reported (Needs Verification)'}
                    </span>
                  </span>

                  {/* Tooltip */}
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-72 p-3 bg-cream text-ink border border-cream-deep rounded-xl text-[11px] shadow-cream z-30 font-normal leading-relaxed">
                    Trust comes from independent sources (telecom KYC, counterpart exports, device forensics), not from the file itself.
                  </div>
                </div>

                {/* Phase 7: RFC 3161 TSA Badge — Cream pill */}
                <Badge variant="neutral" size="sm" className="font-mono">
                  <Radio className="w-3 h-3 mr-1 text-gold" />
                  <span>RFC 3161 TSA {tsrInfo?.tsaStatus === 'verified' ? 'Stamped' : 'Anchor'}</span>
                </Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gold shrink-0">
                  {getDeviceIcon(evidence.deviceType)}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-medium text-white tracking-tight break-all">
                    Evidence <span className="font-serif-italic font-normal text-gold">{evidence.filename}</span>
                  </h1>
                  <p className="text-xs text-white/60 mt-1 font-light">
                    {formatBytes(evidence.sizeBytes)} • {evidence.mimeType || 'Binary file'} • Uploaded by{' '}
                    <span className="text-white font-medium">{evidence.uploadedBy}</span>
                  </p>
                </div>
              </div>

              {/* Device Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="text-white/40 text-[10px] font-mono uppercase">Device Type</div>
                  <div className="text-white font-medium mt-0.5">{evidence.deviceType}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="text-white/40 text-[10px] font-mono uppercase">Make / Model</div>
                  <div className="text-white font-medium mt-0.5 truncate">
                    {evidence.makeModel || 'Not recorded'}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="text-white/40 text-[10px] font-mono uppercase">Serial No</div>
                  <div className="text-white font-mono mt-0.5 truncate">
                    {evidence.serialNo || 'N/A'}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                  <div className="text-white/40 text-[10px] font-mono uppercase">IMEI / Device ID</div>
                  <div className="text-white font-mono mt-0.5 truncate">
                    {evidence.deviceId || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {evidence.notes && (
                <div className="text-xs text-white/80 bg-white/[0.03] p-3.5 rounded-xl border border-white/10 leading-relaxed font-light">
                  <span className="text-gold font-medium uppercase text-[10px] block mb-1">
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
                <Button size="md" className="w-full justify-center">
                  <span>Download Certificate (Draft)</span>
                </Button>
              </a>
              <p className="text-[11px] text-ink font-medium text-center leading-tight bg-cream p-2.5 rounded-xl border border-cream-deep">
                Draft — must be reviewed and signed by party & expert (Section 63 BSA)
              </p>
            </div>
          </div>
        </Card>

        {/* ── Sealed SHA-256 Checksum Display Card (Cream Card Pop) ──── */}
        <div className="mb-8 p-6 rounded-card bg-cream text-ink border border-cream-deep shadow-cream">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gold" />
              <h2 className="text-xs font-semibold text-ink tracking-wider uppercase font-mono">
                Sealed SHA-256 Checksum (Cryptographic Anchor)
              </h2>
            </div>
            <button
              type="button"
              onClick={copyFullHash}
              className="inline-flex items-center gap-1.5 text-xs text-ink hover:text-gold font-medium transition-colors cursor-pointer"
            >
              {hashCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#3FA27A]" />
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

          <div className="p-3.5 rounded-xl bg-ink text-cream border border-ink/20 font-mono text-xs md:text-sm break-all select-all tracking-wider shadow-inner">
            {evidence.sha256}
          </div>

          {evidence.clientSha256 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-ink/75 font-light">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>
                Pre-upload client match confirmed:{' '}
                <span className="font-mono text-ink font-medium">
                  {evidence.clientSha256.slice(0, 16)}...
                </span>
              </span>
            </div>
          )}
        </div>


        {/* ── Phase 6: WhatsApp Forensics Suite ──────────────────────── */}
        {analysis && (
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-medium text-white">
                  WhatsApp <span className="font-serif-italic font-normal text-gold">Forensic Suite</span>
                </h2>
                <p className="text-xs text-white/60 mt-0.5 font-light">
                  Content classification, sender mapping, red flags, corroboration checklist & diff audit
                </p>
              </div>

              {/* Forensic Navigation Tabs — Pill styled */}
              <div className="flex items-center gap-1.5 p-1 bg-white/[0.04] rounded-full border border-white/10 text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setForensicTab('messages')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                    forensicTab === 'messages'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Messages ({analysis.messages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setForensicTab('report')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                    forensicTab === 'report'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <span>Flags</span>
                  {analysis.redFlags.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-status-tampered/20 text-status-tampered font-bold">
                      {analysis.redFlags.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setForensicTab('senders')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                    forensicTab === 'senders'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Who are these people?
                </button>
                <button
                  type="button"
                  onClick={() => setForensicTab('corroboration')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                    forensicTab === 'corroboration'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Corroboration
                </button>
                <button
                  type="button"
                  onClick={() => setForensicTab('diff')}
                  className={`px-4 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                    forensicTab === 'diff'
                      ? 'bg-cream text-ink shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare Diff</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Messages View with WhatsApp bubble styling */}
            {forensicTab === 'messages' && (
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-white/50 pb-3 border-b border-white/5 font-light">
                  <span>Chat Timeline (Hover over any message bubble to view line-level SHA-256 hash)</span>
                  <div className="flex items-center gap-3">
                    <span>{analysis.deletions} deletions</span>
                    <span>•</span>
                    <span>{analysis.edits} edits</span>
                  </div>
                </div>


                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {analysis.messages.map((m) => {
                    const isSystem = m.type === 'system'
                    const isDeleted = m.type === 'deleted'
                    const isEdited = m.type === 'edited'
                    const isSecurityChange =
                      m.text.includes('security code') || m.text.includes('phone number')

                    if (isSecurityChange) {
                      return (
                        <div
                          key={m.lineIndex}
                          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-300 font-medium"
                        >
                          ⚠️ {m.text} — Sender changed device or reinstalled WhatsApp
                        </div>
                      )
                    }

                    if (isSystem) {
                      return (
                        <div
                          key={m.lineIndex}
                          className="py-1 px-3 rounded-full bg-white/5 text-center text-[11px] text-white/40 max-w-md mx-auto"
                        >
                          {m.text}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={m.lineIndex}
                        className={`group relative flex flex-col p-3 rounded-2xl max-w-lg transition-all ${
                          isDeleted
                            ? 'bg-white/5 border border-white/5 text-white/40 italic'
                            : 'bg-white/[0.07] border border-white/10 hover:border-emerald-500/30'
                        }`}
                      >
                        {/* Bubble Header */}
                        <div className="flex items-center justify-between gap-2 mb-1 text-[11px]">
                          <span className="font-semibold text-emerald-400/90">{m.sender}</span>
                          <span className="text-white/30 font-mono text-[10px]">
                            {m.date} {m.time}
                          </span>
                        </div>

                        {/* Bubble Body */}
                        <div className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                          {isDeleted ? (
                            <span className="flex items-center gap-1.5 text-white/40">
                              <span>Deleted at {m.time}</span>
                            </span>
                          ) : (
                            m.text
                          )}
                        </div>

                        {/* Edited badge */}
                        {isEdited && (
                          <div className="mt-1 self-end">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-amber-300">
                              edited (original unknown)
                            </span>
                          </div>
                        )}

                        {/* Hover Line Hash */}
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/30 opacity-60 group-hover:opacity-100 transition-opacity">
                          <span>LINE #{m.lineIndex} HASH:</span>
                          <HashText hash={m.lineHash} length={8} className="text-[10px]" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* TAB 2: Forensic Report (Red Flags) */}
            {forensicTab === 'report' && (
              <Card className="p-6 bg-surface border-white/10 space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Forensic Notice:</strong> Red flags guide the expert — they do not prove fabrication. Every anomaly should be corroborated with CDR or device images.
                  </span>
                </div>

                <div className="space-y-3">
                  {analysis.redFlags.length === 0 ? (
                    <div className="text-center py-8 text-xs text-white/50">
                      No obvious forensic anomalies detected in export structure.
                    </div>
                  ) : (
                    analysis.redFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white">{flag.title}</h4>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              flag.severity === 'HIGH'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : flag.severity === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {flag.severity} SEVERITY
                          </span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">{flag.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* TAB 3: "Who are these people?" Sender Phone Mapping */}
            {forensicTab === 'senders' && (
              <Card className="p-6 bg-surface border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Participant Identity & MSISDN Mapping</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      Helper: WhatsApp → open chat → tap name → Contact info
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm" className="self-start sm:self-auto font-mono">
                    {analysis.senders.length} Senders Found
                  </Badge>
                </div>

                <div className="space-y-3">
                  {analysis.senders.map((s) => {
                    const isSavedNumber = /^[+]?[\d\s-]{10,}$/.test(s.phoneNumber)

                    return (
                      <div
                        key={s.label}
                        className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{s.label}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5">
                              {s.source === 'in-file' ? 'Extracted from file' : 'User entered'}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40">
                            {s.phoneNumber
                              ? `Phone MSISDN: ${s.phoneNumber}`
                              : 'Warning: Contact saved by name only — phone number required for CDR requisition.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="e.g. +91 98765 43210"
                            value={phoneInputs[s.label] ?? ''}
                            onChange={(e) =>
                              setPhoneInputs({ ...phoneInputs, [s.label]: e.target.value })
                            }
                            className="w-48 text-xs font-mono"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSavePhone(s.label)}
                            disabled={savingPhone === s.label}
                          >
                            {savingPhone === s.label ? 'Saving...' : 'Save Phone'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* TAB 4: Corroboration Checklist (Phase 5) */}
            {forensicTab === 'corroboration' && (
              <Card className="p-6 bg-surface border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Corroboration Verification Checklist</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      Trust score increases only as independent corroboration items are marked completed.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDraft('kyc')}>
                      Draft KYC Notice
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDraft('cdr')}>
                      Draft CDR Requisition
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: 'senderNumberRecorded', title: 'Sender Phone Number Documented', desc: 'True MSISDN verified from chat contact info card.' },
                    { key: 'counterpartMatch', title: 'Counterpart Phone Export Matched', desc: 'Export from other party matches timestamp & text window.' },
                    { key: 'freshReexport', title: 'Fresh Device Re-export Obtained', desc: 'Direct acquisition under independent supervision.' },
                    { key: 'telecomKyc', title: 'Telecom KYC & CAF Certified', desc: 'Subscriber registration form certified by Nodal Officer under Sec 94 BNSS.' },
                    { key: 'cdrLocation', title: 'CDR & Cell Tower Location Corroboration', desc: 'Call Detail Records corroborate active device connection.' },
                    { key: 'deviceForensics', title: 'Physical Device Forensics (Cellebrite / UFED)', desc: 'Bit-stream image extracted and verified on write-blocker.' },
                    { key: 'expertCertificate', title: 'Independent Section 63 BSA Expert Certificate', desc: 'Forensic analyst issued formal certificate under Section 63(4)(c) BSA.' },
                  ].map((item) => {
                    const statusObj = (analysis.corroboration as any)?.[item.key]
                    const isDone = statusObj?.status === 'done'

                    return (
                      <div
                        key={item.key}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          isDone
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : 'bg-black/30 border-white/5'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{item.title}</span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                isDone
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-white/5 text-white/40'
                              }`}
                            >
                              {isDone ? 'COMPLETED' : 'PENDING'}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40">{item.desc}</p>
                          {statusObj?.at && (
                            <div className="text-[10px] font-mono text-white/30 pt-0.5">
                              Verified by: {statusObj.by || 'Auditor'} on {statusObj.at}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant={isDone ? 'ghost' : 'primary'}
                          onClick={() => handleToggleCorroboration(item.key, statusObj?.status || 'pending')}
                        >
                          {isDone ? 'Mark Pending' : 'Mark Done'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* TAB 5: Compare Diff Panel (Phase 5 - Cream Panel) */}
            {forensicTab === 'diff' && (
              <div className="p-6 rounded-card bg-cream text-ink border border-cream-deep shadow-cream space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cream-deep">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      Cryptographic Chat <span className="font-serif-italic font-normal">Diff Engine</span>
                    </h3>
                    <p className="text-xs text-ink/70 mt-0.5 font-light">
                      Upload a counterpart export or fresh re-export to align messages within the original window.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-cream-deep/60 rounded-full border border-cream-deep text-xs">
                    <button
                      type="button"
                      onClick={() => setDiffSubTab('counterpart')}
                      className={`px-3 py-1 rounded-full font-medium transition-colors ${
                        diffSubTab === 'counterpart' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                      }`}
                    >
                      Counterpart Chat
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiffSubTab('reexport')}
                      className={`px-3 py-1 rounded-full font-medium transition-colors ${
                        diffSubTab === 'reexport' ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink'
                      }`}
                    >
                      Fresh Re-export
                    </button>
                  </div>
                </div>

                {/* Upload dropzone for counterpart / re-export */}
                <div className="relative border-2 border-dashed border-ink/20 hover:border-gold rounded-2xl p-5 text-center transition-colors bg-white/70 hover:bg-white">
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleDiffUpload(f)
                    }}
                    disabled={uploadingDiff}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-5 h-5 text-ink/40" />
                    <span className="text-xs font-semibold text-ink">
                      {uploadingDiff
                        ? 'Aligning and computing diff...'
                        : `Drop or browse ${diffSubTab} export (.txt)`}
                    </span>
                    <span className="text-[10px] text-ink/60 font-light">
                      Preserved as linked evidence and cross-compared against master
                    </span>
                  </div>
                </div>

                {/* Diff Result View */}
                {diffResult && (
                  <div className="space-y-4 pt-3">
                    {/* Summary Bar */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-cream-deep text-ink">
                        <div className="text-ink/50 text-[10px] font-semibold">UNCHANGED</div>
                        <div className="text-base font-bold font-mono">
                          {diffResult.summary.unchanged}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FEF8EC] border border-[#D9A441]/40 text-[#A8741A]">
                        <div className="text-[10px] font-semibold">MODIFIED</div>
                        <div className="text-base font-bold font-mono">
                          {diffResult.summary.modified}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FDECEC] border border-[#E5484D]/40 text-[#C22830]">
                        <div className="text-[10px] font-semibold">REMOVED</div>
                        <div className="text-base font-bold font-mono">
                          {diffResult.summary.removed}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#EAF5EF] border border-[#3FA27A]/40 text-[#2E7D5B]">
                        <div className="text-[10px] font-semibold">ADDED</div>
                        <div className="text-base font-bold font-mono">
                          {diffResult.summary.added}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#A8741A] italic">
                      Notice: Removed messages may indicate editing before upload. Confirm with physical device forensics.
                    </p>

                    {/* Aligned Messages Table */}
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {diffResult.aligned.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs grid grid-cols-1 md:grid-cols-2 gap-3 ${
                            item.status === 'removed'
                              ? 'bg-[#FDECEC] border-[#E5484D]/30 text-ink'
                              : item.status === 'added'
                              ? 'bg-[#EAF5EF] border-[#3FA27A]/30 text-ink'
                              : item.status === 'modified'
                              ? 'bg-[#FEF8EC] border-[#D9A441]/30 text-ink'
                              : 'bg-white border-cream-deep text-ink'
                          }`}
                        >
                          <div>
                            <div className="text-[10px] text-ink/50 mb-1 font-semibold">
                              MASTER CHAT ({item.original ? `${item.original.date} ${item.original.time}` : 'NONE'})
                            </div>
                            <div className="text-ink/85">
                              {item.original ? item.original.text : <span className="text-ink/40 italic">Not present</span>}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] text-ink/50 mb-1 font-semibold">
                              COUNTERPART ({item.counterpart ? `${item.counterpart.date} ${item.counterpart.time}` : 'NONE'})
                            </div>
                            <div>
                              {item.status === 'modified' && item.diff ? (
                                <div className="leading-relaxed">
                                  {item.diff.map((d, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className={
                                        d.type === 'removed'
                                          ? 'bg-[#FDECEC] text-[#C22830] border border-[#E5484D]/30 line-through px-1 rounded mr-0.5'
                                          : d.type === 'added'
                                          ? 'bg-[#EAF5EF] text-[#2E7D5B] border border-[#3FA27A]/30 font-semibold px-1 rounded mr-0.5'
                                          : 'text-ink/85'
                                      }
                                    >
                                      {d.value}
                                    </span>
                                  ))}
                                </div>
                              ) : item.counterpart ? (
                                <span className="text-ink/85">{item.counterpart.text}</span>
                              ) : (
                                <span className="text-[#C22830] italic font-medium">Omitted in counterpart export</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Verification & Integrity Controls (2-column layout) ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 1. Verify File Drop Zone */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="w-4 h-4 text-gold" />
                <h3 className="text-base font-medium text-white">Verify File Integrity</h3>
              </div>
              <p className="text-xs text-white/60 mb-4 leading-relaxed font-light">
                Drop a file copy to compute its fresh SHA-256 hash and cross-verify byte-for-byte against the sealed anchor.
              </p>

              {/* File input / dropzone */}
              <div className="relative border border-dashed border-white/20 hover:border-gold/40 rounded-xl p-4 text-center transition-colors bg-white/[0.03]">
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
                  <Upload className="w-5 h-5 text-white/40" />
                  <span className="text-xs font-medium text-white/90">
                    {verifyingFile ? 'Computing cleanroom hash...' : 'Drop or browse file to verify'}
                  </span>
                  <span className="text-[10px] text-white/40 font-light">
                    Calculates fresh SHA-256 in memory without persisting
                  </span>
                </div>
              </div>

              {/* Verification Result Banner */}
              {fileVerifyResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border transition-all ${
                    fileVerifyResult.match
                      ? 'bg-[#EAF5EF] border-[#3FA27A]/30 text-ink'
                      : 'bg-[#FDECEC] border-[#E5484D]/40 text-ink'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {fileVerifyResult.match ? (
                      <CheckCircle2 className="w-5 h-5 text-[#3FA27A] shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1 text-xs w-full">
                      <div className="font-semibold text-sm">
                        {fileVerifyResult.match ? 'Integrity Verified ✓' : 'File Altered ✗'}
                      </div>
                      <p className="text-xs text-ink/80">
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
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-gold" />
                <h3 className="text-base font-medium text-white">Custody Chain Integrity</h3>
              </div>
              <p className="text-xs text-white/60 mb-4 leading-relaxed font-light">
                Verifies every link in the append-only ledger ({custodyChain.length} events). Checks
                cryptographic back-links and entry hashes.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={handleVerifyChain}
                  disabled={verifyingChain}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingChain ? 'animate-spin' : ''}`} />
                  <span>{verifyingChain ? 'Auditing chain...' : 'Verify Chain'}</span>
                </Button>

                {/* Ghost "Simulate Tamper" button */}
                <button
                  type="button"
                  onClick={handleDemoTamper}
                  disabled={tampering}
                  className="px-4 py-2 rounded-full text-xs font-medium border border-status-tampered/40 text-status-tampered hover:bg-status-tampered/10 transition-colors inline-flex items-center gap-1.5"
                  title="Alters event #2 in database to demonstrate tamper detection"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{tampering ? 'Tampering...' : 'Simulate Tamper'}</span>
                </button>
              </div>

              {/* Chain Result Banner */}
              {chainVerifyResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border transition-all ${
                    chainVerifyResult.ok
                      ? 'bg-[#EAF5EF] border-[#3FA27A]/30 text-ink'
                      : 'bg-[#FDECEC] border-[#E5484D]/40 text-ink'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {chainVerifyResult.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-[#3FA27A] shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-[#E5484D] shrink-0 mt-0.5 animate-bounce" />
                    )}
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-sm">
                        {chainVerifyResult.ok
                          ? `Chain intact — ${custodyChain.length} entries verified`
                          : `Tampering detected at entry #${chainVerifyResult.brokenAt}`}
                      </div>
                      <div className="text-ink/80">
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
              <h2 className="text-xl font-medium text-white">
                Chain of Custody <span className="font-serif-italic font-normal text-gold">Timeline</span>
              </h2>
              <p className="text-xs text-white/60 mt-0.5 font-light">
                Append-only cryptographic ledger with timestamp & actor role authentication
              </p>
            </div>
            <Button size="sm" onClick={() => setEventModalOpen(true)} className="self-start sm:self-auto">
              <span>Add Custody Event</span>
            </Button>
          </div>

          {/* Timeline List with Glowing Gold Connecting Line */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-gold/70 before:via-gold/30 before:to-transparent before:shadow-[0_0_8px_rgba(201,163,91,0.4)]">
            {custodyChain.map((ev) => {
              const isTamperedNode = chainVerifyResult?.brokenAt === ev.seqNo

              return (
                <div key={ev._id || ev.seqNo} className="relative group">
                  {/* Timeline node dot (turns red with pulse if tampered!) */}
                  <div
                    className={`absolute -left-6 top-4 w-5 h-5 rounded-full bg-maroon-deep border-2 flex items-center justify-center -translate-x-1/2 transition-all ${
                      isTamperedNode
                        ? 'border-status-tampered bg-status-tampered/20 shadow-[0_0_16px_rgba(229,72,77,0.8)] animate-pulse scale-125'
                        : 'border-gold/70 group-hover:border-gold group-hover:shadow-[0_0_10px_rgba(201,163,91,0.5)]'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isTamperedNode ? 'bg-status-tampered animate-ping' : 'bg-gold'
                      }`}
                    />
                  </div>

                  <div
                    className={`p-5 rounded-card transition-all ${
                      isTamperedNode
                        ? 'bg-[#FDECEC] border-2 border-status-tampered shadow-lg shadow-status-tampered/25 animate-pulse text-ink'
                        : 'bg-cream text-ink border border-cream-deep shadow-cream hover:shadow-lg'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs px-2.5 py-0.5 rounded-full border ${
                            isTamperedNode
                              ? 'bg-status-tampered/20 text-status-tampered border-status-tampered/40 font-bold'
                              : 'bg-white text-ink border-cream-deep font-semibold'
                          }`}
                        >
                          #{ev.seqNo}
                        </span>
                        <h4
                          className={`font-medium text-sm ${
                            isTamperedNode ? 'text-status-tampered font-bold' : 'text-ink'
                          }`}
                        >
                          {ev.action}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant={getRoleBadgeVariant(ev.actorRole)} size="sm">
                          {ev.actorRole}
                        </Badge>
                        <span className="text-ink font-semibold">{ev.actor}</span>
                      </div>
                    </div>

                    {ev.details && (
                      <p className="text-xs text-ink/85 mb-3 bg-white/70 p-3 rounded-xl border border-cream-deep leading-relaxed font-light">
                        {ev.details}
                      </p>
                    )}

                    {/* Monospace previous / entry hash row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-3 border-t border-cream-deep text-ink/65">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink/50 font-semibold">PREV:</span>
                        <HashText hash={ev.prevHash} length={10} className="text-[11px] text-ink" />
                      </div>
                      <div className="flex items-center gap-1.5 md:justify-end">
                        <span className="text-ink/50 font-semibold">ENTRY HASH:</span>
                        <HashText hash={ev.entryHash} length={10} className="text-[11px] text-ink" />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-ink/60 font-light">
                      <Clock className="w-3 h-3 text-gold" />
                      <span>IST: {ev.timestampIST}</span>
                    </div>
                  </div>
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
              <label className="block text-xs font-medium text-ink mb-1.5">
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
                    className="px-3 py-1 text-xs rounded-full bg-white/80 border border-ink/20 hover:border-gold hover:bg-white text-ink transition-colors font-medium"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4 pt-1">
              <Input
                variant="light"
                label="Action Description"
                placeholder="e.g. Viewed by lawyer / Examined at Forensic Lab"
                value={eventForm.action}
                onChange={(e) => setEventForm({ ...eventForm, action: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  variant="light"
                  label="Actor / Officer Name"
                  placeholder="e.g. Adv. Ravi Sharma / Dr. P. K. Sen"
                  value={eventForm.actor}
                  onChange={(e) => setEventForm({ ...eventForm, actor: e.target.value })}
                  required
                />

                <Select
                  variant="light"
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
                <label className="block text-xs font-medium text-ink mb-1.5">
                  Custody Event Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Details of examination, condition of seal, forensic tool used..."
                  value={eventForm.details}
                  onChange={(e) => setEventForm({ ...eventForm, details: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/80 border border-ink/20 rounded-xl text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  disabled={addingEvent}
                  className="px-5 py-2 rounded-full text-xs font-medium text-ink/70 hover:text-ink hover:underline transition-colors"
                >
                  Cancel
                </button>
                <Button type="submit" disabled={addingEvent}>
                  <span>{addingEvent ? 'Appending Block...' : 'Append Custody Event'}</span>
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* ── Legal Request Draft Modal (CAF / CDR) ──────────────────── */}
        <Modal
          open={draftModalOpen}
          onClose={() => setDraftModalOpen(false)}
          title={draftType === 'cdr' ? 'Formal Notice: Call Detail Records (CDR)' : 'Formal Requisition: Subscriber KYC / CAF'}
          description="Draft notice under Section 94 BNSS to Telecom Service Provider for electronic evidence corroboration."
          maxWidth="lg"
        >
          <div className="space-y-4 pt-2">
            {loadingDraft ? (
              <div className="py-12 text-center text-xs text-ink/60 animate-pulse">
                Generating official requisition draft...
              </div>
            ) : (
              <div className="space-y-3">
                <pre className="p-4 bg-ink text-cream rounded-xl border border-ink/20 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto select-all shadow-inner">
                  {draftContent}
                </pre>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <span className="text-[11px] text-ink/75 font-light">
                    Draft notice — to be issued only by the competent authority under due legal process.
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(draftContent)
                      setCopiedDraft(true)
                      toast.success('Draft notice copied to clipboard')
                      setTimeout(() => setCopiedDraft(false), 2000)
                    }}
                  >
                    <span>{copiedDraft ? 'Copied' : 'Copy Draft'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  )
}

