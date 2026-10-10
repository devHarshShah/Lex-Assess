import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hasAccess } from '../payments/access';
import {
  FUNNEL_STAGES,
  STAGE_LABELS,
  type AnalyticsFilters,
  type FunnelStage,
  type UserReportRow,
} from './analytics.types';

export interface StageInput {
  role: string;
  hasProfile: boolean;
  profileComplete: boolean;
  razorpaySubscriptionId: string | null;
  hasActiveSubscription: boolean;
  accessEndsAt?: Date | null;
  trialEndsAt: Date | null;
  capturedPayments: number;
  // Coupon redeemed directly (no Razorpay mandate), as opposed to the older mandate-based trial
  directCouponTrial?: boolean;
}

// Highest stage reached. Students only; other roles are reported separately.
export function deriveStage(u: StageInput): FunnelStage {
  if (u.role !== 'USER') return 'NON_STUDENT';
  const active = hasAccess(u);
  // Direct coupon access is granted with accessEndsAt set and nothing charged: still a trial.
  // Older mandate-based trials whose autopay was cancelled stay CANCELLED_ACTIVE below.
  if (active && u.directCouponTrial && u.capturedPayments === 0) return 'TRIAL';
  if (active && u.accessEndsAt) return 'CANCELLED_ACTIVE';
  if (u.capturedPayments > 0) return active ? 'PAID' : 'LAPSED';
  if (active) return u.trialEndsAt ? 'TRIAL' : 'PAID';
  if (u.razorpaySubscriptionId) return 'PAYMENT_INITIATED';
  if (u.profileComplete) return 'PROFILE_COMPLETE';
  if (u.hasProfile) return 'PROFILE_STARTED';
  return 'REGISTERED';
}

