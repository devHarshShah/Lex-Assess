import * as React from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  cancelCampaign,
  fetchCampaign,
  fetchCampaignMetrics,
  fetchCampaigns,
  retryFailedCampaign,
  type CampaignDetail,
  type CampaignMetrics,
  type CampaignSummary,
} from '@/lib/email-campaigns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<CampaignSummary['status'], string> = {
  QUEUED: 'Queued',
  SENDING: 'Sending',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

const isActive = (c: { status: string }) => c.status === 'QUEUED' || c.status === 'SENDING';

function Progress({ c }: { c: CampaignSummary['counts'] }) {
  const pct = (n: number) => (c.total ? (n / c.total) * 100 : 0);
  return (
    <div className="space-y-1">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        <div className="bg-green-500" style={{ width: `${pct(c.SENT)}%` }} />
        <div className="bg-red-500" style={{ width: `${pct(c.FAILED)}%` }} />
        <div className="bg-amber-400" style={{ width: `${pct(c.SKIPPED)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {c.SENT} sent · {c.PENDING + c.SENDING} waiting{c.FAILED ? ` · ${c.FAILED} failed` : ''}{c.SKIPPED ? ` · ${c.SKIPPED} skipped` : ''} · {c.total} total
      </p>
    </div>
  );
}

function Metrics({ id }: { id: string }) {
  const [m, setM] = React.useState<CampaignMetrics | null>(null);
  React.useEffect(() => {
    setM(null);
    fetchCampaignMetrics(id).then(setM).catch(() => undefined);
  }, [id]);
  if (!m) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (!m.tracked) {
    return <p className="text-xs text-muted-foreground">Conversion isn't tracked for this campaign (sent before tracking was added, or nothing sent yet).</p>;
  }
  const tiles = [
    { label: 'Moved forward', value: `${m.advancedPct}%`, sub: `${m.advanced} of ${m.tracked}` },
    { label: 'Started trial / paid', value: `${m.convertedPct}%`, sub: `${m.converted} students` },
    { label: 'Revenue since send', value: `₹${m.revenueInr.toLocaleString('en-IN')}`, sub: `${m.paidAfterSend} paying` },
    ...(m.hasCoupon ? [{ label: 'Coupon redeemed', value: String(m.couponRedemptions), sub: 'confirmed' }] : []),
    { label: 'Unsubscribed', value: String(m.unsubscribes), sub: 'since send' },
  ];
  const moved = m.transitions.filter((t) => t.changed);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="text-lg font-semibold">{t.value}</p>
            <p className="text-xs text-muted-foreground">{t.sub}</p>
          </div>
        ))}
      </div>
      {m.estimated && (
        <p className="text-xs text-amber-600">Starting stages for this campaign were reconstructed after the fact, so movement is approximate.</p>
      )}
      {moved.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted-foreground">
          {moved.map((t) => (
            <li key={`${t.from}>${t.to}`}>{t.count} × {t.fromLabel} → {t.toLabel}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CampaignsTab({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = React.useState<CampaignSummary[] | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<CampaignDetail | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setItems(await fetchCampaigns());
      if (openId) setDetail(await fetchCampaign(openId));
    } catch {
      /* keep what we have */
    }
  }, [openId]);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // Keep progress moving while something is still sending
  const anyActive = items?.some(isActive);
  React.useEffect(() => {
    if (!anyActive) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [anyActive, load]);

  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch {
      /* toast shown by api client */
    } finally {
      setBusy(null);
    }
  }

  if (!items) return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No campaigns yet. Create one in the "New campaign" tab.</p>}
        {items.map((c) => (
          <div key={c.id} className="rounded-lg border">
            <button
              type="button"
              className="w-full space-y-2 p-4 text-left"
              onClick={() => {
                setDetail(null);
                setOpenId(openId === c.id ? null : c.id);
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{c.name}</p>
                <Badge variant={c.status === 'DONE' ? 'secondary' : c.status === 'CANCELLED' ? 'outline' : 'default'}>{STATUS_LABEL[c.status]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{c.subject} · {new Date(c.createdAt).toLocaleString()}</p>
              <Progress c={c.counts} />
            </button>

            {openId === c.id && (
              <div className="space-y-3 border-t p-4">
                <div className="flex flex-wrap gap-2">
                  {isActive(c) && (
                    <Button size="sm" variant="destructive" disabled={busy === c.id} onClick={() => act(c.id, () => cancelCampaign(c.id), 'Remaining emails cancelled')}>
                      Cancel remaining
                    </Button>
                  )}
                  {c.counts.FAILED > 0 && c.status !== 'CANCELLED' && (
                    <Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c.id, () => retryFailedCampaign(c.id), 'Failed emails re-queued')}>
                      Retry {c.counts.FAILED} failed
                    </Button>
                  )}
                </div>
                {c.counts.SENT > 0 && <Metrics id={c.id} />}
                {!detail ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="max-h-72 overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {detail.recipients.map((r) => (
                          <tr key={r.id}>
                            <td className="px-3 py-1.5">{r.email}</td>
                            <td className={cn('px-3 py-1.5 text-xs', r.status === 'FAILED' && 'text-destructive', r.status === 'SENT' && 'text-green-600')}>{r.status}</td>
                            <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.error ?? (r.sentAt ? new Date(r.sentAt).toLocaleString() : '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {detail.counts.total > detail.recipients.length && (
                      <p className="border-t px-3 py-2 text-xs text-muted-foreground">Showing the first {detail.recipients.length} recipients.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
