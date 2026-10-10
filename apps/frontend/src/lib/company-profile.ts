import { api } from './api-client'

export type CompanyVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CompanyProfile {
  companyName: string
  companyLegalName: string
  companyPan: string | null
  companyGstin: string | null
  operatorName: string
  operatorDesignation: string
  operatorIdCardUrl: string | null
  verificationStatus: CompanyVerificationStatus
  rejectionReason: string | null
  reviewedAt: string | null
}

export interface ManagedCompanyProfileRecord {
  id: string
  email: string
  name: string
  role: 'COMPANY'
  avatarUrl: string | null
  profile: CompanyProfile | null
}

export async function fetchMyCompanyProfile(): Promise<CompanyProfile | null> {
  return api.get<CompanyProfile | null>('/company-profile/me')
}

export async function saveCompanyProfile(input: {
  companyName: string
  companyLegalName: string
  companyPan?: string
  companyGstin?: string
  operatorName: string
  operatorDesignation: string
  operatorIdCardUrl?: string
}): Promise<CompanyProfile> {
  return api.patch<CompanyProfile>('/company-profile/me', input)
}

export async function fetchSuperadminCompanyProfiles(): Promise<ManagedCompanyProfileRecord[]> {
  return api.get<ManagedCompanyProfileRecord[]>('/superadmin/company-profiles')
}

export async function reviewCompanyProfile(
  userId: string,
  input: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string },
): Promise<CompanyProfile> {
  return api.patch<CompanyProfile>(`/superadmin/company-profiles/${userId}/review`, input)
}

export async function createCompanyAccount(input: {
  email: string
  name: string
  companyName: string
  companyLegalName: string
  companyPan?: string
  companyGstin?: string
  operatorName: string
  operatorDesignation: string
}): Promise<ManagedCompanyProfileRecord> {
  return api.post<ManagedCompanyProfileRecord>('/superadmin/company-profiles', input)
}

export async function resendCompanyWelcome(userId: string): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(`/superadmin/company-profiles/${userId}/resend-welcome`)
}
