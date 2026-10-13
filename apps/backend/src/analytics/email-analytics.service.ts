import { Injectable } from '@nestjs/common';
import { computeCampaignMetrics } from '../email-campaigns/campaign-metrics';
import { BUILT_IN_TEMPLATES } from '../email-campaigns/templates';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { cached } from './ttl-cache';
import { FUNNEL_STAGES, STAGE_LABELS } from './analytics.types';

// Below this many sent mails a rate is mostly noise, so the UI flags it as a small sample
export const MIN_SAMPLE = 50;

interface Range {
  from?: string;
  to?: string;
}

interface StatsBundle {
  stats: CampaignStats[];
  // Unique students across all campaigns in range (null when there are none)
  overall: {
    students: number;
    tracked: number;
    advanced: number;
    converted: number;
    revenueInr: number;
    unsubscribes: number;
    trackable: number;
    clicked: number;
    clicks: number;
    clickConverted: number;
  } | null;
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
  clicked: number;
  clicks: number;
  clickConverted: number;
  // Mails whose links were tracked: the only fair denominator for click rate
  trackable: number;
}

// A purchase only counts as click-driven if it follows the first click within this window
export const CLICK_WINDOW_MS = 7 * 86_400_000;

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
const day = (d: Date) => d.toISOString().slice(0, 10);

const PAYING_STAGES = new Set(['TRIAL', 'PAID', 'CANCELLED_ACTIVE']);

export function clickStats(
  sent: { userId: string; firstClickedAt: Date | null; clickCount: number; stageAtSend?: string | null }[],
  payments: { userId: string; createdAt: Date }[],
  redemptions: { userId: string; confirmedAt: Date | null }[],
) {
  const clickers = sent.filter((r) => r.firstClickedAt);
  const buys = new Map<string, Date[]>();
  for (const p of payments) buys.set(p.userId, [...(buys.get(p.userId) ?? []), p.createdAt]);
  for (const x of redemptions) if (x.confirmedAt) buys.set(x.userId, [...(buys.get(x.userId) ?? []), x.confirmedAt]);
  const clickConverted = clickers.filter((r) => {
    // Someone already paying when mailed renews on their own; that is not the mail working
    if (r.stageAtSend && PAYING_STAGES.has(r.stageAtSend)) return false;
    const first = (r.firstClickedAt as Date).getTime();
    return (buys.get(r.userId) ?? []).some((d) => d.getTime() >= first && d.getTime() <= first + CLICK_WINDOW_MS);
  }).length;
  return { clicked: clickers.length, clicks: sent.reduce((a, r) => a + r.clickCount, 0), clickConverted };
}

