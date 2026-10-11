import { Injectable } from '@nestjs/common';
import { computeCampaignMetrics } from '../email-campaigns/campaign-metrics';
import { BUILT_IN_TEMPLATES } from '../email-campaigns/templates';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { FUNNEL_STAGES, STAGE_LABELS } from './analytics.types';

// Below this many sent mails a rate is mostly noise, so the UI flags it as a small sample
export const MIN_SAMPLE = 50;

interface Range {
  from?: string;
  to?: string;
}

interface CampaignStats {
  id: string;
  name: string;
  subject: string;
  templateKey: string | null;
  templateName: string;
  status: string;
  createdAt: Date;
  audienceSize: number;
  sent: number;
  failed: number;
  skipped: number;
  tracked: number;
  advanced: number;
  converted: number;
  revenueInr: number;
  couponRedemptions: number;
  unsubscribes: number;
}

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const day = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class EmailAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  private bounds({ from, to }: Range) {
    const start = from ? new Date(from) : undefined;
    const end = to ? new Date(to) : undefined;
    if (end) end.setUTCHours(23, 59, 59, 999);
    return {
      ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
      ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
    };
  }

  // One pass: every campaign created in range with the same attribution maths the campaign page uses
  private async campaignStats(range: Range): Promise<CampaignStats[]> {
    const createdAt = this.bounds(range);
    const campaigns = await this.prisma.emailCampaign.findMany({
      where: { status: { not: 'CANCELLED' }, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, subject: true, templateKey: true, status: true, createdAt: true, couponId: true },
    });
    if (!campaigns.length) return [];
    const ids = campaigns.map((c) => c.id);

    const [recipients, rows] = await Promise.all([
      this.prisma.emailCampaignRecipient.findMany({
        where: { campaignId: { in: ids } },
        select: { campaignId: true, userId: true, status: true, sentAt: true, stageAtSend: true, stageEstimated: true },
      }),
      this.analytics.buildRows({ role: 'USER' }),
    ]);
    const userIds = [...new Set(recipients.map((r) => r.userId))];
    const firstSent = recipients.reduce<Date | null>((m, r) => (r.sentAt && (!m || r.sentAt < m) ? r.sentAt : m), null);
    const couponIds = [...new Set(campaigns.map((c) => c.couponId).filter((c): c is string => !!c))];

    const [payments, redemptions, unsubs] = await Promise.all([
      firstSent
        ? this.prisma.transaction.findMany({
            where: { userId: { in: userIds }, status: 'captured', createdAt: { gte: firstSent } },
            select: { userId: true, amount: true, createdAt: true },
          })
        : Promise.resolve([]),
      couponIds.length
        ? this.prisma.couponRedemption.findMany({
            where: { couponId: { in: couponIds }, userId: { in: userIds }, confirmedAt: { not: null } },
            select: { couponId: true, userId: true, confirmedAt: true },
          })
        : Promise.resolve([]),
      this.prisma.user.findMany({
        where: { id: { in: userIds }, marketingUnsubscribedAt: { not: null } },
        select: { id: true, marketingUnsubscribedAt: true },
      }),
    ]);

    const currentStage = new Map(rows.map((r) => [r.id, r.stage as string]));
    const byCampaign = new Map<string, typeof recipients>();
    for (const r of recipients) byCampaign.set(r.campaignId, [...(byCampaign.get(r.campaignId) ?? []), r]);
    const templateNames = new Map(BUILT_IN_TEMPLATES.map((t) => [t.key, t.name]));

    return campaigns.map((c) => {
      const all = byCampaign.get(c.id) ?? [];
      const sentRows = all.filter((r) => r.status === 'SENT' && r.sentAt);
      const ids = new Set(sentRows.map((r) => r.userId));
      const m = computeCampaignMetrics({
        recipients: sentRows.map((r) => ({
          userId: r.userId,
          sentAt: r.sentAt as Date,
          stageAtSend: r.stageAtSend,
          stageEstimated: r.stageEstimated,
        })),
        currentStage,
        payments: payments.filter((p) => ids.has(p.userId)),
        couponRedemptions: redemptions
          .filter((x) => x.couponId === c.couponId && ids.has(x.userId))
          .map((x) => ({ userId: x.userId, confirmedAt: x.confirmedAt as Date })),
        unsubscribes: unsubs.filter((u) => ids.has(u.id)).map((u) => ({ userId: u.id, at: u.marketingUnsubscribedAt as Date })),
      });
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        templateKey: c.templateKey,
        templateName: c.templateKey ? (templateNames.get(c.templateKey) ?? c.templateKey) : 'Custom',
        status: c.status,
        createdAt: c.createdAt,
        audienceSize: all.length,
        sent: m.sent,
        failed: all.filter((r) => r.status === 'FAILED').length,
        skipped: all.filter((r) => r.status === 'SKIPPED').length,
        tracked: m.tracked,
        advanced: m.advanced,
        converted: m.converted,
        revenueInr: m.revenueInr,
        couponRedemptions: m.couponRedemptions,
        unsubscribes: m.unsubscribes,
      };
    });
  }

  private rates(s: { sent: number; tracked: number; advanced: number; converted: number; revenueInr: number; unsubscribes: number }) {
    return {
      advancedPct: pct(s.advanced, s.tracked),
      convertedPct: pct(s.converted, s.tracked),
      unsubPct: pct(s.unsubscribes, s.sent),
      revenuePer1000: s.sent ? Math.round((s.revenueInr / s.sent) * 1000) : 0,
      smallSample: s.sent < MIN_SAMPLE,
    };
  }

  async overview(range: Range) {
    const stats = await this.campaignStats(range);
    const sum = (f: (s: CampaignStats) => number) => stats.reduce((a, s) => a + f(s), 0);
    const totals = {
      campaigns: stats.length,
      audience: sum((s) => s.audienceSize),
      sent: sum((s) => s.sent),
      failed: sum((s) => s.failed),
      skipped: sum((s) => s.skipped),
      tracked: sum((s) => s.tracked),
      advanced: sum((s) => s.advanced),
      converted: sum((s) => s.converted),
      revenueInr: sum((s) => s.revenueInr),
      couponRedemptions: sum((s) => s.couponRedemptions),
      unsubscribes: sum((s) => s.unsubscribes),
    };

    const sentAt = this.bounds(range);
    const daily = await this.prisma.emailCampaignRecipient.findMany({
      where: { status: 'SENT', sentAt: Object.keys(sentAt).length ? sentAt : { not: null } },
      select: { sentAt: true },
    });
    const perDay = new Map<string, number>();
    for (const r of daily) if (r.sentAt) perDay.set(day(r.sentAt), (perDay.get(day(r.sentAt)) ?? 0) + 1);

    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const [sentToday, sentLastHour] = await Promise.all([
      this.prisma.emailCampaignRecipient.count({ where: { status: 'SENT', sentAt: { gte: dayStart } } }),
      this.prisma.emailCampaignRecipient.count({ where: { status: 'SENT', sentAt: { gte: new Date(Date.now() - 3_600_000) } } }),
    ]);

    return {
      totals: {
        ...totals,
        deliveryPct: pct(totals.sent, totals.sent + totals.failed),
        ...this.rates({ ...totals }),
      },
      perDay: [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, sent]) => ({ date, sent })),
      quota: { sentToday, sentLastHour },
    };
  }

  async campaigns(range: Range) {
    const stats = await this.campaignStats(range);
    return stats.map((s) => ({ ...s, ...this.rates(s), deliveryPct: pct(s.sent, s.sent + s.failed) }));
  }

  // Which template earns its keep, overall and by the funnel stage the student was in when mailed
  async templates(range: Range) {
    const stats = await this.campaignStats(range);
    const groups = new Map<string, CampaignStats[]>();
    for (const s of stats) {
      const key = s.templateKey ?? 'custom';
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    const templates = [...groups.entries()].map(([key, list]) => {
      const t = list.reduce(
        (a, s) => ({
          sent: a.sent + s.sent,
          tracked: a.tracked + s.tracked,
          advanced: a.advanced + s.advanced,
          converted: a.converted + s.converted,
          revenueInr: a.revenueInr + s.revenueInr,
          unsubscribes: a.unsubscribes + s.unsubscribes,
        }),
        { sent: 0, tracked: 0, advanced: 0, converted: 0, revenueInr: 0, unsubscribes: 0 },
      );
      return { key, name: list[0]?.templateName ?? key, campaigns: list.length, ...t, ...this.rates(t) };
    });
    templates.sort((a, b) => b.convertedPct - a.convertedPct || b.sent - a.sent);

    const byStage = await this.templateByStage(stats);
    return { templates, byStage, minSample: MIN_SAMPLE };
  }

  private async templateByStage(stats: CampaignStats[]) {
    const ids = stats.map((s) => s.id);
    if (!ids.length) return [];
    const recipients = await this.prisma.emailCampaignRecipient.findMany({
      where: { campaignId: { in: ids }, status: 'SENT', stageAtSend: { not: null } },
      select: { campaignId: true, userId: true, stageAtSend: true },
    });
    const rows = await this.analytics.buildRows({ role: 'USER' });
    const now = new Map(rows.map((r) => [r.id, r.stage as string]));
    const keyOf = new Map(stats.map((s) => [s.id, s.templateKey ?? 'custom']));
    const nameOf = new Map(stats.map((s) => [s.templateKey ?? 'custom', s.templateName]));
    const paying = new Set(['TRIAL', 'PAID', 'CANCELLED_ACTIVE']);

    const cells = new Map<string, { sent: number; converted: number }>();
    for (const r of recipients) {
      const to = now.get(r.userId);
      if (!to) continue;
      const k = `${r.stageAtSend}|${keyOf.get(r.campaignId)}`;
      const cell = cells.get(k) ?? { sent: 0, converted: 0 };
      cell.sent++;
      if (paying.has(to) && !paying.has(r.stageAtSend as string)) cell.converted++;
      cells.set(k, cell);
    }
    return FUNNEL_STAGES.map((stage) => {
      const options = [...cells.entries()]
        .filter(([k]) => k.startsWith(`${stage}|`))
        .map(([k, v]) => {
          const key = k.split('|')[1] ?? 'custom';
          return { key, name: nameOf.get(key) ?? key, sent: v.sent, converted: v.converted, convertedPct: pct(v.converted, v.sent), smallSample: v.sent < MIN_SAMPLE };
        })
        .sort((a, b) => b.convertedPct - a.convertedPct);
      return { stage, stageLabel: STAGE_LABELS[stage], options };
    }).filter((s) => s.options.length);
  }

  // Coupon -> trial -> paid journey, which the overview only showed as a redemption count
  async coupons(range: Range) {
    const [coupons, rows] = await Promise.all([
      this.prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, code: true, freeDays: true, isActive: true, deletedAt: true, redemptionCount: true },
      }),
      this.analytics.buildRows({ ...range, role: 'USER' }),
    ]);
    return coupons
      .map((c) => {
        const users = rows.filter((r) => r.couponCode === c.code);
        const count = (s: string) => users.filter((u) => u.stage === s).length;
        const paidEver = users.filter((u) => u.paymentCount > 0).length;
        return {
          code: c.code,
          freeDays: c.freeDays,
          isActive: c.isActive && !c.deletedAt,
          redeemed: c.redemptionCount,
          inRange: users.length,
          trial: count('TRIAL'),
          paid: count('PAID'),
          cancelledActive: count('CANCELLED_ACTIVE'),
          lapsed: count('LAPSED'),
          paidEver,
          trialToPaidPct: pct(paidEver, users.length),
          revenueInr: users.reduce((a, u) => a + u.totalPaidInr, 0),
        };
      })
      .filter((c) => c.redeemed > 0 || c.inRange > 0);
  }
}
