import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CalendarPlus, Loader2, MessageCircle, Phone } from 'lucide-react'

import { fetchLead, logLeadActivity, phoneDigits, updateLead, whatsappUrl, type CrmMeta, type LeadDetail } from '@/lib/crm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { formatIst, isoToIstInput, istInputToIso } from '@/lib/utils'

const ACTIVITY_LABELS: Record<string, string> = {
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  NOTE: 'Note',
  STATUS_CHANGE: 'Status changed',
  FOLLOW_UP_SET: 'Follow-up set',
  INTERVIEW_SCHEDULED: 'Company interview scheduled',
  INTERVIEW_RESCHEDULED: 'Company interview rescheduled',
  INTERVIEW_CANCELLED: 'Company interview cancelled',
}

const select = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm'

export function StatusBadge({ status, meta }: { status: string; meta: CrmMeta | null }) {
  const s = meta?.statuses.find((x) => x.key === status)
  const variant = status === 'INTERESTED' || status === 'CONTACTED' ? 'success' : s?.closed ? 'destructive' : status === 'NEW' ? 'outline' : 'secondary'
  return <Badge variant={variant}>{s?.label ?? status}</Badge>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

export function LeadSheet({ userId, meta, onClose, onChanged }: { userId: string; meta: CrmMeta | null; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = React.useState<LeadDetail | null>(null)
  const [reload, setReload] = React.useState(0)

  // Lead settings
  const [status, setStatus] = React.useState('')
  const [followUp, setFollowUp] = React.useState('')
  const [priority, setPriority] = React.useState('MEDIUM')
  const [tags, setTags] = React.useState('')
  const [savingLead, setSavingLead] = React.useState(false)

  // Activity log form
  const [type, setType] = React.useState('CALL')
  const [outcome, setOutcome] = React.useState('')
  const [note, setNote] = React.useState('')
  const [actFollowUp, setActFollowUp] = React.useState('')
  const [actStatus, setActStatus] = React.useState('')
  const [logging, setLogging] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    fetchLead(userId)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        setStatus(d.lead.status)
        setFollowUp(d.lead.nextFollowUpAt ? isoToIstInput(d.lead.nextFollowUpAt) : '')
        setPriority(d.lead.priority)
        setTags(d.lead.tags.join(', '))
      })
      .catch(() => onClose())
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, reload])

  const refresh = () => {
    setReload((r) => r + 1)
    onChanged()
  }

  async function saveLead() {
    setSavingLead(true)
    try {
      await updateLead(userId, {
        status,
        nextFollowUpAt: followUp ? istInputToIso(followUp) : null,
        priority,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      toast.success('Lead updated')
      refresh()
    } catch {
      /* toast shown by api client */
    } finally {
      setSavingLead(false)
    }
  }

  async function logActivity(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    try {
      await logLeadActivity(userId, {
        type,
        callOutcome: type === 'CALL' || type === 'WHATSAPP' ? outcome || null : null,
        note,
        followUpAt: actFollowUp ? istInputToIso(actFollowUp) : null,
        status: actStatus || null,
      })
      toast.success('Logged')
      setOutcome('')
      setNote('')
      setActFollowUp('')
      setActStatus('')
      refresh()
    } catch {
      /* toast shown by api client */
    } finally {
      setLogging(false)
    }
  }

  const lead = detail?.lead
  const doNotContact = lead?.status === 'DO_NOT_CONTACT'
  const hasOutcome = type === 'CALL' || type === 'WHATSAPP'

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {!detail || !lead ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6 pb-8">
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2 pr-6">
                {lead.name} <StatusBadge status={lead.status} meta={meta} />
              </SheetTitle>
              <SheetDescription>
                {lead.email} · {lead.stageLabel}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              {doNotContact ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">Marked do not contact — calling and WhatsApp are hidden.</p>
              ) : (
                <>
                  <Button asChild size="sm"><a href={`tel:${phoneDigits(lead.mobile)}`}><Phone className="mr-2 h-4 w-4" />Call {lead.mobile}</a></Button>
                  <Button asChild size="sm" variant="outline"><a href={whatsappUrl(lead.mobile)} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>
                </>
              )}
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/company-interviews" search={{ student: lead.email }}><CalendarPlus className="mr-2 h-4 w-4" />Schedule company interview</Link>
              </Button>
            </div>

            <form onSubmit={logActivity} className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Log what you did</p>
              <div className="inline-flex flex-wrap rounded-md border p-0.5">
                {(meta?.activityTypes ?? ['CALL', 'WHATSAPP', 'EMAIL', 'NOTE']).map((t) => (
                  <Button key={t} type="button" size="sm" variant={type === t ? 'secondary' : 'ghost'} onClick={() => setType(t)}>{ACTIVITY_LABELS[t] ?? t}</Button>
                ))}
              </div>
              {hasOutcome && (
                <div className="space-y-1.5">
                  <Label htmlFor="act-outcome">How did it go?{type === 'WHATSAPP' && ' (optional)'}</Label>
                  <select id="act-outcome" className={select} value={outcome} onChange={(e) => setOutcome(e.target.value)} required={type === 'CALL'}>
                    <option value="">Pick an outcome</option>
                    {meta?.outcomes.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} placeholder={type === 'NOTE' ? 'Write the note' : 'What was discussed? (optional)'} required={type === 'NOTE'} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="act-follow">Next follow-up (IST)</Label>
                  <Input id="act-follow" type="datetime-local" value={actFollowUp} onChange={(e) => setActFollowUp(e.target.value)} required={outcome === 'CALLBACK_REQUESTED'} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="act-status">Set status</Label>
                  <select id="act-status" className={select} value={actStatus} onChange={(e) => setActStatus(e.target.value)}>
                    <option value="">Automatic</option>
                    {meta?.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={logging}>{logging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save to timeline</Button>
            </form>

            <Section title="Lead">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-status">Status</Label>
                  <select id="lead-status" className={select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {meta?.statuses.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-priority">Priority</Label>
                  <select id="lead-priority" className={select} value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {(meta?.priorities ?? ['LOW', 'MEDIUM', 'HIGH']).map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-follow">Next follow-up (IST)</Label>
                  <Input id="lead-follow" type="datetime-local" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-tags">Tags</Label>
                  <Input id="lead-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fee concern, exam soon" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{lead.contactAttempts} contact attempt{lead.contactAttempts === 1 ? '' : 's'} · last contacted {formatIst(lead.lastContactedAt)}</p>
              <Button size="sm" variant="outline" disabled={savingLead} onClick={saveLead}>{savingLead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save lead</Button>
            </Section>

            <Section title="Timeline">
              {detail.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
              ) : (
                <ol className="space-y-3 border-l pl-4">
                  {detail.activities.map((a) => (
                    <li key={a.id} className="text-sm">
                      <p className="font-medium">
                        {ACTIVITY_LABELS[a.type] ?? a.type}
                        {a.callOutcome && <span className="font-normal text-muted-foreground"> · {meta?.outcomes.find((o) => o.key === a.callOutcome)?.label ?? a.callOutcome}</span>}
                        {a.type === 'STATUS_CHANGE' && (
                          <span className="font-normal text-muted-foreground"> · {meta?.statuses.find((s) => s.key === a.fromStatus)?.label} → {meta?.statuses.find((s) => s.key === a.toStatus)?.label}</span>
                        )}
                      </p>
                      {a.note && <p className="whitespace-pre-line">{a.note}</p>}
                      {a.followUpAt && <p className="text-muted-foreground">Follow up {formatIst(a.followUpAt)}</p>}
                      <p className="text-xs text-muted-foreground">{formatIst(a.createdAt)}{a.actorName ? ` · ${a.actorName}` : ''}</p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            {detail.profile && (
              <Section title="Profile">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">College</dt><dd>{detail.profile.college}</dd>
                  <dt className="text-muted-foreground">Degree</dt><dd>{detail.profile.degree}, {detail.profile.currentYear}</dd>
                  <dt className="text-muted-foreground">Practice area</dt><dd>{detail.profile.specialization}</dd>
                  {detail.profile.internshipGoal && (<><dt className="text-muted-foreground">Goal</dt><dd>{detail.profile.internshipGoal}</dd></>)}
                  {detail.profile.rollNumber && (<><dt className="text-muted-foreground">Roll no.</dt><dd>{detail.profile.rollNumber}</dd></>)}
                </dl>
                <div className="flex gap-3 text-sm">
                  {detail.profile.resumeUrl && <a className="text-primary hover:underline" href={detail.profile.resumeUrl} target="_blank" rel="noreferrer">Resume</a>}
                  {detail.profile.linkedinUrl && <a className="text-primary hover:underline" href={detail.profile.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>}
                </div>
              </Section>
            )}

            <Section title="Subscription">
              <p className="text-sm">
                {detail.payments.hasActiveSubscription ? 'Active' : 'Not active'}
                {detail.payments.trialEndsAt && ` · trial ends ${formatIst(detail.payments.trialEndsAt)}`}
                {detail.payments.paymentCount > 0 && ` · ${detail.payments.paymentCount} payment(s), ₹${detail.payments.totalPaidInr.toLocaleString('en-IN')}`}
                {detail.payments.couponCode && ` · coupon ${detail.payments.couponCode}`}
                {detail.marketingUnsubscribed && ' · unsubscribed from marketing email'}
              </p>
            </Section>

            {(detail.companyInterviews.length > 0 || detail.interviews.length > 0) && (
              <Section title="Interviews">
                <ul className="space-y-1 text-sm">
                  {detail.interviews.map((i) => (
                    <li key={i.id}>LexAssess interview with {i.interviewerName} · {formatIst(i.startTime)} · {i.status.toLowerCase()}{i.marks != null && ` · ${i.marks} marks`}</li>
                  ))}
                  {detail.companyInterviews.map((i) => (
                    <li key={i.id}>{i.companyName} · {formatIst(i.scheduledAt)} · {i.status.toLowerCase()}</li>
                  ))}
                </ul>
              </Section>
            )}

            {detail.emails.length > 0 && (
              <Section title="Campaign emails received">
                <ul className="space-y-1 text-sm">
                  {detail.emails.map((e) => (
                    <li key={e.campaignId} className="flex justify-between gap-3"><span className="truncate">{e.subject}</span><span className="shrink-0 text-xs text-muted-foreground">{formatIst(e.sentAt)}</span></li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