const PAGE_SIZE = 50;

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: string | undefined, endOfDay = false): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    if (endOfDay) d.setHours(23, 59, 59, 999);
    return d;
  }

  async buildRows(filters: AnalyticsFilters): Promise<UserReportRow[]> {
    const from = this.parseDate(filters.from);
    const to = this.parseDate(filters.to, true);
    const rows = await this.loadRows({
      ...(filters.role ? { role: filters.role as never } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    });

    const search = filters.search?.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!filters.stage || r.stage === filters.stage) &&
        (!filters.crmStatus || r.crmStatus === filters.crmStatus) &&
        (!search ||
          r.email.toLowerCase().includes(search) ||
          r.name.toLowerCase().includes(search) ||
          (r.college ?? '').toLowerCase().includes(search)),
    );
  }

  // Report rows (with live funnel stage) for specific users, e.g. to snapshot a stage.
  async rowsForUsers(ids: string[]): Promise<UserReportRow[]> {
    if (!ids.length) return [];
    return this.loadRows({ id: { in: ids } });
  }

  private async loadRows(where: Prisma.UserWhereInput): Promise<UserReportRow[]> {
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        profile: true,
        transactions: { select: { amount: true, status: true, createdAt: true } },
        couponRedemptions: { where: { confirmedAt: { not: null } }, include: { coupon: { select: { code: true } } } },
        crmLead: { select: { status: true, lastContactedAt: true } },
        _count: { select: { companyInterviewsAsStudent: true } },
      },
    });

    return users.map((u): UserReportRow => {
      const captured = u.transactions.filter((t) => t.status === 'captured');
      const stage = deriveStage({
        role: u.role,
        hasProfile: !!u.profile,
        profileComplete: !!u.profile?.isComplete,
        razorpaySubscriptionId: u.razorpaySubscriptionId,
        hasActiveSubscription: u.hasActiveSubscription,
        accessEndsAt: u.accessEndsAt,
        trialEndsAt: u.trialEndsAt,
        capturedPayments: captured.length,
        directCouponTrial: u.couponRedemptions.some((r) => !r.razorpaySubscriptionId),
      });
      const last = captured.reduce<Date | null>(
        (acc, t) => (!acc || t.createdAt > acc ? t.createdAt : acc),
        null,
      );
      return {
        id: u.id,
        name: u.profile?.fullName || u.name,
        email: u.email,
        role: u.role,
        authProvider: u.authProvider,
        registeredAt: u.createdAt.toISOString(),
        mobile: u.profile?.mobileNumber
          ? `${u.profile.countryCode ?? ''}${u.profile.mobileNumber}`
          : null,
        college: u.profile?.college ?? null,
        degree: u.profile?.degree ?? null,
        currentYear: u.profile?.currentYear ?? null,
        specialization: u.profile?.specialization ?? null,
        profileStarted: !!u.profile,
        profileComplete: !!u.profile?.isComplete,
        paymentInitiated: !!u.razorpaySubscriptionId || captured.length > 0,
        couponCode: u.couponRedemptions[0]?.coupon.code ?? null,
        trialEndsAt: u.trialEndsAt?.toISOString() ?? null,
        hasActiveSubscription: hasAccess(u),
        accessEndsAt: u.accessEndsAt?.toISOString() ?? null,
        paymentCount: captured.length,
        totalPaidInr: captured.reduce((sum, t) => sum + t.amount, 0) / 100,
        lastPaymentAt: last?.toISOString() ?? null,
        stage,
        stageLabel: STAGE_LABELS[stage],
        crmStatus: u.role === 'USER' ? (u.crmLead?.status ?? 'NEW') : null,
        lastContactedAt: u.crmLead?.lastContactedAt?.toISOString() ?? null,
        companyInterviews: u._count.companyInterviewsAsStudent,
      };
    });
  }

  async listUsers(filters: AnalyticsFilters, page = 1) {
    const rows = await this.buildRows(filters);
    const safePage = Math.max(1, Math.floor(page) || 1);
    return {
      total: rows.length,
      page: safePage,
      pageSize: PAGE_SIZE,
      rows: rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    };
  }

  private topCounts(values: (string | null)[], limit = 8) {
    const map = new Map<string, number>();
    for (const v of values) {
      if (v) map.set(v, (map.get(v) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([label, count]) => ({ label, count }));
  }

  async overview(filters: AnalyticsFilters) {
    const all = await this.buildRows({ from: filters.from, to: filters.to });
    const students = all.filter((r) => r.role === 'USER');

    const stageCounts = Object.fromEntries(
      [...FUNNEL_STAGES, 'NON_STUDENT'].map((s) => [s, all.filter((r) => r.stage === s).length]),
    );

    const converted = (r: UserReportRow) => r.paymentCount > 0 || r.hasActiveSubscription;
    const funnel = [
      { key: 'REGISTERED', label: 'Registered', count: students.length },
      { key: 'PROFILE_STARTED', label: 'Profile started', count: students.filter((r) => r.profileStarted).length },
      { key: 'PROFILE_COMPLETE', label: 'Profile complete', count: students.filter((r) => r.profileComplete).length },
      { key: 'PAYMENT_INITIATED', label: 'Payment initiated', count: students.filter((r) => r.paymentInitiated).length },
      { key: 'CONVERTED', label: 'Paid or in trial', count: students.filter(converted).length },
    ];

    const perDay = new Map<string, number>();
    for (const r of all) {
      const day = r.registeredAt.slice(0, 10);
      perDay.set(day, (perDay.get(day) ?? 0) + 1);
    }
    const signups = [...perDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    const redemptions = await this.prisma.coupon.findMany({
      orderBy: { redemptionCount: 'desc' },
      select: { code: true, redemptionCount: true, isActive: true },
    });

    return {
      totals: {
        users: all.length,
        students: students.length,
        otherRoles: all.length - students.length,
        revenueInr: all.reduce((s, r) => s + r.totalPaidInr, 0),
        activeSubscribers: all.filter((r) => r.hasActiveSubscription).length,
      },
      stageCounts,
      funnel,
      signups,
      byProvider: this.topCounts(all.map((r) => r.authProvider)),
      topColleges: this.topCounts(students.map((r) => r.college)),
      topDegrees: this.topCounts(students.map((r) => r.degree)),
      coupons: redemptions.map((c) => ({
        code: c.code,
        redemptions: c.redemptionCount,
        isActive: c.isActive,
      })),
    };
  }
}
