import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { cached } from './ttl-cache';

const DAY = 86_400_000;
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? (v[mid] as number) : ((v[mid - 1] as number) + (v[mid] as number)) / 2;
}

// Monday of the UTC week, as YYYY-MM-DD
export function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export interface CohortInput {
  users: { id: string; createdAt: Date }[];
  firstPayment: Map<string, Date>;
  weeks: number;
}

// Signup week x "had paid within N weeks of registering". Weeks that haven't elapsed yet stay null.
export function buildCohorts({ users, firstPayment, weeks }: CohortInput, now = new Date()) {
  const groups = new Map<string, { id: string; createdAt: Date }[]>();
  for (const u of users) groups.set(weekStart(u.createdAt), [...(groups.get(weekStart(u.createdAt)) ?? []), u]);
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([week, members]) => ({
      week,
      size: members.length,
      paidByWeek: Array.from({ length: weeks }, (_, n) => {
        // the last signup of the week must have had (n+1) full weeks too
        const settledAt = new Date(`${week}T00:00:00Z`).getTime() + (n + 2) * 7 * DAY;
        if (settledAt > now.getTime()) return null;
        const paid = members.filter((m) => {
          const p = firstPayment.get(m.id);
          return p && p.getTime() - m.createdAt.getTime() <= (n + 1) * 7 * DAY;
        }).length;
        return pct(paid, members.length);
      }),
    }));
}

@Injectable()
export class GrowthAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  revenue() {
    return cached('growth:revenue', 60_000, () => this.loadRevenue());
  }

  private async loadRevenue() {
    const now = Date.now();
    const [rows, txs] = await Promise.all([
      this.analytics.buildRows({ role: 'USER' }),
      this.prisma.transaction.findMany({ select: { userId: true, amount: true, status: true, createdAt: true } }),
    ]);
    const captured = txs.filter((t) => t.status === 'captured');
    const since = (days: number) => captured.filter((t) => t.createdAt.getTime() >= now - days * DAY);
    const sum = (list: { amount: number }[]) => list.reduce((a, t) => a + t.amount, 0) / 100;
    const last30 = since(30);
    const prev30 = captured.filter((t) => t.createdAt.getTime() >= now - 60 * DAY && t.createdAt.getTime() < now - 30 * DAY);

    const count = (s: string) => rows.filter((r) => r.stage === s).length;
    const paying = count('PAID') + count('CANCELLED_ACTIVE');
    const lapsed = count('LAPSED');
    // Everyone who ever had a free trial (coupon or card-on-file trial) and how many of them have paid
    const trialists = rows.filter((r) => r.couponCode || r.trialEndsAt || r.stage === 'TRIAL');
    const trialistsPaid = trialists.filter((r) => r.paymentCount > 0).length;
    const payers = new Set(captured.map((t) => t.userId)).size;

    const perDay = new Map<string, number>();
    for (const t of since(60)) {
      const d = t.createdAt.toISOString().slice(0, 10);
      perDay.set(d, (perDay.get(d) ?? 0) + t.amount / 100);
    }

    return {
      revenue30: sum(last30),
      revenuePrev30: sum(prev30),
      revenueTotal: sum(captured),
      payments30: last30.length,
      arpuInr: payers ? Math.round(sum(captured) / payers) : 0,
      payingNow: paying,
      cancelledStillActive: count('CANCELLED_ACTIVE'),
      lapsed,
      churnPct: pct(lapsed, paying + lapsed),
      trialToPaidPct: pct(trialistsPaid, trialists.length),
      trialists: trialists.length,
      failedPayments30: txs.filter((t) => t.status !== 'captured' && t.createdAt.getTime() >= now - 30 * DAY).length,
      perDay: [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count: Math.round(count) })),
    };
  }

  // How long students take to turn into customers, and how each signup week is converting
  funnelTiming(weeks = 8) {
    return cached(`growth:timing:${weeks}`, 60_000, () => this.loadFunnelTiming(weeks));
  }

  private async loadFunnelTiming(weeks: number) {
    const since = new Date(`${weekStart(new Date(Date.now() - (weeks - 1) * 7 * DAY))}T00:00:00Z`);
    const [users, txs] = await Promise.all([
      this.prisma.user.findMany({ where: { role: 'USER', createdAt: { gte: since } }, select: { id: true, createdAt: true } }),
      this.prisma.transaction.findMany({ where: { status: 'captured' }, orderBy: { createdAt: 'asc' }, select: { userId: true, createdAt: true } }),
    ]);
    const firstPayment = new Map<string, Date>();
    for (const t of txs) if (!firstPayment.has(t.userId)) firstPayment.set(t.userId, t.createdAt);

    const days = users
      .map((u) => firstPayment.get(u.id))
      .map((p, i) => (p ? (p.getTime() - (users[i] as { createdAt: Date }).createdAt.getTime()) / DAY : null))
      .filter((d): d is number => d !== null && d >= 0);
    const med = median(days);
    return {
      medianDaysToFirstPayment: med === null ? null : Math.round(med * 10) / 10,
      payersInWindow: days.length,
      signups: users.length,
      withinDayPct: pct(days.filter((d) => d <= 1).length, days.length),
      withinWeekPct: pct(days.filter((d) => d <= 7).length, days.length),
      cohorts: buildCohorts({ users, firstPayment, weeks }),
      weeks,
    };
  }
}
