import { useQuery } from '@tanstack/react-query'

import { fetchTemplateAnalytics } from '@/lib/analytics'
import { DateRangeBar, PageHeader, SampleFlag, inr, useDateRange } from '@/components/analytics/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function SuperadminTemplateAnalyticsPage() {
  const [range, setRange] = useDateRange()
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'email', 'templates', range],
    queryFn: () => fetchTemplateAnalytics(range),
  })
  const best = data?.templates.find((t) => !t.smallSample && t.sent > 0)

  return (
    <div className="space-y-4">
      <PageHeader title="Template performance" subtitle="Which email template actually moves students forward.">
        <DateRangeBar range={range} onChange={setRange} />
      </PageHeader>

      {isLoading && <Skeleton className="h-40 w-full" />}

      {best && (
        <Card>
          <CardContent className="p-4 text-sm">
            Best so far: <span className="font-semibold">{best.name}</span> converts {best.convertedPct}% of{' '}
            {best.sent} mails sent and earns {inr(best.revenuePer1000)} per 1,000.
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">All templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {['Template', 'Campaigns', 'Sent', 'Moved fwd', 'Converted', 'Revenue', 'Per 1,000', 'Unsub'].map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.templates.map((t) => (
                    <tr key={t.key}>
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 tabular-nums">{t.campaigns}</td>
                      <td className="px-3 py-2 tabular-nums">{t.sent}</td>
                      <td className="px-3 py-2 tabular-nums">{t.advancedPct}%</td>
                      <td className="px-3 py-2 tabular-nums">
                        {t.converted} ({t.convertedPct}%)
                        <SampleFlag small={t.smallSample} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{t.revenueInr ? inr(t.revenueInr) : '-'}</td>
                      <td className="px-3 py-2 tabular-nums">{t.revenuePer1000 ? inr(t.revenuePer1000) : '-'}</td>
                      <td className="px-3 py-2 tabular-nums">{t.unsubPct}%</td>
                    </tr>
                  ))}
                  {data.templates.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                        No campaigns in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data && data.byStage.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Best template by funnel stage</h2>
            <p className="text-sm text-muted-foreground">
              Conversion of students mailed while at each stage. Compare like with like, since a payment reminder only
              makes sense for students stuck at checkout.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.byStage.map((s) => (
              <Card key={s.stage}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{s.stageLabel}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {s.options.map((o) => (
                      <li key={o.key}>
                        <div className="flex justify-between gap-3">
                          <span className="truncate">
                            {o.name}
                            <SampleFlag small={o.smallSample} />
                          </span>
                          <span className="tabular-nums">
                            {o.convertedPct}% <span className="text-xs text-muted-foreground">({o.converted}/{o.sent})</span>
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded bg-muted">
                          <div className="h-2 rounded-r bg-amber-600" style={{ width: `${Math.min(o.convertedPct, 100)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