// For the 1st, 2nd, 3rd... mail each student got, did they unsubscribe straight after it?
export function unsubByPosition(byUser: Map<string, Date[]>, unsubAt: Map<string, Date>) {
  const labels = ['1st mail', '2nd mail', '3rd mail', '4th mail or later'];
  const out = labels.map((label) => ({ label, students: 0, unsubscribed: 0 }));
  for (const [userId, times] of byUser) {
    const u = unsubAt.get(userId);
    times.forEach((t, i) => {
      const bucket = out[Math.min(i, 3)] as { students: number; unsubscribed: number };
      bucket.students++;
      // Unsubscribed after this mail and before the next one: this is the mail that did it
      const next = times[i + 1];
      if (u && u >= t && (!next || u < next)) bucket.unsubscribed++;
    });
  }
  return out.map((b) => ({ ...b, unsubPct: pct(b.unsubscribed, b.students) }));
}

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
  private bundle(range: Range): Promise<StatsBundle> {
    return cached(`email:stats:${range.from ?? ''}:${range.to ?? ''}`, 60_000, () => this.loadCampaignStats(range));
  }

  private async campaignStats(range: Range): Promise<CampaignStats[]> {
    return (await this.bundle(range)).stats;
  }

  private async loadCampaignStats(range: Range): Promise<StatsBundle> {
    const createdAt = this.bounds(range);
    const campaigns = await this.prisma.emailCampaign.findMany({
      where: { status: { not: 'CANCELLED' }, ...(Object.keys(createdAt).length ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, subject: true, templateKey: true, status: true, createdAt: true, couponId: true },
    });
    if (!campaigns.length) return { stats: [], overall: null };
    const ids = campaigns.map((c) => c.id);

    const [recipients, rows] = await Promise.all([
      this.prisma.emailCampaignRecipient.findMany({
        where: { campaignId: { in: ids } },
        select: { campaignId: true, userId: true, status: true, sentAt: true, stageAtSend: true, stageEstimated: true, firstClickedAt: true, clickCount: true, linksTracked: true },
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

    const stats = campaigns.map((c) => {
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
        ...clickStats(sentRows, payments, redemptions.filter((x) => x.couponId === c.couponId)),
        trackable: sentRows.filter((r) => r.linksTracked).length,
      };
    });

    // Each student once, measured from the first mail they got: summing campaigns would count a
    // student (and their payment) again for every campaign that reached them.
    const firstMail = new Map<string, (typeof recipients)[number]>();
    const clickInfo = new Map<string, { firstClickedAt: Date | null; clickCount: number }>();
    const trackedStudents = new Set<string>();
    for (const r of recipients) {
      if (r.status !== 'SENT' || !r.sentAt) continue;
      const cur = firstMail.get(r.userId);
      if (!cur || (cur.sentAt as Date) > r.sentAt) firstMail.set(r.userId, r);
      if (r.linksTracked) trackedStudents.add(r.userId);
      const ci = clickInfo.get(r.userId) ?? { firstClickedAt: null, clickCount: 0 };
      if (r.firstClickedAt && (!ci.firstClickedAt || r.firstClickedAt < ci.firstClickedAt)) ci.firstClickedAt = r.firstClickedAt;
      ci.clickCount += r.clickCount;
      clickInfo.set(r.userId, ci);
    }
    const unique = [...firstMail.values()];
    const uniqueIds = new Set(unique.map((r) => r.userId));
    const m = computeCampaignMetrics({
      recipients: unique.map((r) => ({ userId: r.userId, sentAt: r.sentAt as Date, stageAtSend: r.stageAtSend, stageEstimated: r.stageEstimated })),
      currentStage,
      payments: payments.filter((p) => uniqueIds.has(p.userId)),
      couponRedemptions: [],
      unsubscribes: unsubs.filter((u) => uniqueIds.has(u.id)).map((u) => ({ userId: u.id, at: u.marketingUnsubscribedAt as Date })),
    });
    const overall = {
      students: unique.length,
      tracked: m.tracked,
      advanced: m.advanced,
      converted: m.converted,
      revenueInr: m.revenueInr,
      unsubscribes: m.unsubscribes,
      trackable: trackedStudents.size,
      ...clickStats(
        unique.map((r) => ({ userId: r.userId, stageAtSend: r.stageAtSend, ...(clickInfo.get(r.userId) as { firstClickedAt: Date | null; clickCount: number }) })),
        payments,
        redemptions,
      ),
    };
    return { stats, overall };
  }

  private rates(s: { sent: number; tracked: number; advanced: number; converted: number; revenueInr: number; unsubscribes: number; clicked: number; clickConverted: number; trackable: number }) {
    return {
      ctrPct: pct(s.clicked, s.trackable),
      clickTracked: s.trackable > 0,
      clickConvertedPct: pct(s.clickConverted, s.clicked),
      advancedPct: pct(s.advanced, s.tracked),
      convertedPct: pct(s.converted, s.tracked),
      unsubPct: pct(s.unsubscribes, s.sent),
      revenuePer1000: s.sent ? Math.round((s.revenueInr / s.sent) * 1000) : 0,
      smallSample: s.sent < MIN_SAMPLE,
    };
  }

  async overview(range: Range) {
    const { stats, overall } = await this.bundle(range);
    const sum = (f: (s: CampaignStats) => number) => stats.reduce((a, s) => a + f(s), 0);
    // Mail counts add up across campaigns; student outcomes come from the de-duplicated pass
    const totals = {
      campaigns: stats.length,
      audience: sum((s) => s.audienceSize),
      sent: sum((s) => s.sent),
      failed: sum((s) => s.failed),
      skipped: sum((s) => s.skipped),
      students: overall?.students ?? 0,
      tracked: overall?.tracked ?? 0,
      advanced: overall?.advanced ?? 0,
      converted: overall?.converted ?? 0,
      revenueInr: overall?.revenueInr ?? 0,
      couponRedemptions: sum((s) => s.couponRedemptions),
      unsubscribes: overall?.unsubscribes ?? 0,
      clicked: overall?.clicked ?? 0,
      clicks: overall?.clicks ?? 0,
      clickConverted: overall?.clickConverted ?? 0,
      trackable: overall?.trackable ?? 0,
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
        ...this.rates({ ...totals, sent: totals.students }),
        revenuePer1000: totals.sent ? Math.round((totals.revenueInr / totals.sent) * 1000) : 0,
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
          clicked: a.clicked + s.clicked,
          clickConverted: a.clickConverted + s.clickConverted,
          trackable: a.trackable + s.trackable,
        }),
        { sent: 0, tracked: 0, advanced: 0, converted: 0, revenueInr: 0, unsubscribes: 0, clicked: 0, clickConverted: 0, trackable: 0 },
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

  // Day-of-week x hour (IST) with how many mails went out and how many were clicked
  async sendTimes(range: Range) {
    const sentAt = this.bounds(range);
    const rows = await this.prisma.emailCampaignRecipient.findMany({
      where: { status: 'SENT', linksTracked: true, sentAt: Object.keys(sentAt).length ? sentAt : { not: null } },
      select: { sentAt: true, firstClickedAt: true },
    });
    const IST = 330 * 60_000;
    const cells = new Map<string, { sent: number; clicked: number }>();
    for (const r of rows) {
      const d = new Date((r.sentAt as Date).getTime() + IST);
      const key = `${d.getUTCDay()}|${d.getUTCHours()}`;
      const c = cells.get(key) ?? { sent: 0, clicked: 0 };
      c.sent++;
      if (r.firstClickedAt) c.clicked++;
      cells.set(key, c);
    }
    return {
      minSample: MIN_SAMPLE / 5,
      cells: [...cells.entries()].map(([k, v]) => {
        const [day, hour] = k.split('|').map(Number) as [number, number];
        return { day, hour, sent: v.sent, clicked: v.clicked, ctrPct: pct(v.clicked, v.sent) };
      }),
    };
  }

  // Subject lines compared inside the same template, a lightweight A/B read
  async subjects(range: Range) {
    const stats = await this.campaignStats(range);
    const groups = new Map<string, CampaignStats[]>();
    for (const s of stats) {
      const key = s.templateKey ?? 'custom';
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()]
      .filter(([, list]) => new Set(list.map((s) => s.subject)).size > 1)
      .map(([key, list]) => ({
        key,
        name: list[0]?.templateName ?? key,
        subjects: list
          .map((s) => ({ subject: s.subject, sent: s.sent, ctrPct: pct(s.clicked, s.trackable), convertedPct: pct(s.converted, s.tracked), smallSample: s.sent < MIN_SAMPLE }))
          .sort((a, b) => b.ctrPct - a.ctrPct || b.convertedPct - a.convertedPct),
      }));
  }

  // Are we mailing the same students too often? For the 1st, 2nd, 3rd... mail a student got in the last
  // 30 days, how often did they unsubscribe straight after it? Bucketing by total mails received would
  // be misleading: someone who unsubscribes stops receiving mail, so heavy-mail buckets look clean.
  async fatigue() {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const sends = await this.prisma.emailCampaignRecipient.findMany({
      where: { status: 'SENT', sentAt: { gte: since } },
      orderBy: { sentAt: 'asc' },
      select: { userId: true, sentAt: true },
    });
    const byUser = new Map<string, Date[]>();
    for (const s of sends) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s.sentAt as Date]);
    const unsubAt = new Map(
      (
        await this.prisma.user.findMany({
          where: { id: { in: [...byUser.keys()] }, marketingUnsubscribedAt: { gte: since } },
          select: { id: true, marketingUnsubscribedAt: true },
        })
      ).map((u) => [u.id, u.marketingUnsubscribedAt as Date]),
    );
    return unsubByPosition(byUser, unsubAt);
  }

  async campaignDetail(id: string) {
    const [clicks, recipients] = await Promise.all([
      this.prisma.emailLinkClick.findMany({ where: { campaignId: id }, select: { linkKey: true, clickedAt: true } }),
      this.prisma.emailCampaignRecipient.count({ where: { campaignId: id, status: 'SENT' } }),
    ]);
    const byLink = new Map<string, number>();
    const perDay = new Map<string, number>();
    for (const c of clicks) {
      byLink.set(c.linkKey, (byLink.get(c.linkKey) ?? 0) + 1);
      perDay.set(day(c.clickedAt), (perDay.get(day(c.clickedAt)) ?? 0) + 1);
    }
    return {
      sent: recipients,
      totalClicks: clicks.length,
      byLink: [...byLink.entries()].map(([linkKey, count]) => ({ linkKey, count })).sort((a, b) => b.count - a.count),
      perDay: [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count })),
    };
  }
}
