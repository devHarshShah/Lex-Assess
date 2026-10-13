import type { SendTimes } from '@/lib/analytics'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, h) => h)

// Darker amber = higher click rate. Cells with too few mails stay pale and are marked in the tooltip.
export function SendTimeHeatmap({ data }: { data?: SendTimes }) {
  if (!data || data.cells.length === 0) {
    return <p className="text-sm text-muted-foreground">No sends in this range yet.</p>
  }
  const byKey = new Map(data.cells.map((c) => [`${c.day}|${c.hour}`, c]))
  const max = Math.max(...data.cells.filter((c) => c.sent >= data.minSample).map((c) => c.ctrPct), 1)
  return (
    <div className="overflow-x-auto" role="img" aria-label="Click rate by day of week and hour">
      <table className="border-separate border-spacing-0.5 text-[10px]">
        <thead>
          <tr>
            <th />
            {HOURS.map((h) => (
              <th key={h} className="w-5 font-normal text-muted-foreground">
                {h % 3 === 0 ? h : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, day) => (
            <tr key={d}>
              <td className="pr-1 text-muted-foreground">{d}</td>
              {HOURS.map((h) => {
                const c = byKey.get(`${day}|${h}`)
                const reliable = !!c && c.sent >= data.minSample
                const alpha = c ? (reliable ? 0.2 + 0.8 * (c.ctrPct / max) : 0.1) : 0
                return (
                  <td
                    key={h}
                    className="h-5 w-5 rounded-sm bg-muted/40"
                    style={c ? { background: `rgba(217,119,6,${alpha})` } : undefined}
                    title={c ? `${d} ${h}:00: ${c.ctrPct}% clicked of ${c.sent} sent${reliable ? '' : ' (small sample)'}` : `${d} ${h}:00: nothing sent`}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="pt-2 text-xs text-muted-foreground">Hours are IST. Pale cells have fewer than {data.minSample} mails.</p>
    </div>
  )
}
