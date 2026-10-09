import { BadRequestException, Injectable } from '@nestjs/common';
import type { CrmLeadStatus } from '@prisma/client';
import { computeCampaignMetrics } from '../email-campaigns/campaign-metrics';
import { CALL_OUTCOME_LABELS, CLOSED_STATUSES, CONTACT_TYPES, CRM_STATUSES, CRM_STATUS_LABELS } from '../crm/crm.types';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

const day = (d: Date) => d.toISOString().slice(0, 10);

function countBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k) map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

const perDay = (dates: Date[]) =>
  [...countBy(dates, day).entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count }));

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

// CRM outreach and company interview metrics for the superadmin analytics page.
@Injectable()
export class OutreachAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  private range(from?: string, to?: string) {
    const parse = (v: string | undefined, endOfDay: boolean) => {
      if (!v) return undefined;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
      if (endOfDay) d.setHours(23, 59, 59, 999);
      return d;
    };
    const f = parse(from, false);
    const t = parse(to, true);
    return f || t ? { ...(f ? { gte: f } : {}), ...(t ? { lte: t } : {}) } : undefined;
  }

  async crm(q: { from?: string; to?: string }) {
    const createdAt = this.range(q.from, q.to);
    const students = await this.analytics.buildRows({ role: 'USER' });
    const leads = students.filter((r) => r.profileComplete && r.mobile);
    const leadIds = new Set(leads.map((r) => r.id));
    const stageNow = new Map(students.map((r) => [r.id, r.stage as string]));

    const [crmLeads, activities, firstContacts] = await Promise.all([
      this.prisma.crmLead.findMany({ select: { userId: true, status: true, nextFollowUpAt: true, contactAttempts: true } }),
      this.prisma.crmActivity.findMany({
        where: createdAt ? { createdAt } : {},
        select: { type: true, callOutcome: true, actorId: true, createdAt: true, actor: { select: { name: true } } },
      }),
      // First contact per student, ever: the moment outreach can start to take credit
      this.prisma.crmActivity.findMany({
        where: { type: { in: [...CONTACT_TYPES] } },
        orderBy: { createdAt: 'asc' },
        distinct: ['userId'],
        select: { userId: true, createdAt: true, stageAtActivity: true },
      }),
    ]);

    const leadState = new Map(crmLeads.map((l) => [l.userId, l]));
    const now = new Date();
    const byStatus = CRM_STATUSES.map((status) => ({
      key: status,
      label: CRM_STATUS_LABELS[status],
      count: leads.filter((r) => (leadState.get(r.id)?.status ?? 'NEW') === status).length,
    }));
    const neverContacted = leads.filter((r) => !leadState.get(r.id)?.contactAttempts).length;
    const overdueFollowUps = crmLeads.filter(
      (l) => leadIds.has(l.userId) && l.nextFollowUpAt && l.nextFollowUpAt < now && !CLOSED_STATUSES.has(l.status as CrmLeadStatus),
    ).length;

    const calls = activities.filter((a) => a.type === 'CALL');
    const contacts = activities.filter((a) => CONTACT_TYPES.has(a.type));
    const connected = calls.filter((a) => a.callOutcome === 'CONNECTED').length;
    const outcomes = countBy(calls, (a) => a.callOutcome);

    const actors = new Map<string, { name: string; activities: number; contacts: number }>();
    for (const a of activities) {
      if (!a.actorId) continue;
      const row = actors.get(a.actorId) ?? { name: a.actor?.name ?? 'Unknown', activities: 0, contacts: 0 };
      row.activities++;
      if (CONTACT_TYPES.has(a.type)) row.contacts++;
      actors.set(a.actorId, row);
    }

    // Conversion after first contact (within the range), measured like campaign conversion
    const inRange = firstContacts.filter(
      (f) => (!createdAt?.gte || f.createdAt >= createdAt.gte) && (!createdAt?.lte || f.createdAt <= createdAt.lte),
    );
    const contactedIds = inRange.map((f) => f.userId);
    const payments = contactedIds.length
      ? await this.prisma.transaction.findMany({
          where: { userId: { in: contactedIds }, status: 'captured' },
          select: { userId: true, amount: true, createdAt: true },
        })
      : [];
    const metrics = computeCampaignMetrics({
      recipients: inRange.map((f) => ({ userId: f.userId, sentAt: f.createdAt, stageAtSend: f.stageAtActivity })),
      currentStage: stageNow,
      payments,
      couponRedemptions: [],
      unsubscribes: [],
    });

    return {
      totals: {
        eligibleLeads: leads.length,
        neverContacted,
        overdueFollowUps,
        activities: activities.length,
        contacts: contacts.length,
        calls: calls.length,
        connectRatePct: pct(connected, calls.length),
        studentsContacted: new Set(firstContacts.map((f) => f.userId)).size,
      },
      byStatus,
      callOutcomes: [...outcomes.entries()]
        .map(([key, count]) => ({ key, label: CALL_OUTCOME_LABELS[key as keyof typeof CALL_OUTCOME_LABELS] ?? key, count }))
        .sort((a, b) => b.count - a.count),
      activityTypes: [...countBy(activities, (a) => a.type).entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
      contactsPerDay: perDay(contacts.map((a) => a.createdAt)),
      byActor: [...actors.values()].sort((a, b) => b.activities - a.activities),
      conversion: {
        contacted: metrics.sent,
        tracked: metrics.tracked,
        advanced: metrics.advanced,
        advancedPct: metrics.advancedPct,
        converted: metrics.converted,
        convertedPct: metrics.convertedPct,
        paidAfterContact: metrics.paidAfterSend,
        revenueInr: metrics.revenueInr,
        transitions: metrics.transitions.filter((t) => t.changed),
      },
    };
  }

  async companyInterviews(q: { from?: string; to?: string }) {
    const scheduledAt = this.range(q.from, q.to);
    const rows = await this.prisma.companyInterview.findMany({
      where: scheduledAt ? { scheduledAt } : {},
      select: {
        status: true,
        source: true,
        scheduledAt: true,
        rescheduleCount: true,
        studentEmailSentAt: true,
        companyEmailSentAt: true,
        studentId: true,
        company: { select: { email: true, companyProfile: { select: { companyName: true } } } },
      },
    });
    const now = new Date();
    const byStatus = countBy(rows, (r) => r.status);
    const superadmin = rows.filter((r) => r.source === 'SUPERADMIN');
    const delivered = superadmin.filter((r) => r.studentEmailSentAt && r.companyEmailSentAt).length;

    const companies = new Map<string, { label: string; scheduled: number; completed: number; cancelled: number }>();
    for (const r of rows) {
      const label = r.company.companyProfile?.companyName ?? r.company.email;
      const c = companies.get(label) ?? { label, scheduled: 0, completed: 0, cancelled: 0 };
      if (r.status === 'SCHEDULED') c.scheduled++;
      else if (r.status === 'COMPLETED') c.completed++;
      else c.cancelled++;
      companies.set(label, c);
    }
    const total = (c: { scheduled: number; completed: number; cancelled: number }) => c.scheduled + c.completed + c.cancelled;

    return {
      totals: {
        total: rows.length,
        scheduled: byStatus.get('SCHEDULED') ?? 0,
        upcoming: rows.filter((r) => r.status === 'SCHEDULED' && r.scheduledAt > now).length,
        completed: byStatus.get('COMPLETED') ?? 0,
        cancelled: byStatus.get('CANCELLED') ?? 0,
        students: new Set(rows.map((r) => r.studentId)).size,
        rescheduledPct: pct(rows.filter((r) => r.rescheduleCount > 0).length, rows.length),
        completionPct: pct(byStatus.get('COMPLETED') ?? 0, rows.filter((r) => r.status !== 'SCHEDULED').length),
        emailDeliveryPct: pct(delivered, superadmin.length),
      },
      bySource: [...countBy(rows, (r) => r.source).entries()].map(([label, count]) => ({ label, count })),
      byCompany: [...companies.values()].sort((a, b) => total(b) - total(a)).slice(0, 10),
      perDay: perDay(rows.map((r) => r.scheduledAt)),
    };
  }
}
