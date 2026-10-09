import * as React from 'react'
import { AlertTriangle, CalendarDays, Monitor, Smartphone } from 'lucide-react'

import type { InvitePreview } from '@/lib/company-interviews'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const fmt = (s: string) =>
  new Date(s).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })

const CALENDAR_ACTION: Record<InvitePreview['calendar']['action'], string> = {
  create: 'A Google Calendar invite will be created and sent',
  update: 'The Google Calendar invite will be moved and attendees notified',
  delete: 'The Google Calendar invite will be removed and attendees notified',
}

// Exactly what will be sent: both emails (rendered by the backend) and the calendar invite.
export function InvitePreviewPanel({ preview }: { preview: InvitePreview }) {
  const [side, setSide] = React.useState<'student' | 'company'>('student')
  const [mobile, setMobile] = React.useState(false)
  const email = preview[side]
  const cal = preview.calendar

  return (
    <div className="space-y-4">
      {preview.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          {preview.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border p-4 text-sm">
        <p className="mb-2 flex items-center gap-2 font-medium">
          <CalendarDays className="h-4 w-4" />
          Calendar invite
        </p>
        {cal.enabled ? (
          <div className="space-y-1">
            <p className="text-muted-foreground">{CALENDAR_ACTION[cal.action]}{cal.invitesAttendees ? '' : ' (organizer calendar only, no attendees)'}.</p>
            <p><span className="text-muted-foreground">Title:</span> {cal.summary}</p>
            <p><span className="text-muted-foreground">When:</span> {fmt(cal.start)} – {new Date(cal.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</p>
            {cal.invitesAttendees && <p><span className="text-muted-foreground">Guests:</span> {cal.attendees.join(', ')}</p>}
            {cal.meetLinkGenerated && <p className="text-muted-foreground">A Google Meet link is created when you send; the preview shows a placeholder link.</p>}
            <details className="pt-1">
              <summary className="cursor-pointer text-muted-foreground">Event description</summary>
              <p className="mt-1 whitespace-pre-line rounded bg-muted p-2 text-xs">{cal.description}</p>
            </details>
          </div>
        ) : (
          <p className="text-muted-foreground">Google Calendar is not connected, so only the emails below are sent.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border p-0.5">
          {(['student', 'company'] as const).map((s) => (
            <Button key={s} size="sm" variant={side === s ? 'secondary' : 'ghost'} onClick={() => setSide(s)}>
              {s === 'student' ? 'Student email' : 'Company email'}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant={mobile ? 'ghost' : 'secondary'} className="h-8 w-8" onClick={() => setMobile(false)} aria-label="Desktop"><Monitor className="h-4 w-4" /></Button>
          <Button size="icon" variant={mobile ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => setMobile(true)} aria-label="Mobile"><Smartphone className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-1 rounded bg-muted px-3 py-2 text-sm">
        <p className="truncate"><span className="text-muted-foreground">To: </span>{email.to.join(', ')}</p>
        <p className="truncate"><span className="text-muted-foreground">Subject: </span>{email.subject}</p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-[#f4f4f1]">
        <iframe title={`${side} email preview`} sandbox="" srcDoc={email.html} className={cn('mx-auto block h-[560px] bg-white transition-all', mobile ? 'w-[375px] max-w-full' : 'w-full')} />
      </div>
    </div>
  )
}
