import { STAGE_LABELS, type FunnelStage } from '../analytics/analytics.types';

// How far along the funnel a stage is. LAPSED sits mid-funnel so a lapsed student who comes
// back (TRIAL/PAID) counts as having moved forward.
const RANK: Record<string, number> = {
  REGISTERED: 0,
  PROFILE_STARTED: 1,
  PROFILE_COMPLETE: 2,
  LAPSED: 3,
  PAYMENT_INITIATED: 4,
  TRIAL: 5,
  PAID: 6,
  CANCELLED_ACTIVE: 6,
};
const PAYING = new Set(['TRIAL', 'PAID', 'CANCELLED_ACTIVE']);

export interface MetricsRecipient {
  userId: string;
  sentAt: Date;
  stageAtSend: string | null;
  stageEstimated?: boolean;
}

export interface MetricsInput {
  recipients: MetricsRecipient[];
  currentStage: Map<string, string>;
  payments: { userId: string; amount: number; createdAt: Date }[]; // amount in paise
  couponRedemptions: { userId: string; confirmedAt: Date }[];
  unsubscribes: { userId: string; at: Date }[];
}

export function computeCampaignMetrics(input: MetricsInput) {
  const tracked = input.recipients.filter((r) => r.stageAtSend && input.currentStage.has(r.userId));
  const sentAt = new Map(input.recipients.map((r) => [r.userId, r.sentAt]));
  const after = (userId: string, at: Date) => at >= (sentAt.get(userId) ?? new Date(0));

  let advanced = 0;
  let converted = 0;
  const transitions = new Map<string, number>();
  for (const r of tracked) {
    const from = r.stageAtSend as string;
    const to = input.currentStage.get(r.userId) as string;
    if ((RANK[to] ?? 0) > (RANK[from] ?? 0)) advanced++;
    if (PAYING.has(to) && !PAYING.has(from)) converted++;
    const key = `${from}>${to}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
  }

  const paidUsers = new Set<string>();
  let revenuePaise = 0;
  for (const p of input.payments) {
    if (!after(p.userId, p.createdAt)) continue;
    revenuePaise += p.amount;
    paidUsers.add(p.userId);
  }

  const label = (s: string) => STAGE_LABELS[s as FunnelStage] ?? s;
  const pct = (n: number) => (tracked.length ? Math.round((n / tracked.length) * 1000) / 10 : 0);
  return {
    sent: input.recipients.length,
    tracked: tracked.length,
    estimated: tracked.some((r) => r.stageEstimated),
    advanced,
    advancedPct: pct(advanced),
    converted,
    convertedPct: pct(converted),
    paidAfterSend: paidUsers.size,
    revenueInr: revenuePaise / 100,
    couponRedemptions: input.couponRedemptions.filter((c) => after(c.userId, c.confirmedAt)).length,
    unsubscribes: input.unsubscribes.filter((u) => after(u.userId, u.at)).length,
    transitions: [...transitions.entries()]
      .map(([key, count]) => {
        const [from, to] = key.split('>') as [string, string];
        return { from, to, fromLabel: label(from), toLabel: label(to), count, changed: from !== to };
      })
      .sort((a, b) => (RANK[a.from] ?? 0) - (RANK[b.from] ?? 0) || b.count - a.count),
  };
}
