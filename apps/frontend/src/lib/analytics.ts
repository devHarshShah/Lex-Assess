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

// ---- email campaign analytics ----------------------------------------------------------

export interface EmailRates {
  ctrPct: number
  clickTracked: boolean
  clickConvertedPct: number
  advancedPct: number
  convertedPct: number
  unsubPct: number
  revenuePer1000: number
  smallSample: boolean
}

export interface EmailOverview {
  totals: {
    campaigns: number
    audience: number
    sent: number
    failed: number
    skipped: number
    tracked: number
    advanced: number
    converted: number
    revenueInr: number
    couponRedemptions: number
    unsubscribes: number
    clicked: number
    clicks: number
    clickConverted: number
    students: number
    trackable: number
    deliveryPct: number
  } & EmailRates
  perDay: { date: string; sent: number }[]
  quota: { sentToday: number; sentLastHour: number }
}

export interface EmailCampaignRow extends EmailRates {
  id: string
  name: string
  subject: string
  templateKey: string | null
  templateName: string
  status: string
  createdAt: string
  audienceSize: number
  sent: number
  failed: number
  skipped: number
  tracked: number
  advanced: number
  converted: number
  revenueInr: number
  couponRedemptions: number
  unsubscribes: number
  clicked: number
  clicks: number
  clickConverted: number
  trackable: number
  deliveryPct: number
}

export interface TemplateRow extends EmailRates {
  key: string
  name: string
  campaigns: number
  sent: number
  tracked: number
  advanced: number
  converted: number
  revenueInr: number
  unsubscribes: number
  clicked: number
  clickConverted: number
  trackable: number
}

export interface TemplateAnalytics {
  templates: TemplateRow[]
  byStage: {
    stage: string
    stageLabel: string
    options: { key: string; name: string; sent: number; converted: number; convertedPct: number; smallSample: boolean }[]
  }[]
  minSample: number
}

export interface CouponAnalyticsRow {
  code: string
  freeDays: number
  isActive: boolean
  redeemed: number
  inRange: number
  trial: number
  paid: number
  cancelledActive: number
  lapsed: number
  paidEver: number
  trialToPaidPct: number
  revenueInr: number
}

export const fetchEmailOverview = (f: AnalyticsFilters) =>
  api.get<EmailOverview>(`/superadmin/analytics/email/overview${qs({ from: f.from, to: f.to })}`)

export const fetchEmailCampaignStats = (f: AnalyticsFilters) =>
  api.get<EmailCampaignRow[]>(`/superadmin/analytics/email/campaigns${qs({ from: f.from, to: f.to })}`)

export const fetchTemplateAnalytics = (f: AnalyticsFilters) =>
  api.get<TemplateAnalytics>(`/superadmin/analytics/email/templates${qs({ from: f.from, to: f.to })}`)

export const fetchCouponAnalytics = (f: AnalyticsFilters) =>
  api.get<CouponAnalyticsRow[]>(`/superadmin/analytics/coupons${qs({ from: f.from, to: f.to })}`)

export interface SendTimes {
  minSample: number
  cells: { day: number; hour: number; sent: number; clicked: number; ctrPct: number }[]
}

export interface SubjectComparison {
  key: string
  name: string
  subjects: { subject: string; sent: number; ctrPct: number; convertedPct: number; smallSample: boolean }[]
}

export interface FatigueBucket {
  label: string
  students: number
  unsubscribed: number
  unsubPct: number
}

export interface RevenueAnalytics {
  revenue30: number
  revenuePrev30: number
  revenueTotal: number
  payments30: number
  arpuInr: number
  payingNow: number
  cancelledStillActive: number
  lapsed: number
  churnPct: number
  trialToPaidPct: number
  trialists: number
  failedPayments30: number
  perDay: { date: string; count: number }[]
}

export interface FunnelTiming {
  medianDaysToFirstPayment: number | null
  payersInWindow: number
  signups: number
  withinDayPct: number
  withinWeekPct: number
  cohorts: { week: string; size: number; paidByWeek: (number | null)[] }[]
  weeks: number
}

export const fetchSendTimes = (f: AnalyticsFilters) =>
  api.get<SendTimes>(`/superadmin/analytics/email/send-times${qs({ from: f.from, to: f.to })}`)

export const fetchSubjectComparison = (f: AnalyticsFilters) =>
  api.get<SubjectComparison[]>(`/superadmin/analytics/email/subjects${qs({ from: f.from, to: f.to })}`)

export const fetchFatigue = () => api.get<FatigueBucket[]>('/superadmin/analytics/email/fatigue')

export const fetchRevenueAnalytics = () => api.get<RevenueAnalytics>('/superadmin/analytics/revenue')

export const fetchFunnelTiming = (weeks = 8) => api.get<FunnelTiming>(`/superadmin/analytics/funnel-timing${qs({ weeks })}`)
