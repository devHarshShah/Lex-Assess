import * as React from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Send, Smartphone, Monitor, Users } from 'lucide-react';

import {
  createCampaign,
  fetchEmailMeta,
  fetchSavedTemplates,
  previewAudience,
  renderPreview,
  saveTemplate,
  sendTestEmail,
  type AudiencePreview,
  type CampaignDraft,
  type EmailMeta,
  type SavedTemplate,
} from '@/lib/email-campaigns';
import { fetchCoupons, type Coupon } from '@/lib/payments';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { VariableChips } from './VariableChips';

const SNIPPETS: { label: string; html: string }[] = [
  { label: 'Heading', html: '<h2>Your heading</h2>\n' },
  { label: 'Button', html: '[Button text](https://)\n\n' },
  { label: 'Coupon box', html: '<div class="coupon">{{couponCode}}</div>\n' },
  { label: 'Highlight box', html: '<div class="callout">Short highlighted note.</div>\n' },
];

const EMPTY_DRAFT: CampaignDraft = {
  name: '',
  templateKey: null,
  subject: '',
  preheader: '',
  bodyHtml: '',
  couponId: null,
  audience: { stages: [], skipRedeemedCoupon: true, skipRecentDays: 3 },
};

type Field = 'subject' | 'preheader' | 'bodyHtml';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function CampaignComposer({ onSent }: { onSent: () => void }) {
  const [meta, setMeta] = React.useState<EmailMeta | null>(null);
  const [saved, setSaved] = React.useState<SavedTemplate[]>([]);
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [draft, setDraft] = React.useState<CampaignDraft>(EMPTY_DRAFT);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [audience, setAudience] = React.useState<AudiencePreview | null>(null);
  const [preview, setPreview] = React.useState<{ html: string; subject: string } | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [mobile, setMobile] = React.useState(false);
  const [busy, setBusy] = React.useState<'test' | 'send' | 'save' | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState<string | null>(null);

  const fields = React.useRef<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>({ subject: null, preheader: null, bodyHtml: null });
  const lastField = React.useRef<Field>('bodyHtml');

  React.useEffect(() => {
    fetchEmailMeta().then(setMeta).catch(() => toast.error('Could not load email options'));
    fetchSavedTemplates().then(setSaved).catch(() => undefined);
    fetchCoupons().then((c) => setCoupons(c.filter((x) => x.isActive))).catch(() => undefined);
  }, []);

  const patch = (p: Partial<CampaignDraft>) => setDraft((d) => ({ ...d, ...p }));
  const patchAudience = (p: Partial<CampaignDraft['audience']>) => setDraft((d) => ({ ...d, audience: { ...d.audience, ...p } }));

  // Live recipient count (also feeds the per-group counts on the chips)
  const audienceKey = useDebounced(JSON.stringify([draft.audience, draft.couponId]), 400);
  React.useEffect(() => {
    previewAudience(draft).then(setAudience).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceKey]);

  // Live preview, rendered by the backend so it matches what is delivered
  const contentKey = useDebounced(JSON.stringify([draft.subject, draft.preheader, draft.bodyHtml, draft.couponId]), 500);
  React.useEffect(() => {
    if (!draft.subject.trim() || !draft.bodyHtml.trim()) {
      setPreview(null);
      setPreviewError(null);
      return;
    }
    renderPreview(draft)
      .then((r) => {
        setPreview(r);
        setPreviewError(null);
      })
      .catch((e: Error) => setPreviewError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  function insertAtCursor(token: string) {
    const field = lastField.current;
    const el = fields.current[field];
    const current = draft[field];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    patch({ [field]: current.slice(0, start) + token + current.slice(end) } as Partial<CampaignDraft>);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function loadTemplate(t: { key?: string; subject: string; preheader: string; bodyHtml: string; usesCoupon?: boolean }) {
    patch({ templateKey: t.key ?? null, subject: t.subject, preheader: t.preheader, bodyHtml: t.bodyHtml });
    if (t.usesCoupon && !draft.couponId) toast.info('This template uses a coupon — choose one below.');
  }

  function applySuggested(stages: string[]) {
    if (stages.length) patchAudience({ stages });
  }

  const isSuggested = (t: { suggestedStages: string[] }) => t.suggestedStages.some((s) => draft.audience.stages.includes(s));
  const stageLabel = (key: string) => meta?.stages.find((s) => s.key === key)?.label ?? key;
  const hasCoupon = !!draft.couponId;
  const coupon = coupons.find((c) => c.id === draft.couponId);
  const canContinue1 = draft.audience.stages.length > 0 && (audience?.recipientCount ?? 0) > 0;
  const canContinue2 = !!preview && !previewError;

  async function onTest() {
    setBusy('test');
    try {
      const r = await sendTestEmail(draft);
      toast.success(`Test sent to ${r.sentTo}`);
    } catch {
      /* toast shown by api client */
    } finally {
      setBusy(null);
    }
  }

  async function onSend() {
    setBusy('send');
    try {
      const r = await createCampaign(draft);
      toast.success(`Sending to ${r.recipientCount} students`);
      setDraft(EMPTY_DRAFT);
      setStep(1);
      onSent();
    } catch {
      /* toast shown by api client */
    } finally {
      setBusy(null);
      setConfirmOpen(false);
    }
  }

  async function onSaveTemplate() {
    if (!templateName?.trim()) return;
    setBusy('save');
    try {
      const t = await saveTemplate({ name: templateName.trim(), subject: draft.subject, preheader: draft.preheader, bodyHtml: draft.bodyHtml });
      setSaved((s) => [t, ...s]);
      setTemplateName(null);
      toast.success('Template saved');
    } catch {
      /* toast shown by api client */
    } finally {
      setBusy(null);
    }
  }

  const stepper = (
    <div className="flex items-center gap-2 text-sm">
      {(['Audience', 'Content', 'Review & send'] as const).map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = step > n;
        return (
          <React.Fragment key={label}>
            {i > 0 && <span className="h-px w-6 bg-border" />}
            <button
              type="button"
              disabled={n > step}
              onClick={() => setStep(n)}
              className={cn('flex items-center gap-2 rounded-full px-3 py-1 font-medium', step === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground', n <= step && 'hover:text-foreground')}
            >
              <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border text-[11px]', step === n && 'border-primary-foreground')}>
                {done ? <Check className="h-3 w-3" /> : n}
              </span>
              {label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  if (!meta) return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-5">
      {stepper}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Who should get this email?</CardTitle>
            <p className="text-sm text-muted-foreground">Pick one or more groups. Counts show how many students are in each group right now.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {meta.stages.map((s) => {
                const on = draft.audience.stages.includes(s.key);
                return (
                  <label key={s.key} className={cn('flex cursor-pointer items-center justify-between rounded-lg border p-3 transition', on ? 'border-primary bg-primary/5' : 'hover:bg-muted/50')}>
                    <span className="flex items-center gap-3 text-sm font-medium">
                      <Checkbox
                        checked={on}
                        onCheckedChange={(v) => patchAudience({ stages: v ? [...draft.audience.stages, s.key] : draft.audience.stages.filter((k) => k !== s.key) })}
                      />
                      {s.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{audience?.stageCounts[s.key] ?? 0}</span>
                  </label>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Registered from</Label>
                <Input type="date" value={draft.audience.from ?? ''} onChange={(e) => patchAudience({ from: e.target.value || undefined })} />
              </div>
              <div className="space-y-1.5">
                <Label>Registered until</Label>
                <Input type="date" value={draft.audience.to ?? ''} onChange={(e) => patchAudience({ to: e.target.value || undefined })} />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox checked={draft.audience.skipRecentDays > 0} onCheckedChange={(v) => patchAudience({ skipRecentDays: v ? 3 : 0 })} />
                Skip anyone who got a campaign in the last
                <Input
                  type="number"
                  min={1}
                  max={365}
                  className="h-8 w-16"
                  disabled={draft.audience.skipRecentDays === 0}
                  value={draft.audience.skipRecentDays || ''}
                  onChange={(e) => patchAudience({ skipRecentDays: Math.max(1, Number(e.target.value) || 1) })}
                />
                days
              </label>
              <p className="text-xs text-muted-foreground">Unsubscribed students are always skipped. The "already used this coupon" rule applies when you pick a coupon.</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{audience?.recipientCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">
                    students will receive it
                    {audience && audience.matched !== audience.recipientCount && (
                      <> · skipped {audience.excluded.unsubscribed} unsubscribed, {audience.excluded.recentlyEmailed} recently emailed{audience.excluded.alreadyRedeemed ? `, ${audience.excluded.alreadyRedeemed} already used coupon` : ''}</>
                    )}
                  </p>
                </div>
              </div>
              <Button disabled={!canContinue1} onClick={() => setStep(2)}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Start from a template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {[...meta.templates]
                    .sort((a, b) => Number(isSuggested(b)) - Number(isSuggested(a)))
                    .map((t) => {
                    const suggested = isSuggested(t);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          loadTemplate(t);
                          if (!draft.audience.stages.length) applySuggested(t.suggestedStages);
                        }}
                        className={cn('rounded-lg border p-3 text-left transition hover:border-primary', draft.templateKey === t.key && 'border-primary bg-primary/5')}
                      >
                        <span className="flex items-center justify-between gap-2 text-sm font-medium">
                          {t.name}
                          {suggested && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Fits audience</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
                      </button>
                    );
                  })}
                </div>
                {saved.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your saved templates</p>
                    <div className="flex flex-wrap gap-2">
                      {saved.map((t) => (
                        <Button key={t.id} size="sm" variant="outline" onClick={() => loadTemplate(t)}>{t.name}</Button>
                      ))}
                    </div>
                  </div>
                )}
                <Button size="sm" variant="ghost" onClick={() => patch({ templateKey: null, subject: '', preheader: '', bodyHtml: '' })}>Start blank / write your own</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Write your email</CardTitle>
                <p className="text-sm text-muted-foreground">The LexAssess header and an unsubscribe footer are added automatically.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Coupon (optional)</Label>
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.couponId ?? ''}
                    onChange={(e) => patch({ couponId: e.target.value || null })}
                  >
                    <option value="">No coupon</option>
                    {coupons.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} · {c.freeDays} free days</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">Drag a variable into the subject, preview text or body (or click it). It is replaced with each student's own value.</p>
                  <VariableChips variables={meta.variables} hasCoupon={hasCoupon} onInsert={insertAtCursor} />
                </div>

                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input ref={(el) => { fields.current.subject = el; }} onFocus={() => (lastField.current = 'subject')} value={draft.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="e.g. {{firstName}}, your profile is ready" maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preview text <span className="font-normal text-muted-foreground">(shown next to the subject in the inbox)</span></Label>
                  <Input ref={(el) => { fields.current.preheader = el; }} onFocus={() => (lastField.current = 'preheader')} value={draft.preheader} onChange={(e) => patch({ preheader: e.target.value })} maxLength={200} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Body</Label>
                    <div className="flex flex-wrap gap-1">
                      {SNIPPETS.filter((s) => s.label !== 'Coupon box' || hasCoupon).map((s) => (
                        <Button key={s.label} type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => {
                          lastField.current = 'bodyHtml';
                          // [Label](url) only works in plain-text bodies; HTML bodies need a real link
                          const html = s.label === 'Button' && /<\w+/.test(draft.bodyHtml) ? '<a class="btn" href="https://">Button text</a>\n' : s.html;
                          insertAtCursor(html);
                        }}>+ {s.label}</Button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    ref={(el) => { fields.current.bodyHtml = el; }}
                    onFocus={() => (lastField.current = 'bodyHtml')}
                    value={draft.bodyHtml}
                    onChange={(e) => patch({ bodyHtml: e.target.value })}
                    rows={14}
                    className="font-mono text-sm"
                    placeholder={'Paste your text or HTML here.\n\nA blank line starts a new paragraph.\n[Button text](https://…) makes a button.'}
                  />
                  <p className="text-xs text-muted-foreground">Plain text or simple HTML. Scripts, styles and unsupported tags are removed automatically.</p>
                </div>

                {templateName === null ? (
                  <Button size="sm" variant="ghost" disabled={!draft.subject.trim() || !draft.bodyHtml.trim()} onClick={() => setTemplateName('')}>Save this as a reusable template</Button>
                ) : (
                  <div className="flex gap-2">
                    <Input autoFocus placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} maxLength={80} />
                    <Button size="sm" disabled={busy === 'save' || !templateName.trim()} onClick={onSaveTemplate}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setTemplateName(null)}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Live preview</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant={mobile ? 'ghost' : 'secondary'} className="h-8 w-8" onClick={() => setMobile(false)} aria-label="Desktop"><Monitor className="h-4 w-4" /></Button>
                  <Button size="icon" variant={mobile ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => setMobile(true)} aria-label="Mobile"><Smartphone className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {preview && <p className="truncate rounded bg-muted px-3 py-2 text-sm"><span className="text-muted-foreground">Subject: </span>{preview.subject}</p>}
                {previewError && <p className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{previewError}</p>}
                {preview ? (
                  <div className="overflow-hidden rounded-lg border bg-[#f4f4f1]">
                    <iframe title="Email preview" sandbox="" srcDoc={preview.html} className={cn('mx-auto block h-[640px] bg-white transition-all', mobile ? 'w-[375px] max-w-full' : 'w-full')} />
                  </div>
                ) : (
                  !previewError && <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Choose a template or write a subject and body to see the preview.</p>
                )}
                <div className="flex flex-wrap justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={!canContinue2 || busy === 'test'} onClick={onTest}>
                      {busy === 'test' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test to me
                    </Button>
                    <Button disabled={!canContinue2} onClick={() => setStep(3)}>Continue</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review and send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Recipients</p><p className="text-3xl font-semibold tabular-nums">{audience?.recipientCount ?? 0}</p></div>
              <div className="rounded-lg border p-4 sm:col-span-2"><p className="text-xs text-muted-foreground">Groups</p><p className="text-sm font-medium">{draft.audience.stages.map(stageLabel).join(' · ')}</p></div>
            </div>
            <div className="space-y-1.5">
              <Label>Campaign name (for your records)</Label>
              <Input value={draft.name ?? ''} onChange={(e) => patch({ name: e.target.value })} placeholder={draft.subject} maxLength={120} />
            </div>
            <div className="rounded-lg border p-4 text-sm">
              <p><span className="text-muted-foreground">Subject:</span> {preview?.subject}</p>
              {coupon && <p className="mt-1"><span className="text-muted-foreground">Coupon:</span> {coupon.code} ({coupon.freeDays} free days)</p>}
              {audience && <p className="mt-1 text-muted-foreground">Skipping {audience.excluded.unsubscribed} unsubscribed, {audience.excluded.recentlyEmailed} recently emailed{audience.excluded.alreadyRedeemed ? `, ${audience.excluded.alreadyRedeemed} who already used the coupon` : ''}.</p>}
            </div>
            {audience && audience.sample.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sample of who will get it</p>
                <ul className="divide-y rounded-lg border text-sm">
                  {audience.sample.map((s) => (
                    <li key={s.email} className="flex justify-between gap-3 px-3 py-2"><span className="truncate">{s.name} · {s.email}</span><span className="shrink-0 text-xs text-muted-foreground">{s.stageLabel}</span></li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy === 'test'} onClick={onTest}>
                  {busy === 'test' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test to me
                </Button>
                <Button disabled={!canContinue1 || !canContinue2} onClick={() => setConfirmOpen(true)}><Send className="mr-2 h-4 w-4" />Send to {audience?.recipientCount ?? 0} students</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to {audience?.recipientCount ?? 0} students?</AlertDialogTitle>
            <AlertDialogDescription>
              Emails go out in batches and keep sending even if you close this page. You can cancel the remaining ones from the Campaigns tab, but emails already sent cannot be recalled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === 'send'}>Not yet</AlertDialogCancel>
            <AlertDialogAction disabled={busy === 'send'} onClick={(e) => { e.preventDefault(); void onSend(); }}>
              {busy === 'send' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
