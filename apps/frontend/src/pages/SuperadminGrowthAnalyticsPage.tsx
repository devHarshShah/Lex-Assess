import { useQuery } from '@tanstack/react-query'

import { fetchFunnelTiming, fetchRevenueAnalytics } from '@/lib/analytics'
import { Delta, DailyChart, PageHeader, Tile, inr } from '@/components/analytics/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const weekLabel = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export function SuperadminGrowthAnalyticsPage() {
  const revenue = useQuery({ queryKey: ['analytics', 'revenue'], queryFn: fetchRevenueAnalytics })
  const timing = useQuery({ queryKey: ['analytics', 'funnel-timing'], queryFn: () => fetchFunnelTiming(8) })
  const r = revenue.data
  const t = timing.data
  const change = r && r.revenuePrev30 ? Math.round(((r.revenue30 - r.revenuePrev30) / r.revenuePrev30) * 100) : 0

  return (
    <div className="space-y-4">
      <PageHeader title="Revenue and growth" subtitle="Money in, churn, and how quickly signups turn into customers." />

      {revenue.isLoading && <Skeleton className="h-24 w-full" />}
      {r && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Tile label="Revenue, last 30 days" value={inr(r.revenue30)} hint={`${r.payments30} payments`} />
            <Tile label="Vs previous 30 days" value={r.revenuePrev30 ? `${change > 0 ? '+' : ''}${change}%` : '-'} hint={inr(r.revenuePrev30)} />
            <Tile label="Revenue, all time" value={inr(r.revenueTotal)} hint={`${inr(r.arpuInr)} per paying student`} />
            <Tile label="Paying now" value={String(r.payingNow)} hint={`${r.cancelledStillActive} cancelled autopay`} />
            <Tile label="Churn" value={`${r.churnPct}%`} hint={`${r.lapsed} lapsed`} />
            <Tile label="Failed payments, 30 days" value={String(r.failedPayments30)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Trial to paid: {r.trialToPaidPct}% of the {r.trialists} students who ever had a free trial have paid (trials still running count as not yet paid).{' '}
            <Delta value={change} />
          </p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue per day (₹, last 60 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyChart data={r.perDay} noun="rupee" />
            </CardContent>
          </Card>
        </>
      )}

      {timing.isLoading && <Skeleton className="h-40 w-full" />}
      {t && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Median days to first payment" value={t.medianDaysToFirstPayment === null ? '-' : String(t.medianDaysToFirstPayment)} hint={`${t.payersInWindow} of ${t.signups} signups paid`} />
            <Tile label="Paid within a day" value={`${t.withinDayPct}%`} hint="Of those who paid" />
            <Tile label="Paid within a week" value={`${t.withinWeekPct}%`} hint="Of those who paid" />
            <Tile label="Signups in window" value={String(t.signups)} hint={`Last ${t.weeks} weeks`} />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signup cohorts: % who paid within N weeks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Week of</th>
                      <th className="px-3 py-2 font-medium">Signups</th>
                      {Array.from({ length: t.weeks }, (_, n) => (
                        <th key={n} className="px-3 py-2 font-medium">
                          {n + 1}w
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {t.cohorts.map((c) => (
                      <tr key={c.week}>
                        <td className="px-3 py-2 whitespace-nowrap">{weekLabel(c.week)}</td>
                        <td className="px-3 py-2 tabular-nums">{c.size}</td>
                        {c.paidByWeek.map((v, n) => (
                          <td
                            key={n}
                            className="px-3 py-2 tabular-nums"
                            style={v === null ? undefined : { background: `rgba(217,119,6,${Math.min(0.15 + v / 40, 0.85)})` }}
                          >
                            {v === null ? '' : `${v}%`}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {t.cohorts.length === 0 && (
                      <tr>
                        <td colSpan={t.weeks + 2} className="px-3 py-6 text-center text-muted-foreground">
                          No signups in this window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
