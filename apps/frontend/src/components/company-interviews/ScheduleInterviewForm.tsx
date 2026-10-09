import * as React from 'react'
import { toast } from 'sonner'
import { Eye, Loader2, Send } from 'lucide-react'

import {
  previewInvite,
  scheduleCompanyInterview,
  searchInterviewCompanies,
  searchInterviewStudents,
  sendInviteTest,
  type InviteInput,
  type InvitePreview,
} from '@/lib/company-interviews'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { istInputToIso } from '@/lib/utils'
import { EntityPicker, type PickerOption } from './EntityPicker'
import { InvitePreviewPanel } from './InvitePreviewPanel'

export const DURATIONS = [15, 30, 45, 60, 90, 120]

export function reportDelivery(emails: { student: string; company: string }, done: string) {
  const failed = [emails.student === 'failed' && 'student', emails.company === 'failed' && 'company'].filter(Boolean)
  if (failed.length) toast.warning(`${done}, but the ${failed.join(' and ')} email failed. Use "Resend emails" to try again.`)
  else toast.success(`${done}. Both sides have been emailed.`)
}

export function ScheduleInterviewForm({ initialStudent, onScheduled }: { initialStudent?: string; onScheduled: () => void }) {
  const [student, setStudent] = React.useState<PickerOption | null>(null)
  const [company, setCompany] = React.useState<PickerOption | null>(null)
  const [start, setStart] = React.useState('')
  const [duration, setDuration] = React.useState(60)
  const [extra, setExtra] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [meetLink, setMeetLink] = React.useState('')
  const [preview, setPreview] = React.useState<InvitePreview | null>(null)
  const [busy, setBusy] = React.useState<'preview' | 'test' | 'send' | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const input = (): InviteInput => ({
    studentId: student?.id,
    companyId: company?.id,
    start: istInputToIso(start),
    durationMin: duration,
    message,
    extraAttendees: extra.split(/[\s,;]+/).filter(Boolean),
    manualMeetLink: meetLink.trim() || undefined,
  })

  // Any edit invalidates the preview, so what was verified is what gets sent
  React.useEffect(() => setPreview(null), [student, company, start, duration, extra, message, meetLink])

  const ready = !!student && !!company && !!start

  async function run<T>(kind: 'preview' | 'test' | 'send', fn: () => Promise<T>) {
    setBusy(kind)
    try {
      return await fn()
    } catch (e) {
      if (kind === 'preview') toast.error(e instanceof Error ? e.message : 'Could not build the preview')
      return undefined
    } finally {
      setBusy(null)
    }
  }

  async function onSend() {
    const res = await run('send', () => scheduleCompanyInterview(input()))
    setConfirmOpen(false)
    if (!res) return
    reportDelivery(res.emails, 'Interview scheduled')
    setStudent(null)
    setCompany(null)
    setStart('')
    setExtra('')
    setMessage('')
    setMeetLink('')
    onScheduled()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">Interview details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EntityPicker
            label="Student"
            placeholder="Search name, email or college"
            value={student}
            onChange={setStudent}
            initialQuery={initialStudent}
            search={(q) =>
              searchInterviewStudents(q).then((r) => r.map((s) => ({ id: s.id, title: s.name, subtitle: `${s.email} · ${s.college} · ${s.specialization}` })))
            }
          />
          <EntityPicker
            label="Company"
            placeholder="Search approved companies"
            value={company}
            onChange={setCompany}
            search={(q) => searchInterviewCompanies(q).then((r) => r.map((c) => ({ id: c.id, title: c.name, subtitle: `${c.contactName} · ${c.email}` })))}
          />
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ci-start">Date and time (IST)</Label>
              <Input id="ci-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ci-duration">Duration</Label>
              <select
                id="ci-duration"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-extra">Other company interviewers (optional)</Label>
            <Input id="ci-extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="partner@firm.com, associate@firm.com" />
            <p className="text-xs text-muted-foreground">They get the calendar invite and the company email.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-message">Message to both sides (optional)</Label>
            <Textarea id="ci-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={3000} placeholder="e.g. Please keep your writing sample ready. A blank line starts a new paragraph." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ci-link">Own meeting link (optional)</Label>
            <Input id="ci-link" value={meetLink} onChange={(e) => setMeetLink(e.target.value)} placeholder="https://zoom.us/j/… — leave empty for Google Meet" />
          </div>
          <Button className="w-full" disabled={!ready || busy === 'preview'} onClick={() => run('preview', () => previewInvite(input()).then(setPreview))}>
            {busy === 'preview' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}Preview invite and emails
          </Button>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">Review before sending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <>
              <InvitePreviewPanel preview={preview} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={busy === 'test'}
                  onClick={() => run('test', () => sendInviteTest(input()).then((r) => toast.success(`Test emails sent to ${r.sentTo}`)))}
                >
                  {busy === 'test' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test emails
                </Button>
                <Button onClick={() => setConfirmOpen(true)}>
                  <Send className="mr-2 h-4 w-4" />Confirm and send
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
              Fill in the details and click “Preview” to see the exact emails and calendar invite that will go out.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Schedule this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              {student?.title} and {company?.title} will get the calendar invite and email right away. This shares the student’s name and email with the company.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === 'send'}>Not yet</AlertDialogCancel>
            <AlertDialogAction disabled={busy === 'send'} onClick={(e) => { e.preventDefault(); void onSend() }}>
              {busy === 'send' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
