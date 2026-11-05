import * as React from 'react'
import { toast } from 'sonner'
import { Award, Eye, Loader2, Search, Send } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  fetchIssueDefaults,
  previewCertificate,
  searchCertificateCandidates,
  sendCertificate,
  type CertificateCandidate,
  type IssueCertificateInput,
  type IssueDefaults,
} from '@/lib/certificates'

interface FormState {
  fullName: string
  practiceArea: string
  includeScore: boolean
  score: string
  rank: string
}

function toForm(d: IssueDefaults): FormState {
  const score = d.liveScore ?? d.existing?.commonScore ?? null
  return {
    fullName: d.fullName,
    practiceArea: d.livePracticeArea || d.existing?.practiceArea || d.specialization || '',
    includeScore: score != null,
    score: score != null ? String(Math.round(score * 100) / 100) : '',
    rank: d.existing?.manualRank != null ? String(d.existing.manualRank) : '',
  }
}

// Returns the API payload, or an error message to show
function parseForm(userId: string, f: FormState): IssueCertificateInput | string {
  if (!f.fullName.trim()) return 'Name is required'
  if (!f.practiceArea.trim()) return 'Practice area is required'
  let commonScore: number | null = null
  if (f.includeScore) {
    commonScore = Number(f.score)
    if (!f.score.trim() || !Number.isFinite(commonScore) || commonScore < 0 || commonScore > 100) return 'Score must be between 0 and 100'
    commonScore = Math.round(commonScore * 100) / 100
  }
  let rank: number | null = null
  if (f.rank.trim()) {
    rank = Number(f.rank)
    if (!Number.isInteger(rank) || rank < 1) return 'Rank must be a whole number, 1 or more'
  }
  return { userId, fullName: f.fullName.trim(), practiceArea: f.practiceArea.trim(), commonScore, rank }
}

function candidateMeta(c: CertificateCandidate) {
  return [c.rollNumber, c.mobileNumber, c.college].filter(Boolean).join(' · ')
}

export function SuperadminCertificatesPage() {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<CertificateCandidate[]>([])
  const [searching, setSearching] = React.useState(false)
  const [selected, setSelected] = React.useState<IssueDefaults | null>(null)
  const [loadingUser, setLoadingUser] = React.useState(false)
  const [form, setForm] = React.useState<FormState | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [previewing, setPreviewing] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [sending, setSending] = React.useState(false)

  // Debounced search; the newest query wins
  React.useEffect(() => {
    let cancelled = false
    setSearching(true)
    const t = setTimeout(() => {
      searchCertificateCandidates(query)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  // Free the old preview blob whenever it's replaced or the page unmounts
  React.useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function pick(c: CertificateCandidate) {
    setLoadingUser(true)
    setPreviewUrl(null)
    try {
      const d = await fetchIssueDefaults(c.id)
      setSelected(d)
      setForm(toForm(d))
    } catch {
      // api-client already showed the error
    } finally {
      setLoadingUser(false)
    }
  }

  const parsed = selected && form ? parseForm(selected.id, form) : null
  const error = typeof parsed === 'string' ? parsed : null
  const input = parsed && typeof parsed !== 'string' ? parsed : null

  function update(patch: Partial<FormState>) {
    if (!form) return
    setForm({ ...form, ...patch })
    // The preview no longer matches what would be sent
    setPreviewUrl(null)
  }

  async function preview() {
    if (!input) return
    setPreviewing(true)
    try {
      setPreviewUrl(URL.createObjectURL(await previewCertificate(input)))
    } catch {
      // api-client already showed the error
    } finally {
      setPreviewing(false)
    }
  }

  async function send() {
    if (!input || !selected) return
    setSending(true)
    try {
      const res = await sendCertificate(input)
      if (res.emailed) {
        toast.success(`Certificate sent to ${res.email}`)
      } else {
        toast.warning(`Certificate saved, but the email to ${res.email} failed. Try sending again.`)
      }
      const d = await fetchIssueDefaults(selected.id)
      setSelected(d)
      setResults((rs) => rs.map((r) => (r.id === d.id ? { ...r, hasCertificate: true } : r)))
    } catch {
      // api-client already showed the error
    } finally {
      setSending(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Issue Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Pick a student, check the details, preview the certificate and email it to them as a PDF. It also becomes their
          certificate on the dashboard and on the QR verification page.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">1. Choose a student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search name, email, roll no. or phone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search students"
                />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-md border">
                {searching && results.length === 0 ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : results.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No students found</p>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => pick(c)}
                      className={`flex w-full items-start justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted ${
                        selected?.id === c.id ? 'bg-muted' : ''
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                        {candidateMeta(c) && <span className="block truncate text-xs text-muted-foreground">{candidateMeta(c)}</span>}
                      </span>
                      {c.hasCertificate && (
                        <Badge variant="secondary" className="shrink-0">
                          Has certificate
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {loadingUser && (
            <div className="flex justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {selected && form && !loadingUser && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Certificate details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-muted/50 p-3 text-xs">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate">{selected.email}</dd>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{selected.mobileNumber || '-'}</dd>
                  <dt className="text-muted-foreground">Roll no.</dt>
                  <dd>{selected.rollNumber || '-'}</dd>
                  <dt className="text-muted-foreground">College</dt>
                  <dd className="truncate">{selected.college || '-'}</dd>
                  <dt className="text-muted-foreground">Selected field</dt>
                  <dd className="truncate">{selected.specialization || '-'}</dd>
                </dl>

                <div className="space-y-2">
                  <Label htmlFor="cert-name">Name on certificate</Label>
                  <Input id="cert-name" maxLength={120} value={form.fullName} onChange={(e) => update({ fullName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-area">Practice area</Label>
                  <Input id="cert-area" maxLength={80} value={form.practiceArea} onChange={(e) => update({ practiceArea: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="cert-include-score"
                      checked={form.includeScore}
                      onCheckedChange={(v) => update({ includeScore: v === true })}
                    />
                    <Label htmlFor="cert-include-score">Show common score</Label>
                  </div>
                  {form.includeScore ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="Score out of 100"
                      value={form.score}
                      onChange={(e) => update({ score: e.target.value })}
                      aria-label="Common score"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">The score is left off the certificate.</p>
                  )}
                  {selected.liveScore == null && (
                    <p className="text-xs text-muted-foreground">This student has no score in the live ranking.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-rank">Rank (optional)</Label>
                  <Input
                    id="cert-rank"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 12"
                    value={form.rank}
                    onChange={(e) => update({ rank: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Shown on the verification page after scanning the QR code, not printed on the PDF.</p>
                </div>

                {selected.existing && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    This student already has a certificate (issued {new Date(selected.existing.issuedAt).toLocaleDateString()}). Sending
                    replaces it; the verification link and QR code stay the same.
                  </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={preview} disabled={!input || previewing || sending}>
                    {previewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                    Preview
                  </Button>
                  <Button onClick={() => setConfirmOpen(true)} disabled={!input || sending}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send certificate
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="min-h-[420px]">
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <iframe title="Certificate preview" src={previewUrl} className="h-[70vh] min-h-[420px] w-full rounded-md border" />
            ) : (
              <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground">
                <Award className="h-8 w-8" />
                {selected ? 'Click Preview to see the certificate' : 'Choose a student to start'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              The certificate for {input?.fullName} will be saved and emailed as a PDF to {selected?.email}.
              {selected?.existing ? ' It replaces their current certificate.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => {
                e.preventDefault()
                void send()
              }}
            >
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
