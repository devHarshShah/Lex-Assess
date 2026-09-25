import { api } from './api-client'

export interface CertificateRecord {
  verificationCode: string
  fullName: string
  rollNumber: string | null
  practiceArea: string
  commonScore: number
  pdfUrl: string | null
  issuedAt: string
}

export interface CertificateVerifyRecord extends CertificateRecord {
  rank:
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
