import * as React from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// One hue for magnitude; text stays in ink tokens, never the series color.
export const BAR = '#d97706'

export const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
export const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
const shortDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
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

export function CountList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
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

export function Bars({ items }: { items: { label: string; count: number }[] }) {
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

// Daily series with axes and tooltip (replaces the hand-rolled SVG chart)
export function DailyChart({ data, noun }: { data: { date: string; count: number }[]; noun: string }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">No {noun}s in this range.</p>
  return (
    <div className="h-44 w-full" role="img" aria-label={`${noun}s per day`}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeOpacity={0.15} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(l) => fmtDate(String(l))}
            formatter={(v) => [String(v), `${noun}s`]}
            cursor={{ fillOpacity: 0.1 }}
          />
          <Bar dataKey="count" fill={BAR} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Rates computed on a handful of mails are noise, so say so next to the number
export function SampleFlag({ small }: { small: boolean }) {
  if (!small) return null
  return (
    <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-800" title="Fewer than 50 mails sent, so this rate is unreliable">
      small sample
    </span>
  )
}

export function Delta({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (!value) return null
  const up = value > 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span className={`inline-flex items-center text-xs ${up ? 'text-emerald-600' : 'text-red-600'}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value)}
      {suffix}
    </span>
  )
}

export interface DateRange {
  from: string
  to: string
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

export function useDateRange(): [DateRange, (r: DateRange) => void] {
  const [range, setRange] = React.useState<DateRange>({ from: '', to: '' })
  return [range, setRange]
}

export function DateRangeBar({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const preset = (days: number) => {
    const to = new Date()
    const from = new Date(Date.now() - days * 86_400_000)
    onChange({ from: isoDay(from), to: isoDay(to) })
  }
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex gap-1">
        {[7, 30, 90].map((d) => (
          <Button key={d} variant="outline" size="sm" onClick={() => preset(d)}>
            {d}d
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ from: '', to: '' })}>
          All time
        </Button>
      </div>
      <label className="text-xs text-muted-foreground">
        From
        <Input type="date" value={range.from} onChange={(e) => onChange({ ...range, from: e.target.value })} />
      </label>
      <label className="text-xs text-muted-foreground">
        To
        <Input type="date" value={range.to} onChange={(e) => onChange({ ...range, to: e.target.value })} />
      </label>
    </div>
  )
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}
