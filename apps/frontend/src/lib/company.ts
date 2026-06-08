import { api } from './api-client'

export type CompanyWorkflowStatus = 'NEW' | 'SHORTLISTED' | 'CONTACTED' | 'INTERVIEWING' | 'OFFERED' | 'REJECTED'
export type CompanyActionStatus = Exclude<CompanyWorkflowStatus, 'NEW'>

export interface CompanyCandidateRecord {
  attemptId: string
  studentId: string
  studentName: string
  studentEmail: string
  practiceArea: string
  campaign: string
  versionName: string
  marks: number
  workflowStatus: CompanyWorkflowStatus
  notes: string | null
  decisionId: string | null
  reviewedAt: string | null
}

export interface UpdateCompanyCandidateInput {
  status: CompanyActionStatus
  notes?: string
}

export async function fetchCompanyCandidates(filters?: {
  search?: string
  campaign?: string
  domain?: string
  status?: CompanyWorkflowStatus
}): Promise<CompanyCandidateRecord[]> {
  const params = new URLSearchParams()
  if (filters?.search) params.set('search', filters.search)
  if (filters?.campaign) params.set('campaign', filters.campaign)
  if (filters?.domain) params.set('domain', filters.domain)
  if (filters?.status) params.set('status', filters.status)

  const query = params.toString()
  return api.get<CompanyCandidateRecord[]>(`/company/candidates${query ? `?${query}` : ''}`)
}

export async function updateCompanyCandidateDecision(
  attemptId: string,
  input: UpdateCompanyCandidateInput,
): Promise<CompanyCandidateRecord> {
  return api.patch<CompanyCandidateRecord>(`/company/candidates/${attemptId}`, input)
}
