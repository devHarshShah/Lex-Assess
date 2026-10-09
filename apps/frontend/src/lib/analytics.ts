import { api } from './api-client'
import { getApiBaseUrl } from './auth-storage'

export interface AnalyticsFilters {
  stage?: string
  crmStatus?: string
  role?: string
  search?: string
  from?: string
  to?: string
}

export interface UserReportRow {
  id: string
  name: string
  email: string
  role: string
  authProvider: string
  registeredAt: string
  mobile: string | null
  college: string | null
  degree: string | null
  currentYear: string | null
  specialization: string | null
  profileStarted: boolean
  profileComplete: boolean
  paymentInitiated: boolean
  couponCode: string | null
  trialEndsAt: string | null
  hasActiveSubscription: boolean
  accessEndsAt: string | null
  paymentCount: number
  totalPaidInr: number
  lastPaymentAt: string | null
  stage: string
  stageLabel: string
  crmStatus: string | null
  lastContactedAt: string | null
  companyInterviews: number
}

export interface CrmAnalytics {
  totals: {
    eligibleLeads: number
    neverContacted: number
    overdueFollowUps: number
    activities: number
    contacts: number
    calls: number
    connectRatePct: number
    studentsContacted: number
  }
  byStatus: { key: string; label: string; count: number }[]
  callOutcomes: { key: string; label: string; count: number }[]
  activityTypes: { label: string; count: number }[]
  contactsPerDay: { date: string; count: number }[]
  byActor: { name: string; activities: number; contacts: number }[]
  conversion: {
    contacted: number
    tracked: number
    advanced: number
    advancedPct: number
    converted: number
    convertedPct: number
    paidAfterContact: number
    revenueInr: number
    transitions: { from: string; to: string; fromLabel: string; toLabel: string; count: number }[]
  }
}

export interface CompanyInterviewAnalytics {
  totals: {
    total: number
    scheduled: number
    upcoming: number
    completed: number
    cancelled: number
    students: number
    rescheduledPct: number
    completionPct: number
    emailDeliveryPct: number
  }
  bySource: { label: string; count: number }[]
  byCompany: { label: string; scheduled: number; completed: number; cancelled: number }[]
  perDay: { date: string; count: number }[]
}

export interface AnalyticsOverview {
  totals: { users: number; students: number; otherRoles: number; revenueInr: number; activeSubscribers: number }
  stageCounts: Record<string, number>
  funnel: { key: string; label: string; count: number }[]
  signups: { date: string; count: number }[]
  byProvider: { label: string; count: number }[]
  topColleges: { label: string; count: number }[]
  topDegrees: { label: string; count: number }[]
  coupons: { code: string; redemptions: number; isActive: boolean }[]
}

export interface UsersPage {
  total: number
  page: number
  pageSize: number
  rows: UserReportRow[]
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const fetchAnalyticsOverview = (f: AnalyticsFilters) =>
  api.get<AnalyticsOverview>(`/superadmin/analytics/overview${qs({ from: f.from, to: f.to })}`)

export const fetchAnalyticsUsers = (f: AnalyticsFilters, page: number) =>
  api.get<UsersPage>(`/superadmin/analytics/users${qs({ ...f, page })}`)

export const fetchCrmAnalytics = (f: AnalyticsFilters) =>
  api.get<CrmAnalytics>(`/superadmin/analytics/crm${qs({ from: f.from, to: f.to })}`)

export const fetchCompanyInterviewAnalytics = (f: AnalyticsFilters) =>
  api.get<CompanyInterviewAnalytics>(`/superadmin/analytics/company-interviews${qs({ from: f.from, to: f.to })}`)

export async function downloadAnalyticsXlsx(f: AnalyticsFilters): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/superadmin/analytics/users.xlsx${qs({ ...f })}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Could not generate the Excel file')
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = 'lexassess-user-report.xlsx'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
