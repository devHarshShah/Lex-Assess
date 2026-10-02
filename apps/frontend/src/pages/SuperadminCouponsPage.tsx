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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function SuperadminCouponsPage() {
  const [items, setItems] = React.useState<Coupon[]>([])
  const [code, setCode] = React.useState('')
  const [freeDays, setFreeDays] = React.useState('30')
  const [maxRedemptions, setMaxRedemptions] = React.useState('')
  const [expiresAt, setExpiresAt] = React.useState('')
  const [isAdding, setIsAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

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

  async function handleAdd() {
    if (!code.trim()) return
    setIsAdding(true)
    try {
      await createCoupon({
        code: code.trim(),
        freeDays: Number(freeDays),
        maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
        expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
      })
      setCode('')
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
          A coupon delays the first charge by the free days, then ₹499 is charged every 3 months. One use per student.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-5">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={32} />
          <Input type="number" min={1} max={365} value={freeDays} onChange={(e) => setFreeDays(e.target.value)} placeholder="Free days" />
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
                  {c.freeDays} days free · used {c.redemptionCount}
                  {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''}
                  {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString('en-IN')}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === c.id}
                  onClick={() => run(c.id, () => updateCoupon(c.id, { isActive: !c.isActive }), c.isActive ? 'Deactivated' : 'Activated')}
                >
                  {c.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                {c.redemptionCount === 0 && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === c.id}
                    onClick={() => run(c.id, () => deleteCoupon(c.id), 'Deleted')}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
