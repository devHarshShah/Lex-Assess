import { api } from './api-client'

export interface CertificateRecord {
  verificationCode: string
  fullName: string
  rollNumber: string | null
  practiceArea: string
  // Null when issued by a superadmin without a score
  commonScore: number | null
  pdfUrl: string | null
  issuedAt: string
}

export interface CertificateVerifyRecord extends CertificateRecord {
  rank:
    | { status: 'ASSIGNED'; rank: number }
    | { status: 'RELEASED'; rank: number; releaseLabel: string; releasedAt: string }
    | { status: 'PENDING' }
}

export async function fetchMyCertificate(): Promise<CertificateRecord | null> {
  return api.get<CertificateRecord | null>('/certificates/me')
}

export async function generateCertificate(): Promise<CertificateRecord> {
  return api.post<CertificateRecord>('/certificates/generate')
}

export async function verifyCertificate(code: string): Promise<CertificateVerifyRecord> {
  return api.get<CertificateVerifyRecord>(`/certificates/verify/${code}`)
}

// ---- Superadmin issuing ----

export interface CertificateCandidate {
  id: string
  name: string
  email: string
  rollNumber: string | null
  mobileNumber: string | null
  college: string | null
  specialization: string | null
  hasCertificate: boolean
}

export interface IssueDefaults extends CertificateCandidate {
  fullName: string
  liveScore: number | null
  livePracticeArea: string | null
  existing: {
    verificationCode: string
    commonScore: number | null
    practiceArea: string
    manualRank: number | null
    issuedAt: string
  } | null
}

export interface IssueCertificateInput {
  userId: string
  fullName: string
  practiceArea: string
  commonScore: number | null
  rank: number | null
}

export function searchCertificateCandidates(q: string): Promise<CertificateCandidate[]> {
  return api.get<CertificateCandidate[]>(`/superadmin/certificates/candidates?q=${encodeURIComponent(q)}`)
}

export function fetchIssueDefaults(userId: string): Promise<IssueDefaults> {
  return api.get<IssueDefaults>(`/superadmin/certificates/candidates/${encodeURIComponent(userId)}`)
}

export async function previewCertificate(input: IssueCertificateInput): Promise<Blob> {
  const { pdfBase64 } = await api.post<{ pdfBase64: string }>('/superadmin/certificates/preview', input)
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: 'application/pdf' })
}

export function sendCertificate(input: IssueCertificateInput): Promise<{ certificate: CertificateRecord; emailed: boolean; email: string }> {
  return api.post('/superadmin/certificates/send', input)
}
