import { api } from './api-client'

export interface CertificateRecord {
  verificationCode: string
  fullName: string
  rollNumber: string | null
  practiceArea: string
  rank: number
  commonScore: number
  pdfUrl: string | null
  issuedAt: string
}

export async function fetchMyCertificate(): Promise<CertificateRecord | null> {
  return api.get<CertificateRecord | null>('/certificates/me')
}

export async function generateCertificate(): Promise<CertificateRecord> {
  return api.post<CertificateRecord>('/certificates/generate')
}

export async function verifyCertificate(code: string): Promise<CertificateRecord> {
  return api.get<CertificateRecord>(`/certificates/verify/${code}`)
}
