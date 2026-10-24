import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Search, Calendar, User, FileText, ArrowRight, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Modal from '../components/Modal'
import Input from '../components/Input'
import { getCases, createCase, type Case } from '../lib/api'

export default function Cases() {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New Case Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    partyName: '',
    partyAddress: '',
  })

  const fetchCases = async () => {
    try {
      setLoading(true)
      const data = await getCases()
      setCases(data)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCases()
  }, [])

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.partyName.trim()) {
      toast.error('Title and Party Name are required')
      return
    }

    try {
      setSubmitting(true)
      const newCase = await createCase(form)
      toast.success('Case created successfully')
      setModalOpen(false)
      setForm({ title: '', description: '', partyName: '', partyAddress: '' })
      setCases((prev) => [newCase, ...prev])
      navigate(`/cases/${newCase._id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create case')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.partyName.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BSA 2023 Compliant Repository</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Case <span className="font-serif italic font-normal text-white/50">Workspace</span>
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Browse case matters, audit custody timelines, and issue Section 63 BSA certificates
            </p>
          </div>
          <Button size="md" onClick={() => setModalOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span>Create New Case</span>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by case title, party or keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Case List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse h-48 bg-surface/50 border-white/5">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
                <div className="h-3 bg-white/5 rounded w-1/2 mb-6" />
                <div className="h-3 bg-white/5 rounded w-full mb-2" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredCases.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-white/30" />
            </div>
            <p className="text-white/80 font-medium text-base">
              {search ? 'No cases match your search' : 'No cases recorded yet'}
            </p>
            <p className="text-white/40 text-xs mt-1 max-w-sm">
              {search
                ? 'Try searching with different terms or clear the filter.'
                : 'Start tracking electronic evidence by creating your first case workspace.'}
            </p>
            {!search && (
              <Button size="sm" onClick={() => setModalOpen(true)} className="mt-5 gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Create First Case</span>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCases.map((c) => (
              <div
                key={c._id}
                onClick={() => navigate(`/cases/${c._id}`)}
                className="group cursor-pointer"
              >
                <Card className="h-full flex flex-col justify-between hover:border-emerald-500/40 hover:bg-surface-2/60 transition-all duration-200">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h2 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {c.title}
                      </h2>
                      <Badge variant="neutral" size="sm" className="shrink-0 font-mono">
                        {c.evidenceCount ?? 0} {c.evidenceCount === 1 ? 'file' : 'files'}
                      </Badge>
                    </div>

                    <p className="text-xs text-white/50 line-clamp-2 mb-4 leading-relaxed">
                      {c.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <User className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <span className="truncate">{c.partyName}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-white/20" />
                        <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-emerald-400/80 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-medium">
                        View case <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Create Case Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Create New Case"
          description="Initialize a tamper-evident evidence registry for this legal proceeding or investigation."
        >
          <form onSubmit={handleCreateCase} className="space-y-4 pt-2">
            <Input
              label="Case Title"
              placeholder="e.g. State of Maharashtra vs. A. Sharma"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Matter Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief summary of matter, dispute, or forensic inquiry..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            <Input
              label="Party Name / Custodian"
              placeholder="e.g. Inspector R. Verma, Cyber Cell"
              value={form.partyName}
              onChange={(e) => setForm({ ...form, partyName: e.target.value })}
              required
            />

            <Input
              label="Party / Department Address"
              placeholder="e.g. Cyber Crime Police Station, Bandra Kurla Complex, Mumbai"
              value={form.partyAddress}
              onChange={(e) => setForm({ ...form, partyAddress: e.target.value })}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating Case...' : 'Create Case'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
