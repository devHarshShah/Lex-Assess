import { api } from './api-client'
import { getApiBaseUrl } from './auth-storage'

export interface AnalyticsFilters {
  stage?: string
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
