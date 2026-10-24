import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Smartphone,
  Camera,
  Upload,
  CheckCircle2,
  Lock,
  Clock,
  Shield,
  MapPin,
  Check,
  Copy,
  Zap,
  ArrowRight,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import HashText from '../components/HashText'
import { getCases, uploadEvidence, type Case } from '../lib/api'

// Compute SHA-256 via browser Web Crypto API
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

export default function MobileCapture() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [loadingCases, setLoadingCases] = useState(true)

  // File state
  const [file, setFile] = useState<File | null>(null)
  const [clientHash, setClientHash] = useState<string>('')
  const [computingHash, setComputingHash] = useState(false)
  const [uploadedBy, setUploadedBy] = useState('Field Officer')
  const [notes, setNotes] = useState('')
  const [declaration, setDeclaration] = useState(true)

  // Geolocation & telemetry
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [successData, setSuccessData] = useState<{
    evidenceId: string
    sha256: string
    lockedAtIST: string
    caseId: string
  } | null>(null)

  const [copiedHash, setCopiedHash] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getCases()
        setCases(data)
        if (data.length > 0) {
          setSelectedCaseId(data[0]._id)
        }
      } catch {
        toast.error('Failed to load active cases')
      } finally {
        setLoadingCases(false)
      }
    }
    load()
  }, [])

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile)
    setComputingHash(true)
    setClientHash('')
    try {
      const hash = await computeBrowserSha256(selectedFile)
      setClientHash(hash)
    } catch {
      toast.error('Failed to compute client hash')
    } finally {
      setComputingHash(false)
    }
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        toast.success('GPS coordinates acquired')
        setGettingLocation(false)
      },
      (err) => {
        toast.error('Could not get GPS position: ' + err.message)
        setGettingLocation(false)
      },
      { timeout: 10000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select or capture a file')
      return
    }
    if (!selectedCaseId) {
      toast.error('Please select an active case matter')
      return
    }
    if (!clientHash) {
      toast.error('Calculating cryptographic hash, please wait...')
      return
    }
    if (!declaration) {
      toast.error('Please accept the Section 63 BSA legal declaration')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientSha256', clientHash)
      formData.append('deviceType', 'Mobile')
      formData.append('makeModel', navigator.userAgent.slice(0, 60))
      formData.append('serialNo', 'MOBILE-SENSORS-LOCKED')
      formData.append(
        'deviceId',
        coords ? `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Mobile Capture'
      )
      formData.append('uploadedBy', uploadedBy)
      formData.append(
        'notes',
        notes
          ? `${notes} [Field captured on ${navigator.platform || 'mobile'}]`
          : `Field captured on mobile device. Platform: ${navigator.platform}`
      )
      formData.append('declarationAccepted', 'true')

      const res = await uploadEvidence(selectedCaseId, formData)
      toast.success('Evidence locked & chained to case!')
      setSuccessData({
        evidenceId: res.evidence._id,
        sha256: res.evidence.sha256,
        lockedAtIST: res.lockedAtIST,
        caseId: selectedCaseId,
      })
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Mobile capture failed')
    } finally {
      setUploading(false)
    }
  }

  const copyHash = (h: string) => {
    navigator.clipboard.writeText(h)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
    toast.success('SHA-256 checksum copied')
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-3xl mx-auto px-6 space-y-8">
        {/* ── Hero (Centered) ─────────────────────────────────────────── */}
        <div className="text-center space-y-3">
          <div className="mb-2">
            <Badge variant="verified" size="sm">
              Section 63 BSA Digital Acquisition
            </Badge>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-[56px] font-medium text-white tracking-tight leading-tight">
            <span className="font-serif-italic font-normal text-gold">Mobile</span> Field Evidence
          </h1>
          <p className="text-xs md:text-sm text-white/75 max-w-xl mx-auto font-light leading-relaxed">
            Acquire tamper-evident media on location, capture device telemetry and GPS coordinates, and anchor irreversible SHA-256 fingerprints to your active case matter.
          </p>
        </div>

        {/* ── Centered Cream Card With Drop Zone ─────────────────────── */}
        {successData ? (
          /* Success Result Card */
          <div className="p-8 rounded-card bg-cream text-ink border border-cream-deep shadow-cream space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#3FA27A]/20 border border-[#3FA27A]/40 flex items-center justify-center text-[#2E7D5B] shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-medium text-ink">
                  Evidence <span className="font-serif-italic font-normal">Locked & Sealed</span>
                </h3>
                <p className="text-xs text-ink/75 leading-relaxed">
                  Your mobile capture has been stamped with a mathematical fingerprint and irreversibly linked to the case custody ledger.
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-[#2E7D5B] font-semibold pt-1">
                  <Clock className="w-4 h-4" />
                  <span>Locked at IST: {successData.lockedAtIST}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-ink text-cream rounded-2xl border border-ink/20 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-cream/70">
                <span>SEALED SHA-256 FINGERPRINT</span>
                <button
                  type="button"
                  onClick={() => copyHash(successData.sha256)}
                  className="inline-flex items-center gap-1 text-gold hover:text-white transition-colors cursor-pointer"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-[#3FA27A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-xs break-all select-all text-gold leading-relaxed">
                {successData.sha256}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuccessData(null)
                  setFile(null)
                  setClientHash('')
                  setNotes('')
                }}
                className="text-xs font-semibold text-ink/70 hover:text-ink underline transition-colors"
              >
                Capture Another File
              </button>
              <div className="flex items-center gap-3">
                <Link to={`/cases/${successData.caseId}`}>
                  <Button size="sm">
                    <span>View Case Matter</span>
                  </Button>
                </Link>
                <Link to={`/evidence/${successData.evidenceId}`}>
                  <Button size="sm">
                    <span>Inspect Record</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Main Centered Cream Ingestion Card */
          <div className="p-6 md:p-8 rounded-card bg-cream text-ink border border-cream-deep shadow-cream space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Case Selector */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                  Target Case Matter <span className="text-status-tampered">*</span>
                </label>
                {loadingCases ? (
                  <div className="text-xs text-ink/60 font-mono py-2">Loading active cases...</div>
                ) : (
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-white border border-cream-deep text-ink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gold/50 shadow-sm"
                  >
                    {cases.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.title} — {c.partyName} (#{c._id.slice(-6).toUpperCase()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Centered Drop / Camera Zone */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                  Evidence File or Photo Capture <span className="text-status-tampered">*</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-ink/20 hover:border-gold rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/70 hover:bg-white group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileChange(f)
                    }}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-cream-deep/60 flex items-center justify-center text-ink group-hover:scale-110 transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    {file ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-ink break-all">{file.name}</div>
                        <div className="text-xs text-ink/60 font-mono">
                          {formatBytes(file.size)} • {file.type || 'binary'}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-ink">
                          Tap to take photo or choose file from device
                        </div>
                        <div className="text-[11px] text-ink/60">
                          Photos, audio, PDFs, chat exports, video recordings
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Hash Calculation with Scan Animation */}
              {computingHash && (
                <div className="p-3.5 rounded-xl bg-white border border-cream-deep text-xs font-mono flex items-center gap-2.5 text-ink/80 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Computing irreversible SHA-256 hash locally in browser sandbox...</span>
                </div>
              )}

              {clientHash && !computingHash && (
                <div className="p-3.5 rounded-xl bg-white border border-cream-deep space-y-1">
                  <div className="text-[10px] font-mono uppercase text-ink/60 font-semibold flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#2E7D5B]" />
                    <span>Client-side SHA-256 pre-upload fingerprint:</span>
                  </div>
                  <div className="font-mono text-xs text-ink font-medium break-all select-all">
                    {clientHash}
                  </div>
                </div>
              )}

              {/* Submitter & Telemetry Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                    Captured By (Officer / Party)
                  </label>
                  <input
                    type="text"
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-full bg-white border border-cream-deep text-ink text-xs focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                    GPS Coordinates Telemetry
                  </label>
                  <button
                    type="button"
                    onClick={captureLocation}
                    disabled={gettingLocation}
                    className="w-full px-4 py-2.5 rounded-full bg-white border border-cream-deep text-ink text-xs font-medium hover:bg-cream-deep/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-gold" />
                    <span>
                      {gettingLocation
                        ? 'Acquiring GPS...'
                        : coords
                        ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
                        : 'Capture Device Location'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Acquisition Notes */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wide">
                  Acquisition / Field Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify location, circumstances of seizure, device status..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-white border border-cream-deep text-ink text-xs focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none font-light"
                />
              </div>

              {/* Legal Declaration Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  className="mt-0.5 rounded text-gold focus:ring-gold h-4 w-4"
                />
                <span className="text-[11px] text-ink/80 leading-relaxed">
                  I declare under Section 63 BSA that this evidence was acquired directly from the source device without tampering or alteration. Fabricating false evidence is a punishable offence.
                </span>
              </label>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={uploading || computingHash || !file}
                  className="w-full justify-center"
                >
                  <span>{uploading ? 'Locking Hash & Chaining...' : 'Lock Evidence Hash'}</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
