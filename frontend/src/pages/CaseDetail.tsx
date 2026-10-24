import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  FolderOpen,
  ArrowLeft,
  Plus,
  FileText,
  HardDrive,
  Cpu,
  Smartphone,
  Cloud,
  HelpCircle,
  Calendar,
  User,
  MapPin,
  Upload,
  CheckCircle2,
  Lock,
  ArrowRight,
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

// Compute SHA-256 using standard Web Crypto API
async function computeBrowserSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

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

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [caseData, setCaseData] = useState<(Case & { evidence: Evidence[] }) | null>(null)
  const [loading, setLoading] = useState(true)

  // Upload Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [clientHash, setClientHash] = useState<string>('')
  const [computingHash, setComputingHash] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({
    deviceType: 'Computer' as Evidence['deviceType'],
    makeModel: '',
    serialNo: '',
    deviceId: '',
    uploadedBy: '',
    notes: '',
  })

  const loadCase = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await getCaseById(id)
      setCaseData(data)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCase()
  }, [loadCase])

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      setSelectedFile(null)
      setClientHash('')
      return
    }

    setSelectedFile(file)
    setComputingHash(true)
    try {
      const hash = await computeBrowserSha256(file)
      setClientHash(hash)
    } catch (e) {
      console.error(e)
      toast.error('Failed to compute client hash')
    } finally {
      setComputingHash(false)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !selectedFile) {
      toast.error('Please choose a file to upload')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (clientHash) formData.append('clientSha256', clientHash)
      formData.append('deviceType', form.deviceType)
      formData.append('makeModel', form.makeModel)
      formData.append('serialNo', form.serialNo)
      formData.append('deviceId', form.deviceId)
      formData.append('uploadedBy', form.uploadedBy || 'Investigating Officer')
      formData.append('notes', form.notes)

      const res = await uploadEvidence(id, formData)
      toast.success('Evidence locked & custody chain initialized!')
      setModalOpen(false)
      setSelectedFile(null)
      setClientHash('')
      setForm({
        deviceType: 'Computer',
        makeModel: '',
        serialNo: '',
        deviceId: '',
        uploadedBy: '',
        notes: '',
      })
      await loadCase()
      navigate(`/evidence/${res.evidence._id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 bg-white/5 rounded" />
            <div className="h-28 bg-surface rounded-2xl border border-white/5" />
            <div className="h-64 bg-surface rounded-2xl border border-white/5" />
          </div>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <Card className="text-center py-12 px-8 max-w-md">
          <p className="text-white/60 mb-4">Case matter not found</p>
          <Button size="sm" onClick={() => navigate('/cases')}>
            Back to Cases
          </Button>
        </Card>
      </div>
    )
  }

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
            <span>Back to all Cases</span>
          </Link>
        </div>

        {/* Case Meta Header Banner */}
        <Card className="mb-8 p-6 md:p-8 bg-surface/90 border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-2">
                <Badge variant="verified" size="sm" className="font-mono">
                  CASE #{caseData._id.slice(-6).toUpperCase()}
                </Badge>
                <span className="text-xs text-white/40">
                  Created {new Date(caseData.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                {caseData.title}
              </h1>

              {caseData.description && (
                <p className="text-sm text-white/60 leading-relaxed">
                  {caseData.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-white/50 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-white/80 font-medium">Party:</span> {caseData.partyName}
                </div>
                {caseData.partyAddress && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-white/30" />
                    <span>{caseData.partyAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              size="md"
              onClick={() => setModalOpen(true)}
              className="gap-2 shrink-0 self-start lg:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add Evidence Item</span>
            </Button>
          </div>
        </Card>

        {/* Evidence Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Evidence <span className="font-serif italic text-white/50">Ledger</span>
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Cryptographically locked electronic evidence & chain-of-custody records
            </p>
          </div>
          <Badge variant="neutral" size="md" className="font-mono">
            {caseData.evidence?.length || 0} ITEMS RECORDED
          </Badge>
        </div>

        {/* Evidence Grid */}
        {!caseData.evidence || caseData.evidence.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <HardDrive className="w-7 h-7 text-white/30" />
            </div>
            <p className="text-white/80 font-medium text-base">No evidence logged for this case yet</p>
            <p className="text-white/40 text-xs mt-1 max-w-sm">
              Upload electronic documents, audio, videos, or disk dumps to compute client & server SHA-256 hashes.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="mt-5 gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Upload First Evidence</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {caseData.evidence.map((item) => (
              <div
                key={item._id}
                onClick={() => navigate(`/evidence/${item._id}`)}
                className="group cursor-pointer"
              >
                <Card className="h-full flex flex-col justify-between hover:border-emerald-500/40 hover:bg-surface-2/60 transition-all duration-200">
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          {getDeviceIcon(item.deviceType)}
                        </div>
                        <span className="font-medium text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                          {item.filename}
                        </span>
                      </div>
                      <Badge variant="neutral" size="sm" className="shrink-0 text-[10px]">
                        {formatBytes(item.sizeBytes)}
                      </Badge>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <Badge variant="verified" size="sm" className="gap-1 text-[10px]">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{item.deviceType}</span>
                      </Badge>
                      {item.makeModel && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-white/60">
                          {item.makeModel}
                        </span>
                      )}
                    </div>

                    {/* SHA256 snippet */}
                    <div className="bg-black/40 rounded-xl p-2.5 border border-white/5 mb-3">
                      <div className="text-[10px] font-mono text-white/40 uppercase mb-1">
                        SHA-256 Checksum
                      </div>
                      <HashText hash={item.sha256} length={12} className="text-xs" />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                    <span>By: {item.uploadedBy || 'Custodian'}</span>
                    <span className="text-emerald-400/80 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-medium">
                      Audit chain <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Add Evidence Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            if (!uploading) setModalOpen(false)
          }}
          title="Secure Evidence Ingestion"
          description="Hash locked electronic evidence ingestion with Section 63 BSA compliance."
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* File dropzone / selector */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Select Evidence File <span className="text-rose-400">*</span>
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  selectedFile
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-white/10 hover:border-white/20 bg-surface/50'
                }`}
              >
                <input
                  type="file"
                  id="evidence-file-input"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium text-sm text-white truncate max-w-xs">
                        {selectedFile.name}
                      </span>
                    </div>
                    <div className="text-xs text-white/40">
                      {formatBytes(selectedFile.size)} • {selectedFile.type || 'Binary file'}
                    </div>

                    {/* Real-time client SHA-256 preview */}
                    <div className="pt-2 text-left bg-black/40 rounded-lg p-2.5 border border-white/10">
                      <div className="text-[10px] text-emerald-400/80 font-mono flex items-center justify-between mb-1">
                        <span>CLIENT SHA-256 (PRE-UPLOAD):</span>
                        {computingHash && <span className="animate-pulse">Computing...</span>}
                      </div>
                      {clientHash ? (
                        <div className="font-mono text-[11px] text-white/90 break-all select-all">
                          {clientHash}
                        </div>
                      ) : (
                        <div className="text-xs text-white/30 italic">Calculating file hash...</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-white/70 font-medium">
                      Click to browse or drop evidence file here
                    </p>
                    <p className="text-[11px] text-white/30">
                      Supports audio, video, forensic images, PDF, and logs (up to 50MB)
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
                placeholder="e.g. Dell Latitude 7420 / iPhone 14"
                value={form.makeModel}
                onChange={(e) => setForm({ ...form, makeModel: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Serial Number"
                placeholder="e.g. SN-88392190"
                value={form.serialNo}
                onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
              />

              <Input
                label="Device ID / IMEI / MAC"
                placeholder="e.g. 864201048892120 / MAC"
                value={form.deviceId}
                onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
              />
            </div>

            <Input
              label="Custody Officer / Uploaded By"
              placeholder="e.g. Inspector R. Verma"
              value={form.uploadedBy}
              onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })}
            />

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Acquisition Notes
              </label>
              <textarea
                rows={2}
                placeholder="Conditions of seizure, physical state, acquisition notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3.5 py-2 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

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
                disabled={uploading || !selectedFile || computingHash}
                className="gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{uploading ? 'Locking Hash & Securing...' : 'Secure & Upload'}</span>
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
