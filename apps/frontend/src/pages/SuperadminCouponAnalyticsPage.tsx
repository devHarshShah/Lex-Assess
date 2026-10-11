import { useQuery } from '@tanstack/react-query'

import { fetchCouponAnalytics } from '@/lib/analytics'
import { DateRangeBar, PageHeader, Tile, inr, useDateRange } from '@/components/analytics/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SuperadminCouponAnalyticsPage() {
  const [range, setRange] = useDateRange()
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'coupons', range],
    queryFn: () => fetchCouponAnalytics(range),
  })

  const total = (f: (c: NonNullable<typeof data>[number]) => number) => (data ?? []).reduce((a, c) => a + f(c), 0)
  const users = total((c) => c.inRange)
  const paidEver = total((c) => c.paidEver)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Coupons and trials"
        subtitle="What happens to students after they redeem a coupon. Range filters by registration date."
      >
        <DateRangeBar range={range} onChange={setRange} />
      </PageHeader>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Tile label="Coupon students" value={String(users)} />
            <Tile label="Still in trial" value={String(total((c) => c.trial))} />
            <Tile label="Cancelled autopay, still has access" value={String(total((c) => c.cancelledActive))} />
            <Tile label="Trial to paid" value={users ? `${Math.round((paidEver / users) * 1000) / 10}%` : '0%'} hint={`${paidEver} paid at least once`} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By coupon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      {['Coupon', 'Free days', 'Redeemed', 'In range', 'In trial', 'Paid', 'Cancelled, active', 'Lapsed', 'Trial to paid', 'Revenue'].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((c) => (
                      <tr key={c.code}>
                        <td className="px-3 py-2 font-medium">
                          {c.code}
                          {!c.isActive && <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{c.freeDays}</td>
                        <td className="px-3 py-2 tabular-nums">{c.redeemed}</td>
                        <td className="px-3 py-2 tabular-nums">{c.inRange}</td>
                        <td className="px-3 py-2 tabular-nums">{c.trial}</td>
                        <td className="px-3 py-2 tabular-nums">{c.paid}</td>
                        <td className="px-3 py-2 tabular-nums">{c.cancelledActive}</td>
                        <td className="px-3 py-2 tabular-nums">{c.lapsed}</td>
                        <td className="px-3 py-2 tabular-nums">{c.trialToPaidPct}%</td>
                        <td className="px-3 py-2 tabular-nums">{c.revenueInr ? inr(c.revenueInr) : '-'}</td>
                      </tr>
                    ))}
                    {data.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                          No coupon redemptions yet.
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
