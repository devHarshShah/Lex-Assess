import { api } from './api-client'

export type InviteVariant = 'scheduled' | 'rescheduled' | 'cancelled'

export interface InviteInput {
  interviewId?: string
  variant?: InviteVariant
  companyId?: string
  studentId?: string
  start?: string
  durationMin?: number
  message?: string
  extraAttendees?: string[]
  manualMeetLink?: string
  reason?: string
}

export interface StudentOption {
  id: string
  name: string
  email: string
  college: string
  specialization: string
}

export interface CompanyOption {
  id: string
  name: string
  email: string
  contactName: string
}

export interface InvitePreview {
  student: { to: string[]; subject: string; html: string }
  company: { to: string[]; subject: string; html: string }
  calendar: {
    action: 'create' | 'update' | 'delete'
    enabled: boolean
    invitesAttendees: boolean
    summary: string
    description: string
    start: string
    end: string
    attendees: string[]
    meetLinkGenerated: boolean
  }
  warnings: string[]
}

export interface CompanyInterviewRow {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  studentCollege: string | null
  companyId: string
  companyName: string
  companyEmail: string
  scheduledAt: string
  endTime: string
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  source: 'COMPANY' | 'SUPERADMIN'
  meetLink: string | null
  hasCalendarEvent: boolean
  extraAttendees: string[]
  inviteMessage: string | null
  rescheduleCount: number
  cancelReason: string | null
  studentEmailSentAt: string | null
  companyEmailSentAt: string | null
  scheduledByName: string | null
  notes: string | null
}

export interface DeliveryResult {
  interview: { id: string }
  emails: { student: 'sent' | 'failed'; company: 'sent' | 'failed' }
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ''
}

const base = '/superadmin/company-interviews'

export const searchInterviewStudents = (search: string) =>
  api.get<StudentOption[]>(`${base}/options/students${qs({ search })}`, { skipToast: true })
export const searchInterviewCompanies = (search: string) =>
  api.get<CompanyOption[]>(`${base}/options/companies${qs({ search })}`, { skipToast: true })
export const previewInvite = (input: InviteInput) => api.post<InvitePreview>(`${base}/preview`, input, { skipToast: true })
export const sendInviteTest = (input: InviteInput) => api.post<{ sentTo: string }>(`${base}/test-send`, input)
export const scheduleCompanyInterview = (input: InviteInput) => api.post<DeliveryResult>(base, input)
export const rescheduleCompanyInterview = (id: string, input: InviteInput) =>
  api.patch<DeliveryResult>(`${base}/${id}/reschedule`, input)
export const cancelCompanyInterview = (id: string, input: InviteInput) => api.post<DeliveryResult>(`${base}/${id}/cancel`, input)
export const resendInviteEmails = (id: string) => api.post<DeliveryResult>(`${base}/${id}/resend-emails`)
export const fetchCompanyInterviews = (q: { status?: string; source?: string; search?: string; from?: string; to?: string; page?: number }) =>
  api.get<{ total: number; page: number; pageSize: number; rows: CompanyInterviewRow[] }>(`${base}${qs(q)}`)
