import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  FileCheck2,
  Lock,
  User,
  MapPin,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  ArrowRight,
  ChevronRight,
  HardDrive,
  Cpu,
  Smartphone,
  Cloud,
  HelpCircle,
  Copy,
  Check,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Input from '../components/Input'
import Select from '../components/Select'
import HashText from '../components/HashText'
import { getCaseById, uploadEvidence, type Case, type Evidence } from '../lib/api'

// Compute SHA-256 using standard browser Web Crypto API
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

function formatIST(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return (
      d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }) + ' IST'
    )
  } catch {
    return dateStr
  }
}

function getDeviceIcon(type: string) {
  switch (type) {
    case 'Computer':
      return <Cpu className="w-3.5 h-3.5" />
    case 'Mobile':
      return <Smartphone className="w-3.5 h-3.5" />
    case 'Flash Drive':
      return <HardDrive className="w-3.5 h-3.5" />
    case 'Cloud':
      return <Cloud className="w-3.5 h-3.5" />
    default:
      return <HelpCircle className="w-3.5 h-3.5" />
  }
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [caseData, setCaseData] = useState<(Case & { evidence: Evidence[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  // Upload Evidence Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clientHash, setClientHash] = useState<string>('')
  const [displayedHash, setDisplayedHash] = useState<string>('')
  const [computingHash, setComputingHash] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [declarationAccepted, setDeclarationAccepted] = useState(false)

  // Success / Error Cards inside modal
  const [uploadSuccess, setUploadSuccess] = useState<{
    evidence: Evidence
    lockedAtIST: string
  } | null>(null)
  const [mismatchError, setMismatchError] = useState<{
    clientSha256: string
    serverSha256: string
  } | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)

  const [form, setForm] = useState({
    deviceType: 'Computer' as Evidence['deviceType'],
    makeModel: '',
    serialNo: '',
    deviceId: '',
    uploadedBy: '',
    notes: '',
  })

  const typingTimerRef = useRef<number | null>(null)

  const loadCase = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getCaseById(id)
      setCaseData(data)
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load case matter')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCase()
  }, [loadCase])

  // Clean typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current)
    }
  }, [])

  const handleFileProcess = async (file: File) => {
    setSelectedFile(file)
    setComputingHash(true)
    setClientHash('')
    setDisplayedHash('')
    setMismatchError(null)
    setUploadSuccess(null)

    if (typingTimerRef.current) clearInterval(typingTimerRef.current)

    try {
      const fullHash = await computeBrowserSha256(file)
      setClientHash(fullHash)

      // Live typing effect
      let charIndex = 0
      typingTimerRef.current = window.setInterval(() => {
        charIndex += 2
        if (charIndex <= fullHash.length) {
          setDisplayedHash(fullHash.slice(0, charIndex))
        } else {
          setDisplayedHash(fullHash)
          if (typingTimerRef.current) clearInterval(typingTimerRef.current)
          setComputingHash(false)
        }
      }, 15)
    } catch (e) {
      console.error(e)
      toast.error('Failed to compute client SHA-256 hash')
      setComputingHash(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileProcess(file)
  }

  const resetUploadModal = () => {
    setSelectedFile(null)
    setClientHash('')
    setDisplayedHash('')
    setComputingHash(false)
    setDeclarationAccepted(false)
    setUploadSuccess(null)
    setMismatchError(null)
    setForm({
      deviceType: 'Computer',
      makeModel: '',
      serialNo: '',
      deviceId: '',
      uploadedBy: '',
      notes: '',
    })
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !selectedFile) {
      toast.error('Please choose a file to ingest')
      return
    }

    if (!declarationAccepted) {
      toast.error('You must declare that the evidence is genuine under BNS')
      return
    }

    try {
      setUploading(true)
      setMismatchError(null)

      const formData = new FormData()
      formData.append('file', selectedFile)
      if (clientHash) formData.append('clientSha256', clientHash)
      formData.append('deviceType', form.deviceType)
      formData.append('makeModel', form.makeModel)
      formData.append('serialNo', form.serialNo)
      formData.append('deviceId', form.deviceId)
      formData.append('uploadedBy', form.uploadedBy || 'Investigating Officer')
      formData.append('notes', form.notes)
      formData.append('declarationAccepted', 'true')

      const res = await uploadEvidence(id, formData)
      toast.success('Evidence hash locked & custody chain initialized!')
      setUploadSuccess({
        evidence: res.evidence,
        lockedAtIST: res.lockedAtIST,
      })

      // Refresh table immediately in background
      await loadCase()
    } catch (err: any) {
      if (err.response?.status === 409) {
        setMismatchError({
          clientSha256: err.response.data?.clientSha256 || clientHash,
          serverSha256: err.response.data?.serverSha256 || 'Unknown',
        })
        toast.error('Hash mismatch detected! Upload rejected.')
      } else {
        toast.error(err.response?.data?.error || err.message || 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  const copySuccessHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(true)
    toast.success('SHA-256 hash copied to clipboard')
    setTimeout(() => setCopiedHash(false), 2000)
  }

  // Loading Skeleton View
  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <div className="max-w-6xl mx-auto px-6 space-y-6">
          <div className="h-4 w-28 bg-white/5 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-9 w-2/3 max-w-lg bg-white/10 rounded-lg animate-pulse" />
            <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
          </div>
          <Card className="p-6 bg-surface border-white/5 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-20 bg-white/10 rounded" />
                  <div className="h-5 w-32 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 bg-surface border-white/5 animate-pulse space-y-4">
            <div className="h-4 w-32 bg-white/10 rounded mb-4" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-white/5 rounded-xl w-full" />
            ))}
          </Card>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Card className="text-center py-12 px-8 max-w-md bg-surface border-white/10">
          <p className="text-white/60 mb-4 text-sm">Case matter could not be found.</p>
          <Button size="sm" onClick={() => navigate('/cases')}>
            Return to Cases
          </Button>
        </Card>
      </div>
    )
  }

  const evidenceList = caseData.evidence || []

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/cases"
            className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Cases</span>
          </Link>
        </div>

        {/* ── Case Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono bg-white/5 border border-white/10 text-white/60 mb-2">
              <span>CASE #{caseData._id.slice(-6).toUpperCase()}</span>
            </div>
            {/* Title in serif italic */}
            <h1 className="text-3xl md:text-4xl font-serif italic text-white tracking-tight leading-tight">
              {caseData.title}
            </h1>
            {caseData.description && (
              <p className="text-sm text-white/50 mt-1.5 max-w-3xl leading-relaxed">
                {caseData.description}
              </p>
            )}
          </div>

          <Button
            size="md"
            onClick={() => {
              resetUploadModal()
              setModalOpen(true)
            }}
            className="gap-2 shrink-0 self-start md:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Evidence</span>
          </Button>
        </div>

        {/* ── Party Details Card ─────────────────────────────────────── */}
        <Card className="mb-8 p-6 bg-surface border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-2xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 text-xs">
            {/* Party Name */}
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-emerald-400/80" />
                <span>PARTY / CUSTODIAN</span>
              </div>
              <div className="text-sm font-semibold text-white truncate">
                {caseData.partyName}
              </div>
            </div>

            {/* Party Address */}
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-400/80" />
                <span>DEPARTMENT / ADDRESS</span>
              </div>
              <div className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                {caseData.partyAddress || 'Not specified'}
              </div>
            </div>

            {/* Created IST */}
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-400/80" />
                <span>REGISTERED (IST)</span>
              </div>
              <div className="text-xs font-mono text-white/80">
                {formatIST(caseData.createdAt)}
              </div>
            </div>

            {/* Evidence Count */}
            <div>
              <div className="flex items-center gap-1.5 text-white/40 mb-1.5 font-medium">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400/80" />
                <span>EVIDENCE FILES</span>
              </div>
              <div className="text-sm font-mono font-semibold text-emerald-400">
                {evidenceList.length} {evidenceList.length === 1 ? 'record' : 'records'} locked
              </div>
            </div>
          </div>
        </Card>

        {/* ── Evidence Table Section ─────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Evidence <span className="font-serif italic text-white/50">Register</span>
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Click any item to inspect its custody chain, verify SHA-256 hash, or download the BSA certificate.
            </p>
          </div>
        </div>

        {evidenceList.length === 0 ? (
          /* Elegant Empty State */
          <Card className="flex flex-col items-center justify-center py-20 px-6 text-center border-dashed border-white/10 bg-surface/40">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <HardDrive className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-white/80 font-medium text-base">
              No evidence yet — add the first file to lock its hash
            </h3>
            <p className="text-white/40 text-xs mt-1.5 max-w-md leading-relaxed">
              Upload electronic documents, audio/video recordings, disk dumps, or mobile exports to compute irreversible SHA-256 checksums and initiate the chain of custody.
            </p>
            <Button
              size="sm"
              onClick={() => {
                resetUploadModal()
                setModalOpen(true)
              }}
              className="mt-6 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Evidence</span>
            </Button>
          </Card>
        ) : (
          /* Evidence Table */
          <Card className="overflow-hidden bg-surface border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                {/* Table Header */}
                <thead>
                  <tr className="border-b border-white/10 text-[11px] font-mono uppercase text-white/40 bg-black/20">
                    <th className="py-3.5 px-5">Filename</th>
                    <th className="py-3.5 px-4">SHA-256 Checksum</th>
                    <th className="py-3.5 px-4">Uploaded (IST)</th>
                    <th className="py-3.5 px-4">Uploaded By</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-white/5">
                  {evidenceList.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => navigate(`/evidence/${item._id}`)}
                      className="group cursor-pointer hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Filename & size */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            {getDeviceIcon(item.deviceType)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white group-hover:text-emerald-400 transition-colors truncate max-w-xs md:max-w-sm">
                              {item.filename}
                            </div>
                            <div className="text-[11px] text-white/40 flex items-center gap-2 mt-0.5">
                              <span>{formatBytes(item.sizeBytes)}</span>
                              <span>•</span>
                              <span>{item.deviceType}</span>
                              {item.makeModel && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[120px]">{item.makeModel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* HashText */}
                      <td className="py-4 px-4 font-mono">
                        <HashText hash={item.sha256} length={8} />
                      </td>

                      {/* Uploaded IST Time */}
                      <td className="py-4 px-4 text-white/70 font-mono text-[11px] whitespace-nowrap">
                        {formatIST(item.createdAt)}
                      </td>

                      {/* Uploaded By */}
                      <td className="py-4 px-4 text-white/80 font-medium whitespace-nowrap">
                        {item.uploadedBy || 'Custodian'}
                      </td>

                      {/* Locked Badge */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <Badge variant="verified" size="sm" className="font-mono gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Locked</span>
                        </Badge>
                      </td>

                      {/* Row Action Link */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/80 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Add Evidence Modal (Phase 1) ─────────────────────────────── */}
        <Modal
          open={modalOpen}
          onClose={() => {
            if (!uploading) setModalOpen(false)
          }}
          title="Secure Evidence Ingestion"
          description="Hash locked electronic evidence ingestion with Section 63 BSA compliance."
          maxWidth="lg"
        >
          {uploadSuccess ? (
            /* Success Card: "Hash locked", IST time, full hash with copy */
            <div className="space-y-5 pt-3">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">Hash locked & sealed</h4>
                      <Badge variant="verified" size="sm" className="font-mono">
                        BSA COMPLIANT
                      </Badge>
                    </div>
                    <p className="text-xs text-white/70">
                      The file fingerprint has been irreversibly stamped into the genesis custody event.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/90 pt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Locked at IST: {uploadSuccess.lockedAtIST}</span>
                    </div>
                  </div>
                </div>

                {/* Full SHA-256 Checksum with Copy */}
                <div className="mt-4 pt-3 border-t border-emerald-500/20">
                  <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400/80 mb-1.5">
                    <span>SEALED SHA-256 CHECKSUM</span>
                    <button
                      type="button"
                      onClick={() => copySuccessHash(uploadSuccess.evidence.sha256)}
                      className="inline-flex items-center gap-1 text-white hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? 'Copied' : 'Copy Full Hash'}</span>
                    </button>
                  </div>
                  <div className="p-3 bg-black/60 rounded-xl font-mono text-xs text-emerald-400 break-all select-all border border-emerald-500/20">
                    {uploadSuccess.evidence.sha256}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    resetUploadModal()
                  }}
                >
                  Add Another File
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    navigate(`/evidence/${uploadSuccess.evidence._id}`)
                  }}
                  className="gap-2"
                >
                  <span>Open Evidence Record</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
              {/* 409 Error Card: Red card with both hashes */}
              {mismatchError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Upload Rejected: Hash Mismatch (409 Conflict)</span>
                  </div>
                  <p className="text-xs text-white/70">
                    The SHA-256 calculated by your browser differs from the hash calculated on the server stream. The file has been discarded to protect chain integrity.
                  </p>
                  <div className="bg-black/40 p-2.5 rounded-lg border border-rose-500/20 font-mono text-[11px] space-y-1">
                    <div className="text-white/60">
                      Client Hash: <span className="text-rose-300 break-all">{mismatchError.clientSha256}</span>
                    </div>
                    <div className="text-white/60">
                      Server Hash: <span className="text-rose-300 break-all">{mismatchError.serverSha256}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Drag-and-drop zone with scan animation */}
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Select or Drop Evidence File <span className="text-rose-400">*</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all overflow-hidden ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/10 hover:border-white/20 bg-surface/50'
                  }`}
                >
                  {/* Laser scan animation when computing hash */}
                  {computingHash && (
                    <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse top-0 bottom-0 m-auto shadow-[0_0_12px_#10B981]" />
                  )}

                  <input
                    type="file"
                    id="evidence-file-input"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileProcess(f)
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />

                  {selectedFile ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="font-medium text-sm text-white truncate max-w-xs">
                          {selectedFile.name}
                        </span>
                      </div>
                      <div className="text-xs text-white/40">
                        {formatBytes(selectedFile.size)} • {selectedFile.type || 'Binary data'}
                      </div>

                      {/* Live typing-in SHA-256 preview */}
                      <div className="pt-2 text-left bg-black/50 rounded-lg p-3 border border-white/10 relative">
                        <div className="text-[10px] text-emerald-400 font-mono flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 animate-pulse" />
                            <span>BROWSER SHA-256 (CRYPTO.SUBTLE):</span>
                          </span>
                          {computingHash ? (
                            <span className="text-emerald-400 animate-pulse font-mono text-[10px]">
                              Scanning byte stream...
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[10px] font-mono">100% computed</span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-emerald-300 break-all select-all tracking-wider min-h-[2.5rem] flex items-center">
                          {displayedHash || (
                            <span className="text-white/20 italic text-xs">Computing hash...</span>
                          )}
                          {computingHash && (
                            <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-1 animate-ping" />
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-white/80 font-medium">
                        Drag and drop evidence file here, or click to browse
                      </p>
                      <p className="text-[11px] text-white/30">
                        Supported: WhatsApp exports (.txt), photos, call audio, CCTV video, forensic disk images (up to 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Device Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Select
                  label="Device Type"
                  value={form.deviceType}
                  onChange={(e) =>
                    setForm({ ...form, deviceType: e.target.value as Evidence['deviceType'] })
                  }
                  options={[
                    { value: 'Computer', label: 'Computer / Laptop' },
                    { value: 'Mobile', label: 'Mobile Device' },
                    { value: 'Flash Drive', label: 'Flash Drive / USB' },
                    { value: 'Cloud', label: 'Cloud Storage / Server' },
                    { value: 'Other', label: 'Other Electronic Media' },
                  ]}
                />

                <Input
                  label="Make / Model"
                  placeholder="e.g. Samsung Galaxy A52 / Dell Latitude"
                  value={form.makeModel}
                  onChange={(e) => setForm({ ...form, makeModel: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Serial Number"
                  placeholder="e.g. SN-R5CX501ABCD"
                  value={form.serialNo}
                  onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
                />

                <div>
                  <Input
                    label="IMEI / MAC / Cloud ID"
                    placeholder="e.g. 355123456789012"
                    value={form.deviceId}
                    onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                  />
                  <p className="text-[10px] text-white/30 mt-1">
                    Helper: Dial *#06# on mobile devices to display IMEI
                  </p>
                </div>
              </div>

              <Input
                label="Custodian / Uploaded By"
                placeholder="e.g. Inspector R. Verma / Meena Kumari"
                value={form.uploadedBy}
                onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })}
                required
              />

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Acquisition & Forensic Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Conditions of seizure, physical state, acquisition tool..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              {/* Required Statutory Declaration Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 cursor-pointer group hover:bg-amber-500/10 transition-colors">
                  <input
                    type="checkbox"
                    checked={declarationAccepted}
                    onChange={(e) => setDeclarationAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-surface"
                    required
                  />
                  <span className="text-xs text-white/80 leading-relaxed select-none">
                    <span className="font-semibold text-amber-400">Statutory Declaration:</span> I declare this evidence is genuine. Fabricating false evidence is a punishable offence under Bharatiya Nyaya Sanhita (BNS).
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploading || !selectedFile || computingHash || !declarationAccepted}
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>{uploading ? 'Locking Hash & Securing...' : 'Secure & Lock Hash'}</span>
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  )
}
