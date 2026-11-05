import * as React from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import {
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  updateCoupon,
  type Coupon,
} from '@/lib/payments'
import { cycleLabel, formatPrice, usePricing } from '@/lib/pricing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function SuperadminCouponsPage() {
  const [items, setItems] = React.useState<Coupon[]>([])
  const [code, setCode] = React.useState('')
  const [freeDays, setFreeDays] = React.useState('30')
  const [maxRedemptions, setMaxRedemptions] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [price, setPrice] = React.useState('')
  const [editingPriceId, setEditingPriceId] = React.useState<string | null>(null)
  const [editPrice, setEditPrice] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const { pricing } = usePricing()

  async function load() {
    try {
      setItems(await fetchCoupons())
    } catch {
      toast.error('Could not load coupons')
    }
  }

  React.useEffect(() => {
    void load()
  }, [])

  // '' = free coupon. Returns paise, null for free, or undefined when invalid.
  function parsePrice(value: string): number | null | undefined {
    if (!value.trim()) return null
    const paise = Math.round(Number(value) * 100)
    return Number.isFinite(paise) && paise >= 100 ? paise : undefined
  }

  async function handleAdd() {
    if (!code.trim()) return
    const pricePaise = parsePrice(price)
    if (pricePaise === undefined) {
      toast.error('Price must be at least ₹1, or leave it empty for a free coupon')
      return
    }
    setIsAdding(true)
    try {
      await createCoupon({
        code: code.trim(),
        freeDays: Number(freeDays),
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
        pricePaise,
      })
      setCode('')
      setPrice('')
      setMaxRedemptions('')
      setExpiresAt('')
      await load()
      toast.success('Coupon created')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create coupon')
    } finally {
      setIsAdding(false)
    }
  }

  async function run(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusyId(id)
    try {
      await fn()
      await load()
      toast.success(ok)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coupons</CardTitle>
        <p className="text-sm text-muted-foreground">
          <strong>No price:</strong> the coupon unlocks the platform free for its days. <strong>With a price:</strong> the student pays
          that amount once (no autopay) and gets access for the days. Either way the paywall comes back afterwards, where the regular plan is{' '}
          {formatPrice(pricing.amountPaise)} every {cycleLabel(pricing.cycleMonths)}. One use per student.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={32} />
          <Input type="number" min={1} max={365} value={freeDays} onChange={(e) => setFreeDays(e.target.value)} placeholder="Access days" aria-label="Access days" />
          <Input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ₹ (empty = free)" aria-label="One-time price" />
          <Input type="number" min={1} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} placeholder="Max uses (optional)" />
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} aria-label="Expiry date" />
          <Button disabled={isAdding} onClick={handleAdd}>
            {isAdding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add
          </Button>
        </div>

        <div className="divide-y rounded-md border">
          {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No coupons yet.</p>}
          {items.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="font-mono font-semibold">
                  {c.code} {!c.isActive && <span className="text-xs font-normal text-muted-foreground">(inactive)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {c.pricePaise != null ? `${formatPrice(c.pricePaise)} one-time for ${c.freeDays} days` : `${c.freeDays} days free`} · used {c.redemptionCount}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}
                  {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingPriceId === c.id ? (
                  <>
                    <Input
                      className="h-8 w-36"
                      type="number"
                      min={1}
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="Empty = free"
                      aria-label={`Price for ${c.code}`}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      disabled={busyId === c.id}
                      onClick={() => {
                        const pricePaise = parsePrice(editPrice)
                        if (pricePaise === undefined) {
                          toast.error('Price must be at least ₹1, or leave it empty for a free coupon')
                          return
                        }
                        void run(c.id, () => updateCoupon(c.id, { pricePaise }), 'Price updated').then(() => setEditingPriceId(null))
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingPriceId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === c.id}
                    onClick={() => {
                      setEditingPriceId(c.id)
                      setEditPrice(c.pricePaise != null ? String(c.pricePaise / 100) : '')
                    }}
                  >
                    Edit price
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === c.id}
                  onClick={() => run(c.id, () => updateCoupon(c.id, { isActive: !c.isActive }), c.isActive ? 'Deactivated' : 'Activated')}
                >
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === c.id}
                    onClick={() => run(c.id, () => deleteCoupon(c.id), 'Deleted')}
                  >
                    Delete (kept in records)
                  </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
