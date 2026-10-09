import * as React from 'react'
import { toast } from 'sonner'
import { Download, Loader2, MessageCircle, Phone } from 'lucide-react'

import { downloadLeadsXlsx, fetchCrmMeta, fetchLeads, phoneDigits, whatsappUrl, type CrmMeta, type CrmQueue, type LeadQuery, type LeadsPage } from '@/lib/crm'
import { LeadSheet, StatusBadge } from '@/components/crm/LeadSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatIst } from '@/lib/utils'

const QUEUES: { key: CrmQueue; label: string }[] = [
  { key: 'due', label: 'Due today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'new', label: 'Never contacted' },
  { key: 'all', label: 'All leads' },
]

const STAGES: { value: string; label: string }[] = [
  { value: '', label: 'All funnel stages' },
  { value: 'PROFILE_COMPLETE', label: 'Profile complete, no payment' },
  { value: 'PAYMENT_INITIATED', label: 'Payment initiated, not active' },
  { value: 'TRIAL', label: 'In free trial' },
  { value: 'PAID', label: 'Paid and active' },
  { value: 'CANCELLED_ACTIVE', label: 'Autopay cancelled, still has access' },
  { value: 'LAPSED', label: 'Paid, now inactive' },
]

const select = 'h-10 rounded-md border border-input bg-background px-3 text-sm'

export function SuperadminCrmPage() {
  const [meta, setMeta] = React.useState<CrmMeta | null>(null)
  const [queue, setQueue] = React.useState<CrmQueue>('due')
  const [status, setStatus] = React.useState('')
  const [stage, setStage] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<LeadsPage | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [reload, setReload] = React.useState(0)
  const [downloading, setDownloading] = React.useState(false)

  React.useEffect(() => {
    fetchCrmMeta().then(setMeta).catch(() => undefined)
  }, [])
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])
  React.useEffect(() => setPage(1), [queue, status, stage, debounced])

  const query: LeadQuery = React.useMemo(() => ({ queue, status, stage, search: debounced, page }), [queue, status, stage, debounced, page])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchLeads(query)
      .then((d) => !cancelled && setData(d))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [query, reload])

  async function onDownload() {
    setDownloading(true)
    try {
      await downloadLeadsXlsx(query)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const now = Date.now()

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Student CRM</h1>
          <p className="text-sm text-muted-foreground">Students with a completed profile and phone number. Call, log the outcome, set the next follow-up.</p>
        </div>
        <Button variant="outline" onClick={onDownload} disabled={downloading}>
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download Excel
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUEUES.map((q) => (
          <Button key={q.key} variant={queue === q.key ? 'secondary' : 'ghost'} onClick={() => setQueue(q.key)} className={cn(queue === q.key && 'ring-1 ring-border')}>
            {q.label}
            <span className={cn('ml-1 rounded-full px-2 text-xs tabular-nums', q.key === 'overdue' && (data?.queueCounts.overdue ?? 0) > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted')}>
              {data?.queueCounts[q.key] ?? '–'}
            </span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search name, email or college" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="CRM status">
          <option value="">All statuses</option>
          {meta?.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className={select} value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Funnel stage">
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {['Student', 'College', 'Phone', 'CRM status', 'Funnel stage', 'Attempts', 'Last contacted', 'Next follow-up'].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.rows.map((r) => {
              const overdue = r.nextFollowUpAt && new Date(r.nextFollowUpAt).getTime() < now
              const dnc = r.status === 'DO_NOT_CONTACT'
              return (
                <tr key={r.userId} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenId(r.userId)}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.name}</span>
                    {r.priority === 'HIGH' && <span className="ml-2 text-xs text-amber-600">High</span>}
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-3 py-2">{r.college ?? '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {dnc ? (
                      <span className="text-xs text-muted-foreground">Do not contact</span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${phoneDigits(r.mobile)}`} title="Call"><Phone className="h-3.5 w-3.5" />{r.mobile}</a>
                        <a className="ml-1 text-emerald-600" href={whatsappUrl(r.mobile)} target="_blank" rel="noreferrer" title="WhatsApp" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} meta={meta} /></td>
                  <td className="px-3 py-2 text-xs">{r.stageLabel}</td>
                  <td className="px-3 py-2 tabular-nums">{r.contactAttempts}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatIst(r.lastContactedAt)}</td>
                  <td className={cn('px-3 py-2 whitespace-nowrap', overdue && 'font-medium text-destructive')}>{formatIst(r.nextFollowUpAt)}</td>
                </tr>
              )
            })}
            {data && data.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  {queue === 'due' ? 'No follow-ups due today.' : 'No leads match these filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Page {page} of {totalPages}{data ? ` · ${data.total} leads` : ''}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {openId && <LeadSheet userId={openId} meta={meta} onClose={() => setOpenId(null)} onChanged={() => setReload((r) => r + 1)} />}
    </div>
  )
}
