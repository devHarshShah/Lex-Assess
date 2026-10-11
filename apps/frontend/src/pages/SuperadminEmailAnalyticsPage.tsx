import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import {
  fetchEmailCampaignStats,
  fetchEmailOverview,
  type EmailCampaignRow,
} from '@/lib/analytics'
import {
  DailyChart,
  DateRangeBar,
  PageHeader,
  SampleFlag,
  Tile,
  fmtDate,
  inr,
  useDateRange,
} from '@/components/analytics/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type SortKey = 'createdAt' | 'sent' | 'convertedPct' | 'revenueInr' | 'unsubPct' | 'revenuePer1000'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'createdAt', label: 'Newest' },
  { key: 'convertedPct', label: 'Conversion %' },
  { key: 'revenueInr', label: 'Revenue' },
  { key: 'revenuePer1000', label: 'Revenue per 1,000 mails' },
  { key: 'sent', label: 'Mails sent' },
  { key: 'unsubPct', label: 'Unsubscribe %' },
]

function sortRows(rows: EmailCampaignRow[], key: SortKey) {
  return [...rows].sort((a, b) =>
    key === 'createdAt' ? b.createdAt.localeCompare(a.createdAt) : (b[key] as number) - (a[key] as number),
  )
}

export function SuperadminEmailAnalyticsPage() {
  const [range, setRange] = useDateRange()
  const [sort, setSort] = React.useState<SortKey>('createdAt')
  const overview = useQuery({ queryKey: ['analytics', 'email', 'overview', range], queryFn: () => fetchEmailOverview(range) })
  const campaigns = useQuery({ queryKey: ['analytics', 'email', 'campaigns', range], queryFn: () => fetchEmailCampaignStats(range) })

  const t = overview.data?.totals
  const q = overview.data?.quota

  return (
    <div className="space-y-4">
      <PageHeader title="Email campaigns" subtitle="Mails sent, delivery, and what happened to the students afterwards.">
        <DateRangeBar range={range} onChange={setRange} />
      </PageHeader>

      {overview.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : t ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Tile label="Mails sent" value={t.sent.toLocaleString('en-IN')} hint={`${t.campaigns} campaigns`} />
          <Tile label="Delivered" value={`${t.deliveryPct}%`} hint={`${t.failed} failed, ${t.skipped} skipped`} />
          <Tile label="Converted" value={String(t.converted)} hint={`${t.convertedPct}% of ${t.tracked} tracked`} />
          <Tile label="Moved forward" value={`${t.advancedPct}%`} hint={`${t.advanced} students`} />
          <Tile label="Revenue after send" value={inr(t.revenueInr)} hint={`${inr(t.revenuePer1000)} per 1,000 mails`} />
          <Tile label="Unsubscribed" value={`${t.unsubPct}%`} hint={`${t.unsubscribes} students`} />
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mails sent per day</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyChart data={(overview.data?.perDay ?? []).map((d) => ({ date: d.date, count: d.sent }))} noun="mail" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sending volume now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-2xl font-bold tabular-nums">{q?.sentToday ?? 0}</span> sent today (UTC)
            </p>
            <p className="text-muted-foreground">{q?.sentLastHour ?? 0} in the last hour</p>
            <p className="pt-2 text-xs text-muted-foreground">
              Conversion counts students who moved from a non-paying stage to trial or paid after the mail. It shows
              correlation, not proof the mail caused it.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">Campaign leaderboard</CardTitle>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort campaigns"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  {['Campaign', 'Template', 'Sent', 'Delivered', 'Moved fwd', 'Converted', 'Revenue', 'Per 1,000', 'Unsub'].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.isLoading && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6">
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                )}
                {sortRows(campaigns.data ?? [], sort).map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <Link to="/dashboard/email-campaigns" className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</p>
                    </td>
                    <td className="px-3 py-2">{c.templateName}</td>
                    <td className="px-3 py-2 tabular-nums">{c.sent}</td>
                    <td className="px-3 py-2 tabular-nums">{c.deliveryPct}%</td>
                    <td className="px-3 py-2 tabular-nums">{c.advancedPct}%</td>
                    <td className="px-3 py-2 tabular-nums">
                      {c.converted} ({c.convertedPct}%)
                      <SampleFlag small={c.smallSample} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">{c.revenueInr ? inr(c.revenueInr) : '-'}</td>
                    <td className="px-3 py-2 tabular-nums">{c.revenuePer1000 ? inr(c.revenuePer1000) : '-'}</td>
                    <td className="px-3 py-2 tabular-nums">{c.unsubPct}%</td>
                  </tr>
                ))}
                {campaigns.data?.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                      No campaigns in this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
