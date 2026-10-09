import * as React from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

import {
  cancelCompanyInterview,
  fetchCompanyInterviews,
  previewInvite,
  rescheduleCompanyInterview,
  resendInviteEmails,
  sendInviteTest,
  type CompanyInterviewRow,
  type InviteInput,
  type InvitePreview,
} from '@/lib/company-interviews'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatIst, isoToIstInput, istInputToIso } from '@/lib/utils'
import { InvitePreviewPanel } from './InvitePreviewPanel'
import { DURATIONS, reportDelivery } from './ScheduleInterviewForm'

const STATUS_VARIANT = { SCHEDULED: 'default', COMPLETED: 'success', CANCELLED: 'destructive' } as const

function Sent({ at, label }: { at: string | null; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={at ? `${label} emailed ${formatIst(at)}` : `${label} email not delivered`}>
      {at ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
      {label}
    </span>
  )
}

type Action = { kind: 'reschedule' | 'cancel'; row: CompanyInterviewRow }

function ChangeDialog({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: () => void }) {
  const { kind, row } = action
  const [start, setStart] = React.useState(isoToIstInput(row.scheduledAt))
  const [duration, setDuration] = React.useState(Math.round((+new Date(row.endTime) - +new Date(row.scheduledAt)) / 60000))
  const [message, setMessage] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [preview, setPreview] = React.useState<InvitePreview | null>(null)
  const [busy, setBusy] = React.useState<'preview' | 'test' | 'send' | null>(null)

  React.useEffect(() => setPreview(null), [start, duration, message, reason])

  const input = (): InviteInput => ({
    interviewId: row.id,
    variant: kind === 'cancel' ? 'cancelled' : 'rescheduled',
    start: istInputToIso(start),
    durationMin: duration,
    message,
    reason,
  })

  async function run(kind: 'preview' | 'test' | 'send', fn: () => Promise<unknown>) {
    setBusy(kind)
    try {
      await fn()
    } catch (e) {
      if (kind === 'preview') toast.error(e instanceof Error ? e.message : 'Could not build the preview')
    } finally {
      setBusy(null)
    }
  }

  const send = () =>
    run('send', async () => {
      const res = kind === 'cancel' ? await cancelCompanyInterview(row.id, input()) : await rescheduleCompanyInterview(row.id, input())
      reportDelivery(res.emails, kind === 'cancel' ? 'Interview cancelled' : 'Interview rescheduled')
      onDone()
    })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{kind === 'cancel' ? 'Cancel interview' : 'Reschedule interview'}</DialogTitle>
          <DialogDescription>
            {row.studentName} with {row.companyName}, currently {formatIst(row.scheduledAt)} IST
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {kind === 'reschedule' ? (
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rs-start">New date and time (IST)</Label>
                <Input id="rs-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rs-duration">Duration</Label>
                <select id="rs-duration" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                  {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map((d) => (
                    <option key={d} value={d}>{d} min</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="cx-reason">Reason (shown to both sides)</Label>
              <Input id="cx-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. The company has paused hiring for this role" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ch-message">Message (optional)</Label>
            <Textarea id="ch-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} />
          </div>
          {preview ? (
            <InvitePreviewPanel preview={preview} />
          ) : (
            <Button variant="outline" className="w-full" disabled={busy === 'preview'} onClick={() => run('preview', () => previewInvite(input()).then(setPreview))}>
              {busy === 'preview' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Preview emails and calendar update
            </Button>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {preview && (
            <>
              <Button variant="outline" disabled={busy === 'test'} onClick={() => run('test', () => sendInviteTest(input()).then((r) => toast.success(`Test emails sent to ${r.sentTo}`)))}>
                Send test emails
              </Button>
              <Button variant={kind === 'cancel' ? 'destructive' : 'default'} disabled={busy === 'send'} onClick={send}>
                {busy === 'send' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {kind === 'cancel' ? 'Cancel interview and notify' : 'Reschedule and notify'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function InterviewsTab({ refreshKey }: { refreshKey: number }) {
  const [status, setStatus] = React.useState('SCHEDULED')
  const [source, setSource] = React.useState('')
  const [search, setSearch] = React.useState('')
  const [q, setQ] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<Awaited<ReturnType<typeof fetchCompanyInterviews>> | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [action, setAction] = React.useState<Action | null>(null)
  const [resending, setResending] = React.useState<string | null>(null)
  const [reload, setReload] = React.useState(0)

  React.useEffect(() => {
    const t = setTimeout(() => setQ(search), 300)
    return () => clearTimeout(t)
  }, [search])
  React.useEffect(() => setPage(1), [status, source, q])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCompanyInterviews({ status, source, search: q, page })
      .then((d) => !cancelled && setData(d))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status, source, q, page, refreshKey, reload])

  async function resend(id: string) {
    setResending(id)
    try {
      reportDelivery((await resendInviteEmails(id)).emails, 'Emails resent')
      setReload((r) => r + 1)
    } catch {
      /* toast shown by api client */
    } finally {
      setResending(null)
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const select = 'h-10 rounded-md border border-input bg-background px-3 text-sm'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search student or company" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select className={select} value={source} onChange={(e) => setSource(e.target.value)} aria-label="Scheduled by">
          <option value="">Scheduled by anyone</option>
          <option value="SUPERADMIN">LexAssess team</option>
          <option value="COMPANY">Company</option>
        </select>
        {loading && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {['When (IST)', 'Student', 'Company', 'Status', 'Link', 'Emails', ''].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatIst(r.scheduledAt)}
                  <p className="text-xs text-muted-foreground">
                    {Math.round((+new Date(r.endTime) - +new Date(r.scheduledAt)) / 60000)} min
                    {r.rescheduleCount > 0 && ` · moved ${r.rescheduleCount}×`}
                  </p>
                </td>
                <td className="px-3 py-2">
                  {r.studentName}
                  <p className="text-xs text-muted-foreground">{r.studentEmail}</p>
                </td>
                <td className="px-3 py-2">
                  {r.companyName}
                  <p className="text-xs text-muted-foreground">{r.source === 'SUPERADMIN' ? `By ${r.scheduledByName ?? 'LexAssess'}` : 'By company'}</p>
                </td>
                <td className="px-3 py-2">
                  <Badge variant={STATUS_VARIANT[r.status]}>{r.status.toLowerCase()}</Badge>
                  {r.cancelReason && <p className="mt-1 max-w-[180px] text-xs text-muted-foreground">{r.cancelReason}</p>}
                </td>
                <td className="px-3 py-2">
                  {r.meetLink ? <a className="text-primary underline-offset-4 hover:underline" href={r.meetLink} target="_blank" rel="noreferrer">Join</a> : '-'}
                  {r.hasCalendarEvent && <p className="text-xs text-muted-foreground">In calendar</p>}
                </td>
                <td className="px-3 py-2 text-xs">
                  {r.source === 'SUPERADMIN' ? (
                    <div className="space-y-0.5">
                      <Sent at={r.studentEmailSentAt} label="Student" />
                      <br />
                      <Sent at={r.companyEmailSentAt} label="Company" />
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-end gap-1">
                    {r.status === 'SCHEDULED' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setAction({ kind: 'reschedule', row: r })}>Reschedule</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAction({ kind: 'cancel', row: r })}>Cancel</Button>
                      </>
                    )}
                    {r.status !== 'COMPLETED' && (
                      <Button size="sm" variant="ghost" disabled={resending === r.id} onClick={() => resend(r.id)}>
                        {resending === r.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}Resend emails
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data && data.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No interviews match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Page {page} of {totalPages}{data ? ` · ${data.total} interviews` : ''}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      {action && (
        <ChangeDialog
          action={action}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null)
            setReload((r) => r + 1)
          }}
        />
      )}
    </div>
  )
}
