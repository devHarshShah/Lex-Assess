import { api } from './api-client'
import { getApiBaseUrl } from './auth-storage'

export type CrmQueue = 'due' | 'overdue' | 'new' | 'all'

export interface CrmMeta {
  statuses: { key: string; label: string; closed: boolean }[]
  outcomes: { key: string; label: string }[]
  priorities: string[]
  activityTypes: string[]
}

export interface LeadRow {
  userId: string
  name: string
  email: string
  mobile: string
  college: string | null
  specialization: string | null
  stage: string
  stageLabel: string
  registeredAt: string
  status: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  tags: string[]
  nextFollowUpAt: string | null
  lastContactedAt: string | null
  contactAttempts: number
}

export interface LeadsPage {
  queue: CrmQueue
  queueCounts: Record<CrmQueue, number>
  total: number
  page: number
  pageSize: number
  rows: LeadRow[]
}

export interface LeadQuery {
  queue?: CrmQueue
  status?: string
  stage?: string
  college?: string
  search?: string
  page?: number
}

export interface CrmActivity {
  id: string
  type: string
  callOutcome: string | null
  fromStatus: string | null
  toStatus: string | null
  note: string | null
  followUpAt: string | null
  durationSec: number | null
  stageAtActivity: string | null
  actorName: string | null
  createdAt: string
}

export interface LeadDetail {
  lead: LeadRow
  profile: {
    fullName: string
    countryCode: string | null
    mobileNumber: string | null
    college: string
    degree: string
    currentYear: string
    specialization: string
    linkedinUrl: string | null
    resumeUrl: string | null
    internshipGoal: string | null
    isComplete: boolean
    rollNumber: string | null
  } | null
  payments: {
    hasActiveSubscription: boolean
    trialEndsAt: string | null
    accessEndsAt: string | null
    paymentCount: number
    totalPaidInr: number
    lastPaymentAt: string | null
    couponCode: string | null
  }
  marketingUnsubscribed: boolean
  activities: CrmActivity[]
  companyInterviews: { id: string; companyName: string; scheduledAt: string; endTime: string; status: string; source: string; meetLink: string | null }[]
  interviews: { id: string; interviewerName: string; startTime: string | null; status: string; marks: number | null }[]
  emails: { campaignId: string; campaignName: string; subject: string; sentAt: string | null }[]
}

export interface LogActivityInput {
  type: string
  callOutcome?: string | null
  note?: string
  followUpAt?: string | null
  durationSec?: number | null
  status?: string | null
}

export interface UpdateLeadInput {
  status?: string
  nextFollowUpAt?: string | null
  priority?: string
  tags?: string[]
  note?: string
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const fetchCrmMeta = () => api.get<CrmMeta>('/superadmin/crm/meta')
export const fetchLeads = (q: LeadQuery) => api.get<LeadsPage>(`/superadmin/crm/leads${qs({ ...q })}`)
export const fetchLead = (userId: string) => api.get<LeadDetail>(`/superadmin/crm/leads/${userId}`)
export const updateLead = (userId: string, input: UpdateLeadInput) => api.patch(`/superadmin/crm/leads/${userId}`, input)
export const logLeadActivity = (userId: string, input: LogActivityInput) => api.post(`/superadmin/crm/leads/${userId}/activities`, input)

export async function downloadLeadsXlsx(q: LeadQuery): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/superadmin/crm/leads.xlsx${qs({ ...q, page: undefined })}`, { credentials: 'include' })
  if (!res.ok) throw new Error('Could not generate the Excel file')
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = 'lexassess-crm-leads.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Digits only, with the country code, for tel: and wa.me links
export const phoneDigits = (mobile: string) => mobile.replace(/[^\d+]/g, '')
export const whatsappUrl = (mobile: string) => `https://wa.me/${mobile.replace(/\D/g, '')}`
