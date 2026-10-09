import * as React from 'react'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'

import {
  downloadAnalyticsXlsx,
  fetchAnalyticsOverview,
  fetchAnalyticsUsers,
  fetchCompanyInterviewAnalytics,
  fetchCrmAnalytics,
  type AnalyticsFilters,
  type AnalyticsOverview,
  type CompanyInterviewAnalytics,
  type CrmAnalytics,
  type UsersPage,
} from '@/lib/analytics'
import { fetchCrmMeta, type CrmMeta } from '@/lib/crm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

// One hue for magnitude (funnel, signups); text stays in ink tokens, never the series color.
const BAR = '#d97706'

const STAGES: { value: string; label: string }[] = [
  { value: '', label: 'All stages' },
  { value: 'REGISTERED', label: 'Registered only' },
  { value: 'PROFILE_STARTED', label: 'Profile started' },
  { value: 'PROFILE_COMPLETE', label: 'Profile complete, no payment' },
  { value: 'PAYMENT_INITIATED', label: 'Payment initiated, not active' },
  { value: 'TRIAL', label: 'In free trial' },
  { value: 'PAID', label: 'Paid and active' },
  { value: 'CANCELLED_ACTIVE', label: 'Autopay cancelled, still has access' },
  { value: 'LAPSED', label: 'Paid, now inactive' },
  { value: 'NON_STUDENT', label: 'Non-student account' },
]

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function Funnel({ data }: { data: AnalyticsOverview['funnel'] }) {
  const top = Math.max(data[0]?.count ?? 0, 1)
  return (
    <ul className="space-y-3" aria-label="Student funnel">
      {data.map((s, i) => {
        const prev = i === 0 ? null : (data[i - 1]?.count ?? null)
        const step = prev ? Math.round((s.count / prev) * 100) : null
        return (
          <li key={s.key} title={`${s.label}: ${s.count}`}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{s.label}</span>
              <span className="tabular-nums">
                {s.count}
                {step !== null && <span className="ml-2 text-xs text-muted-foreground">{step}% of previous</span>}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full rounded bg-muted">
              <div className="h-2.5 rounded-r" style={{ width: `${(s.count / top) * 100}%`, background: BAR }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function SignupsChart({ data, noun = 'signup' }: { data: { date: string; count: number }[]; noun?: string }) {
  const first = data[0]
  const last = data[data.length - 1]
  if (!first || !last) return <p className="text-sm text-muted-foreground">No {noun}s in this range.</p>
  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 600
  const h = 140
  const slot = w / data.length
  const barW = Math.min(14, Math.max(2, slot - 2))
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label={`${noun}s per day`}>
        <line x1="0" x2={w} y1={h} y2={h} stroke="currentColor" strokeOpacity="0.2" />
        {data.map((d, i) => {
          const bh = (d.count / max) * (h - 8)
          return (
            <g key={d.date}>
              <title>{`${fmtDate(d.date)}: ${d.count} ${noun}${d.count === 1 ? '' : 's'}`}</title>
              <rect x={i * slot + (slot - barW) / 2} y={h - bh} width={barW} height={bh} rx="2" fill={BAR} />
            </g>
          )
        })}
        <text x="0" y={h + 14} fontSize="10" fill="currentColor" opacity="0.6">{fmtDate(first.date)}</text>
        <text x={w} y={h + 14} fontSize="10" fill="currentColor" opacity="0.6" textAnchor="end">
          {fmtDate(last.date)}
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">Peak: {max} in a day</p>
    </div>
  )
}

function Bars({ items }: { items: { label: string; count: number }[] }) {
  const top = Math.max(...items.map((i) => i.count), 1)
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${i.count}`}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate">{i.label}</span>
            <span className="tabular-nums">{i.count}</span>
          </div>
          <div className="mt-1 h-2 w-full rounded bg-muted">
            <div className="h-2 rounded-r" style={{ width: `${(i.count / top) * 100}%`, background: BAR }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

const ACTIVITY_LABELS: Record<string, string> = {
  CALL: 'Calls',
  WHATSAPP: 'WhatsApp messages',
  EMAIL: 'Emails',
  NOTE: 'Notes',
  STATUS_CHANGE: 'Status changes',
  FOLLOW_UP_SET: 'Follow-ups set',
  INTERVIEW_SCHEDULED: 'Interviews scheduled',
  INTERVIEW_RESCHEDULED: 'Interviews rescheduled',
  INTERVIEW_CANCELLED: 'Interviews cancelled',
}

function CrmSection({ data }: { data: CrmAnalytics }) {
  const t = data.totals
  const c = data.conversion
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Student CRM</h2>
        <p className="text-sm text-muted-foreground">Outreach in the selected range. Conversion compares each student’s stage at first contact with today.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Leads (profile + phone)" value={String(t.eligibleLeads)} hint={`${t.neverContacted} never contacted`} />
        <Tile label="Calls logged" value={String(t.calls)} hint={`${t.contacts} calls + WhatsApp`} />
        <Tile label="Connect rate" value={`${t.connectRatePct}%`} hint="Calls answered" />
        <Tile label="Overdue follow-ups" value={String(t.overdueFollowUps)} />
        <Tile label="Converted after contact" value={String(c.converted)} hint={`${c.convertedPct}% of ${c.tracked} contacted`} />
        <Tile label="Revenue after contact" value={inr(c.revenueInr)} hint={`${c.paidAfterContact} paying students`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Leads by CRM status</CardTitle></CardHeader>
          <CardContent><Bars items={data.byStatus} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Calls and WhatsApp per day</CardTitle></CardHeader>
          <CardContent><SignupsChart data={data.contactsPerDay} noun="contact" /></CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <CountList title="Call outcomes" items={data.callOutcomes} />
          <CountList title="Activity by team member" items={data.byActor.map((a) => ({ label: a.name, count: a.activities }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CountList title="Activity types" items={data.activityTypes.map((a) => ({ label: ACTIVITY_LABELS[a.label] ?? a.label, count: a.count }))} />
          <CountList
            title={`Stage moves after contact (${c.advancedPct}% moved forward)`}
            items={c.transitions.map((x) => ({ label: `${x.fromLabel} → ${x.toLabel}`, count: x.count }))}
          />
        </div>
      </div>
    </section>
  )
}

function CompanyInterviewSection({ data }: { data: CompanyInterviewAnalytics }) {
  const t = data.totals
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Company interviews</h2>
        <p className="text-sm text-muted-foreground">Interviews dated in the selected range, scheduled by companies or the LexAssess team.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Interviews" value={String(t.total)} hint={`${t.students} students`} />
        <Tile label="Upcoming" value={String(t.upcoming)} />
        <Tile label="Completed" value={String(t.completed)} hint={`${t.completionPct}% of finished`} />
        <Tile label="Cancelled" value={String(t.cancelled)} />
        <Tile label="Rescheduled" value={`${t.rescheduledPct}%`} />
        <Tile label="Emails delivered" value={`${t.emailDeliveryPct}%`} hint="Team-scheduled, both sides" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Interviews per day</CardTitle></CardHeader>
          <CardContent><SignupsChart data={data.perDay} noun="interview" /></CardContent>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <CountList
            title="Top companies"
            items={data.byCompany.map((c) => ({ label: c.label, count: c.scheduled + c.completed + c.cancelled }))}
          />
          <CountList
            title="Scheduled by"
            items={data.bySource.map((s) => ({ label: s.label === 'SUPERADMIN' ? 'LexAssess team' : 'Company', count: s.count }))}
          />
        </div>
      </div>
    </section>
  )
}

function CountList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.label} className="flex justify-between gap-3">
                <span className="truncate">{i.label}</span>
                <span className="tabular-nums">{i.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export function SuperadminAnalyticsPage() {
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [stage, setStage] = React.useState('')
  const [crmStatus, setCrmStatus] = React.useState('')
  const [crmMeta, setCrmMeta] = React.useState<CrmMeta | null>(null)
  const [crm, setCrm] = React.useState<CrmAnalytics | null>(null)
  const [interviews, setInterviews] = React.useState<CompanyInterviewAnalytics | null>(null)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [overview, setOverview] = React.useState<AnalyticsOverview | null>(null)
  const [users, setUsers] = React.useState<UsersPage | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [downloading, setDownloading] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const filters: AnalyticsFilters = React.useMemo(
    () => ({ from, to, stage, crmStatus, search: debouncedSearch }),
    [from, to, stage, crmStatus, debouncedSearch],
  )

  React.useEffect(() => {
    setPage(1)
  }, [filters])

  React.useEffect(() => {
    fetchCrmMeta().then(setCrmMeta).catch(() => undefined)
  }, [])

  // Outreach sections only depend on the date range
  React.useEffect(() => {
    let cancelled = false
    Promise.all([fetchCrmAnalytics({ from, to }), fetchCompanyInterviewAnalytics({ from, to })])
      .then(([c, i]) => {
        if (cancelled) return
        setCrm(c)
        setInterviews(i)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [from, to])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchAnalyticsOverview(filters), fetchAnalyticsUsers(filters, page)])
      .then(([o, u]) => {
        if (cancelled) return
        setOverview(o)
        setUsers(u)
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load analytics')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters, page])

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadAnalyticsXlsx(filters)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const totalPages = users ? Math.max(1, Math.ceil(users.total / users.pageSize)) : 1
  const t = overview?.totals
  const profileDone = overview?.funnel.find((f) => f.key === 'PROFILE_COMPLETE')?.count ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Registrations, payment funnel, CRM outreach and company interviews.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">
            From
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Excel
          </Button>
        </div>
      </div>

      {t && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Tile label="Registered users" value={String(t.users)} hint={`${t.students} students, ${t.otherRoles} other`} />
          <Tile
            label="Profile complete"
            value={t.students ? `${Math.round((profileDone / t.students) * 100)}%` : '0%'}
            hint={`${profileDone} of ${t.students} students`}
          />
          <Tile label="Payment initiated" value={String(overview?.funnel.find((f) => f.key === 'PAYMENT_INITIATED')?.count ?? 0)} />
          <Tile label="In free trial" value={String(overview?.stageCounts.TRIAL ?? 0)} />
          <Tile label="Active subscribers" value={String(t.activeSubscribers)} />
          <Tile label="Revenue collected" value={inr(t.revenueInr)} />
        </div>
      )}

      {overview && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Student funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <Funnel data={overview.funnel} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signups per day</CardTitle>
            </CardHeader>
            <CardContent>
              <SignupsChart data={overview.signups} />
            </CardContent>
          </Card>
          <CountList title="Top colleges" items={overview.topColleges} />
          <div className="grid gap-3 sm:grid-cols-2">
            <CountList title="Top degrees" items={overview.topDegrees} />
            <CountList
              title="Coupon redemptions"
              items={overview.coupons.map((c) => ({ label: c.isActive ? c.code : `${c.code} (inactive)`, count: c.redemptions }))}
            />
          </div>
        </div>
      )}

      {crm && <CrmSection data={crm} />}
      {interviews && <CompanyInterviewSection data={interviews} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Users {users ? `(${users.total})` : ''}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Search name, email or college"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              aria-label="Filter by stage"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={crmStatus}
              onChange={(e) => setCrmStatus(e.target.value)}
              aria-label="Filter by CRM status"
            >
              <option value="">All CRM statuses</option>
              {crmMeta?.statuses.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            {loading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {['Name', 'Email', 'Registered', 'College', 'Profile', 'Payment', 'Coupon', 'Paid', 'Stage', 'CRM', 'Last contacted'].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {users?.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.registeredAt)}</td>
                    <td className="px-3 py-2">{r.college ?? '-'}</td>
                    <td className="px-3 py-2">{r.profileComplete ? 'Complete' : r.profileStarted ? 'Started' : 'None'}</td>
                    <td className="px-3 py-2">{r.paymentInitiated ? 'Initiated' : 'No'}</td>
                    <td className="px-3 py-2">{r.couponCode ?? '-'}</td>
                    <td className="px-3 py-2 tabular-nums">{r.totalPaidInr ? inr(r.totalPaidInr) : '-'}</td>
                    <td className="px-3 py-2">{r.stageLabel}</td>
                    <td className="px-3 py-2">{r.crmStatus ? (crmMeta?.statuses.find((s) => s.key === r.crmStatus)?.label ?? r.crmStatus) : '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.lastContactedAt)}</td>
                  </tr>
                ))}
                {users && users.rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                      No users match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
