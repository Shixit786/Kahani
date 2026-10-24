import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Case {
  _id: string
  title: string
  description: string
  partyName: string
  partyAddress: string
  createdAt: string
  updatedAt: string
  evidenceCount?: number
}

export interface Evidence {
  _id: string
  caseId: string
  filename: string
  sizeBytes: number
  mimeType: string
  sha256: string
  clientSha256: string | null
  deviceType: 'Computer' | 'Mobile' | 'Flash Drive' | 'Cloud' | 'Other'
  makeModel: string
  serialNo: string
  deviceId: string
  notes: string
  uploadedBy: string
  storagePath: string
  createdAt: string
  updatedAt: string
}

export interface CustodyEvent {
  _id: string
  evidenceId: string
  seqNo: number
  action: string
  actor: string
  actorRole: 'Party' | 'Lawyer' | 'Expert' | 'Court'
  details: string
  timestampIST: string
  prevHash: string
  entryHash: string
}

export interface VerifyFileResult {
  match: boolean
  originalHash: string
  currentHash: string
}

export interface VerifyChainResult {
  ok: boolean
  brokenAt: number | null
  reason: string | null
}

export interface CreateCasePayload {
  title: string
  description?: string
  partyName: string
  partyAddress?: string
}

export interface AddEventPayload {
  action: string
  actor: string
  actorRole: 'Party' | 'Lawyer' | 'Expert' | 'Court'
  details?: string
}

// ── Cases ─────────────────────────────────────────────────────────────────────

export const getCases = () =>
  api.get<Case[]>('/cases').then((r) => r.data)

export const createCase = (payload: CreateCasePayload) =>
  api.post<Case>('/cases', payload).then((r) => r.data)

export const getCaseById = (id: string) =>
  api.get<Case & { evidence: Evidence[] }>(`/cases/${id}`).then((r) => r.data)

// ── Evidence ──────────────────────────────────────────────────────────────────

export const uploadEvidence = (caseId: string, formData: FormData) =>
  api
    .post<{ evidence: Evidence; lockedAtIST: string }>(
      `/cases/${caseId}/evidence`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    .then((r) => r.data)

export const getEvidenceById = (id: string) =>
  api
    .get<{ evidence: Evidence; custodyChain: CustodyEvent[] }>(`/evidence/${id}`)
    .then((r) => r.data)

// ── Custody events ────────────────────────────────────────────────────────────

export const addCustodyEvent = (evidenceId: string, payload: AddEventPayload) =>
  api.post<CustodyEvent>(`/evidence/${evidenceId}/events`, payload).then((r) => r.data)

// ── Verify ────────────────────────────────────────────────────────────────────

export const verifyFile = (evidenceId: string, formData: FormData) =>
  api
    .post<VerifyFileResult>(`/evidence/${evidenceId}/verify-file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)

export const verifyChain = (evidenceId: string) =>
  api.get<VerifyChainResult>(`/evidence/${evidenceId}/verify-chain`).then((r) => r.data)

// ── Certificate ───────────────────────────────────────────────────────────────

export const getCertificateUrl = (evidenceId: string) =>
  `/api/evidence/${evidenceId}/certificate`

// ── Demo ──────────────────────────────────────────────────────────────────────

export const demoTamper = (evidenceId: string) =>
  api.post(`/demo/tamper/${evidenceId}`).then((r) => r.data)

// ── Health ────────────────────────────────────────────────────────────────────

export const health = () => api.get<{ ok: boolean }>('/health').then((r) => r.data)

export default api
