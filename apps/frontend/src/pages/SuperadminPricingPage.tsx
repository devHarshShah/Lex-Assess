import * as React from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { IndianRupee, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  cycleLabel,
  fetchPricingSettings,
  formatPrice,
  PRICING_QUERY_KEY,
  updatePricingSettings,
  type PricingSettings,
  type UpdatePricingInput,
} from '@/lib/pricing'

interface FormState {
  amount: string
  compareAt: string
  cycleMonths: string
  planName: string
  offerTag: string
}

function toForm(s: PricingSettings): FormState {
  return {
    amount: String(s.amountPaise / 100),
    compareAt: s.compareAtPaise != null ? String(s.compareAtPaise / 100) : '',
    cycleMonths: String(s.cycleMonths),
    planName: s.planName,
    offerTag: s.offerTag ?? '',
  }
}

// Returns the API payload, or an error message to show
function parseForm(f: FormState): UpdatePricingInput | string {
  const amountPaise = Math.round(Number(f.amount) * 100)
  if (!f.amount.trim() || !Number.isFinite(amountPaise) || amountPaise < 100) return 'Price must be at least ₹1'
  let compareAtPaise: number | null = null
  if (f.compareAt.trim()) {
    compareAtPaise = Math.round(Number(f.compareAt) * 100)
    if (!Number.isFinite(compareAtPaise)) return 'Strike-through price is not a number'
    if (compareAtPaise <= amountPaise) return 'Strike-through price must be higher than the price'
  }
  const cycleMonths = Number(f.cycleMonths)
  if (!Number.isInteger(cycleMonths) || cycleMonths < 1 || cycleMonths > 12) return 'Billing cycle must be 1 to 12 months'
  if (!f.planName.trim()) return 'Plan name is required'
  return { amountPaise, compareAtPaise, cycleMonths, planName: f.planName.trim(), offerTag: f.offerTag.trim() || null }
}

export function SuperadminPricingPage() {
  const queryClient = useQueryClient()
  const [settings, setSettings] = React.useState<PricingSettings | null>(null)
  const [form, setForm] = React.useState<FormState | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    fetchPricingSettings()
      .then((s) => {
        setSettings(s)
        setForm(toForm(s))
      })
      .catch(() => toast.error('Could not load pricing'))
  }, [])

  if (!settings || !form) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const parsed = parseForm(form)
  const error = typeof parsed === 'string' ? parsed : null
  const input = typeof parsed === 'string' ? null : parsed
  const chargeChanged = !!input && (input.amountPaise !== settings.amountPaise || input.cycleMonths !== settings.cycleMonths)
  const dirty =
    !!input &&
    (chargeChanged ||
      input.compareAtPaise !== settings.compareAtPaise ||
      input.planName !== settings.planName ||
      input.offerTag !== settings.offerTag)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value })

  async function save() {
    if (!input) return
    setIsSaving(true)
    try {
      const next = await updatePricingSettings(input)
      setSettings(next)
      setForm(toForm(next))
      await queryClient.invalidateQueries({ queryKey: PRICING_QUERY_KEY })
      toast.success(chargeChanged ? 'New Razorpay plan created. New subscribers pay the new price.' : 'Pricing updated')
    } catch {
      // api-client already showed the error
    } finally {
      setIsSaving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Pricing</h1>
        <p className="text-sm text-muted-foreground">
          The subscription price shown everywhere in the app and charged by Razorpay. Changing the price or billing cycle
          creates a new Razorpay plan for new subscribers. Existing subscribers keep the price they signed up at. Changes
          reach all servers within about 10 seconds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              Subscription plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price-amount">Price (₹)</Label>
                <Input id="price-amount" type="number" min={1} step="0.01" value={form.amount} onChange={set('amount')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-compare">Strike-through price (₹)</Label>
                <Input
                  id="price-compare"
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="None"
                  value={form.compareAt}
                  onChange={set('compareAt')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-cycle">Billing cycle (months)</Label>
                <Input id="price-cycle" type="number" min={1} max={12} step={1} value={form.cycleMonths} onChange={set('cycleMonths')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-name">Plan name</Label>
                <Input id="price-name" maxLength={80} value={form.planName} onChange={set('planName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-tag">Offer tag</Label>
                <Input id="price-tag" maxLength={40} placeholder="None" value={form.offerTag} onChange={set('offerTag')} />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {chargeChanged && !error && (
              <p className="text-sm text-amber-700">
                Saving creates a new Razorpay plan: {formatPrice(input!.amountPaise)} every {cycleLabel(input!.cycleMonths)}.
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => (chargeChanged ? setConfirmOpen(true) : save())} disabled={!dirty || isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save pricing
              </Button>
              <Button variant="outline" onClick={() => setForm(toForm(settings))} disabled={isSaving}>
                Reset
              </Button>
            </div>

            <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
              <p>
                Active Razorpay plan: <span className="font-mono">{settings.planId || 'not set'}</span>
              </p>
              <p>{settings.updatedAt ? `Last changed ${new Date(settings.updatedAt).toLocaleString()}` : 'Using the default pricing (never edited here)'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl px-5 py-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#d97706' }}>
                Subscription Plan
              </p>
              {input ? (
                <>
                  <p className="mt-0.5 flex items-baseline gap-2 text-2xl font-black text-foreground">
                    {input.compareAtPaise != null && (
                      <span className="text-base font-semibold text-muted-foreground line-through">{formatPrice(input.compareAtPaise)}</span>
                    )}
                    <span>{formatPrice(input.amountPaise)}</span>
                    <span className="text-sm font-normal text-muted-foreground"> / {cycleLabel(input.cycleMonths)}</span>
                  </p>
                  {input.offerTag && <p className="mt-0.5 text-[10px] font-semibold text-emerald-700">{input.offerTag}</p>}
                </>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Fix the form to see a preview</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {settings.plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...settings.plans].reverse().map((p) => (
              <div key={p.planId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-mono text-xs">{p.planId}</span>
                <span>
                  {formatPrice(p.amountPaise)} / {cycleLabel(p.cycleMonths)}
                </span>
                {p.planId === settings.planId ? <Badge>Active</Badge> : <Badge variant="secondary">Existing subscribers only</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change the subscription price?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a new Razorpay plan. New subscribers will pay {input && formatPrice(input.amountPaise)} every{' '}
              {input && cycleLabel(input.cycleMonths)}. Existing subscribers keep their current price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create plan & save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
