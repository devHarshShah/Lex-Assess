import * as React from 'react'
import { toast } from 'sonner'
import { Download, Loader2 } from 'lucide-react'

import {
  downloadAnalyticsXlsx,
  fetchAnalyticsOverview,
  fetchAnalyticsUsers,
  type AnalyticsFilters,
  type AnalyticsOverview,
  type UsersPage,
} from '@/lib/analytics'
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

function SignupsChart({ data }: { data: AnalyticsOverview['signups'] }) {
  const first = data[0]
  const last = data[data.length - 1]
  if (!first || !last) return <p className="text-sm text-muted-foreground">No signups in this range.</p>
  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 600
  const h = 140
  const slot = w / data.length
  const barW = Math.min(14, Math.max(2, slot - 2))
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label="Signups per day">
        <line x1="0" x2={w} y1={h} y2={h} stroke="currentColor" strokeOpacity="0.2" />
        {data.map((d, i) => {
          const bh = (d.count / max) * (h - 8)
          return (
            <g key={d.date}>
              <title>{`${fmtDate(d.date)}: ${d.count} signup${d.count === 1 ? '' : 's'}`}</title>
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
    () => ({ from, to, stage, search: debouncedSearch }),
    [from, to, stage, debouncedSearch],
  )

  React.useEffect(() => {
    setPage(1)
  }, [filters])

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
          <p className="text-sm text-muted-foreground">Registrations, profile completion and payment funnel.</p>
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
            {loading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {['Name', 'Email', 'Registered', 'College', 'Profile', 'Payment', 'Coupon', 'Paid', 'Stage'].map((h) => (
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
                  </tr>
                ))}
                {users && users.rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
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
