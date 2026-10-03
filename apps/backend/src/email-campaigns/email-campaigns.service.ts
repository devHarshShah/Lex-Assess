import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { FUNNEL_STAGES, STAGE_LABELS, type FunnelStage, type UserReportRow } from '../analytics/analytics.types';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { computeCampaignMetrics } from './campaign-metrics';
import { renderCampaignEmail } from './render';
import { sanitizeBody } from './sanitize';
import { BUILT_IN_TEMPLATES } from './templates';
import { signUnsubscribeToken } from './unsubscribe-token';
import { CAMPAIGN_VARIABLES, checkVariables, sampleValues } from './variables';

export interface AudienceSpec {
  stages: string[];
  from?: string;
  to?: string;
  // Don't email students who already redeemed the chosen coupon (default on)
  skipRedeemedCoupon?: boolean;
  // Don't email students any campaign reached in the last N days (default 3, 0 = off)
  skipRecentDays?: number;
}

export interface CampaignInput {
  name?: string;
  templateKey?: string;
  subject?: string;
  preheader?: string;
  bodyHtml?: string;
  couponId?: string | null;
  audience?: AudienceSpec;
}

const MAX_ATTEMPTS = 3;
const LEASE_MS = 5 * 60 * 1000;
const RETRY_BACKOFF_MS = 2 * 60 * 1000;
const CLAIM_CHUNK = 10;
const CONCURRENCY = 5;
// Superadmin test sends always go to this address, not the admin's own inbox.
const TEST_EMAIL_RECIPIENT = 'harshdipashah@gmail.com';

const formatDate = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(d) : '';

@Injectable()
export class EmailCampaignsService {
  private readonly logger = new Logger(EmailCampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // ---- config helpers -------------------------------------------------------------------

  private get frontendOrigin(): string {
    // FRONTEND_ORIGIN may be a comma-separated list; the first one is the public site
    const first = (this.config.get<string>('FRONTEND_ORIGIN') || 'http://localhost:5173').split(',')[0]!.trim();
    return first.replace(/\/$/, '');
  }

  private get secret(): string {
    return this.config.getOrThrow<string>('JWT_SECRET');
  }

  private unsubscribeLinks(userId: string) {
    const token = signUnsubscribeToken(userId, this.secret);
    const api = this.config.get<string>('API_PUBLIC_URL')?.replace(/\/$/, '');
    return {
      url: `${this.frontendOrigin}/unsubscribe?token=${token}`,
      oneClickUrl: api ? `${api}/email/unsubscribe?token=${token}` : undefined,
    };
  }

  // ---- meta -----------------------------------------------------------------------------

  getMeta() {
    return {
      stages: FUNNEL_STAGES.map((key) => ({ key, label: STAGE_LABELS[key] })),
      variables: CAMPAIGN_VARIABLES,
      templates: BUILT_IN_TEMPLATES,
    };
  }

  // ---- content --------------------------------------------------------------------------

  private async loadCoupon(couponId?: string | null) {
    if (!couponId) return null;
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon || coupon.deletedAt) throw new BadRequestException('That coupon no longer exists');
    return coupon;
  }

  private prepareContent(input: CampaignInput, hasCoupon: boolean) {
    const subject = (input.subject ?? '').trim();
    const preheader = (input.preheader ?? '').trim();
    const rawBody = (input.bodyHtml ?? '').trim();
    if (!subject) throw new BadRequestException('Subject is required');
    if (subject.length > 200) throw new BadRequestException('Subject is too long (max 200 characters)');
    if (preheader.length > 200) throw new BadRequestException('Preview text is too long (max 200 characters)');
    if (!rawBody) throw new BadRequestException('Email body is required');
    if (rawBody.length > 100_000) throw new BadRequestException('Email body is too long');
    const bodyHtml = sanitizeBody(rawBody);
    if (!bodyHtml) throw new BadRequestException('Email body is empty after removing unsupported content');
    const problems = checkVariables([subject, preheader, bodyHtml], hasCoupon);
    if (problems.length) throw new BadRequestException(problems.join('. '));
    return { subject, preheader, bodyHtml };
  }

  private valuesFor(
    user: { email: string; name: string; trialEndsAt: Date | null; accessEndsAt: Date | null; profile: { fullName: string; college: string } | null },
    coupon: { code: string; freeDays: number; expiresAt: Date | null } | null,
  ): Record<string, string> {
    const fullName = (user.profile?.fullName || user.name || '').trim();
    const origin = this.frontendOrigin;
    const fallbacks = Object.fromEntries(CAMPAIGN_VARIABLES.map((v) => [v.key, v.fallback]));
    const filled: Record<string, string> = {
      name: fullName,
      firstName: fullName.split(/\s+/)[0] ?? '',
      email: user.email,
      college: user.profile?.college ?? '',
      couponCode: coupon?.code ?? '',
      couponFreeDays: coupon ? String(coupon.freeDays) : '',
      couponExpiry: formatDate(coupon?.expiresAt),
      subscribeUrl: `${origin}/dashboard`,
      profileUrl: `${origin}/dashboard/setup`,
      dashboardUrl: `${origin}/dashboard`,
      trialEndsAt: formatDate(user.trialEndsAt),
      accessEndsAt: formatDate(user.accessEndsAt),
    };
    for (const key of Object.keys(filled)) if (!filled[key]) filled[key] = fallbacks[key] ?? '';
    return filled;
  }

  // What the admin sees in the preview pane: the exact production render with sample data.
  async renderPreview(input: CampaignInput) {
    const coupon = await this.loadCoupon(input.couponId);
    const content = this.prepareContent(input, !!coupon);
    const values = {
      ...sampleValues(),
      ...(coupon ? { couponCode: coupon.code, couponFreeDays: String(coupon.freeDays), couponExpiry: formatDate(coupon.expiresAt) || 'for a limited time' } : {}),
      subscribeUrl: `${this.frontendOrigin}/dashboard`,
      profileUrl: `${this.frontendOrigin}/dashboard/setup`,
      dashboardUrl: `${this.frontendOrigin}/dashboard`,
    };
    return renderCampaignEmail({ ...content, values, unsubscribeUrl: '#', frontendOrigin: this.frontendOrigin });
  }

  async sendTest(input: CampaignInput, adminId: string) {
    const admin = await this.prisma.user.findUnique({ where: { id: adminId }, include: { profile: true } });
    if (!admin) throw new NotFoundException('User not found');
    const coupon = await this.loadCoupon(input.couponId);
    const content = this.prepareContent(input, !!coupon);
    const links = this.unsubscribeLinks(admin.id);
    const mail = renderCampaignEmail({
      ...content,
      values: this.valuesFor(admin, coupon),
      unsubscribeUrl: links.url,
      frontendOrigin: this.frontendOrigin,
    });
    await this.mail.sendCampaignMail(TEST_EMAIL_RECIPIENT, { ...mail, subject: `[TEST] ${mail.subject}` }, links);
    return { sentTo: TEST_EMAIL_RECIPIENT };
  }

  // ---- audience -------------------------------------------------------------------------

  private validateAudience(spec: AudienceSpec | undefined, allowEmpty = false): Required<Pick<AudienceSpec, 'stages'>> & AudienceSpec {
    const stages = (spec?.stages ?? []).filter((s): s is FunnelStage => (FUNNEL_STAGES as readonly string[]).includes(s));
    if (!stages.length && !allowEmpty) throw new BadRequestException('Pick at least one student group to email');
    const recent = spec?.skipRecentDays ?? 3;
    if (!Number.isFinite(recent) || recent < 0 || recent > 365) throw new BadRequestException('Invalid "recently emailed" setting');
    return { ...spec, stages, skipRecentDays: Math.floor(recent), skipRedeemedCoupon: spec?.skipRedeemedCoupon ?? true };
  }

  async resolveAudience(specInput: AudienceSpec | undefined, couponId?: string | null, allowEmpty = false) {
    const spec = this.validateAudience(specInput, allowEmpty);
    const rows = await this.analytics.buildRows({ role: 'USER', from: spec.from, to: spec.to });

    const stageCounts: Record<string, number> = {};
    for (const r of rows) stageCounts[r.stage] = (stageCounts[r.stage] ?? 0) + 1;

    const inStages = rows.filter((r) => spec.stages.includes(r.stage));
    const ids = inStages.map((r) => r.id);
    const excluded = { unsubscribed: 0, alreadyRedeemed: 0, recentlyEmailed: 0 };

    const [unsub, redeemed, recent] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: ids }, marketingUnsubscribedAt: { not: null } }, select: { id: true } }),
      spec.skipRedeemedCoupon && couponId
        ? this.prisma.couponRedemption.findMany({ where: { couponId, userId: { in: ids }, confirmedAt: { not: null } }, select: { userId: true } })
        : Promise.resolve([] as { userId: string }[]),
      spec.skipRecentDays
        ? this.prisma.emailCampaignRecipient.findMany({
            where: { userId: { in: ids }, status: 'SENT', sentAt: { gte: new Date(Date.now() - spec.skipRecentDays * 86_400_000) } },
            select: { userId: true },
            distinct: ['userId'],
          })
        : Promise.resolve([] as { userId: string }[]),
    ]);
    const unsubSet = new Set(unsub.map((u) => u.id));
    const redeemedSet = new Set(redeemed.map((u) => u.userId));
    const recentSet = new Set(recent.map((u) => u.userId));

    const eligible: UserReportRow[] = [];
    for (const r of inStages) {
      if (unsubSet.has(r.id)) excluded.unsubscribed++;
      else if (redeemedSet.has(r.id)) excluded.alreadyRedeemed++;
      else if (recentSet.has(r.id)) excluded.recentlyEmailed++;
      else eligible.push(r);
    }
    return { spec, eligible, excluded, matched: inStages.length, stageCounts };
  }

  async previewAudience(input: CampaignInput) {
    const { eligible, excluded, matched, stageCounts } = await this.resolveAudience(input.audience, input.couponId, true);
    return {
      recipientCount: eligible.length,
      matched,
      excluded,
      stageCounts,
      sample: eligible.slice(0, 10).map((r) => ({ name: r.name, email: r.email, stageLabel: r.stageLabel })),
    };
  }

  // ---- campaigns ------------------------------------------------------------------------

  async createCampaign(input: CampaignInput, adminId: string) {
    const coupon = await this.loadCoupon(input.couponId);
    if (coupon && !coupon.isActive) throw new BadRequestException('That coupon is switched off — activate it first');
    if (coupon?.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('That coupon has already expired');
    const content = this.prepareContent(input, !!coupon);
    const { spec, eligible } = await this.resolveAudience(input.audience, coupon?.id);
    if (!eligible.length) throw new BadRequestException('No students match this audience, so nothing would be sent');

    // Guards against a double-click or a second tab sending the same mail twice
    const dupe = await this.prisma.emailCampaign.findFirst({
      where: { subject: content.subject, status: { not: 'CANCELLED' }, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } },
      select: { id: true },
    });
    if (dupe) throw new BadRequestException('A campaign with this subject was just created. Check the Campaigns tab before sending again.');

    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.emailCampaign.create({
        data: {
          name: (input.name ?? '').trim() || content.subject,
          templateKey: input.templateKey ?? null,
          ...content,
          audience: spec as unknown as Prisma.InputJsonValue,
          couponId: coupon?.id ?? null,
          createdById: adminId,
        },
      });
      await tx.emailCampaignRecipient.createMany({
        data: eligible.map((r) => ({ campaignId: created.id, userId: r.id, email: r.email, stageAtSend: r.stage })),
        skipDuplicates: true,
      });
      return created;
    });

    // Start straight away; the scheduled worker carries on if there is more than one batch
    this.processBatch({ budgetMs: 20_000, batchSize: 20 }).catch((e) => this.logger.error('Initial batch failed', e as Error));
    return { id: campaign.id, recipientCount: eligible.length };
  }

  private async countsFor(campaignIds: string[]) {
    const groups = await this.prisma.emailCampaignRecipient.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true },
    });
    const map = new Map<string, Record<string, number>>();
    for (const g of groups) {
      const c = map.get(g.campaignId) ?? { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 };
      c[g.status] = g._count._all;
      map.set(g.campaignId, c);
    }
    return (id: string) => {
      const c = map.get(id) ?? { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 };
      return { ...c, total: Object.values(c).reduce((a, b) => a + b, 0) };
    };
  }

  async listCampaigns() {
    const campaigns = await this.prisma.emailCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, name: true, subject: true, status: true, templateKey: true, couponId: true, createdAt: true, completedAt: true, audience: true },
    });
    const counts = await this.countsFor(campaigns.map((c) => c.id));
    return campaigns.map((c) => ({ ...c, counts: counts(c.id) }));
  }

  async getCampaign(id: string, status?: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const counts = await this.countsFor([id]);
    const recipients = await this.prisma.emailCampaignRecipient.findMany({
      where: { campaignId: id, ...(status ? { status: status as never } : {}) },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 200,
      select: { id: true, email: true, status: true, attempts: true, error: true, sentAt: true },
    });
    return { ...campaign, counts: counts(id), recipients };
  }

  // Did the students we emailed move forward afterwards? Compares the stage snapshotted when the
  // campaign was queued with their stage now; payments/coupons/unsubscribes only count after sentAt.
  async getMetrics(id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id }, select: { couponId: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    const sent = await this.prisma.emailCampaignRecipient.findMany({
      where: { campaignId: id, status: 'SENT', sentAt: { not: null } },
      select: { userId: true, sentAt: true, stageAtSend: true, stageEstimated: true },
    });
    const recipients = sent.map((r) => ({ userId: r.userId, sentAt: r.sentAt as Date, stageAtSend: r.stageAtSend, stageEstimated: r.stageEstimated }));
    const ids = recipients.map((r) => r.userId);
    const firstSent = recipients.reduce<Date | null>((min, r) => (!min || r.sentAt < min ? r.sentAt : min), null);

    const [rows, payments, redemptions, unsubs] = await Promise.all([
      this.analytics.buildRows({ role: 'USER' }),
      firstSent
        ? this.prisma.transaction.findMany({ where: { userId: { in: ids }, status: 'captured', createdAt: { gte: firstSent } }, select: { userId: true, amount: true, createdAt: true } })
        : Promise.resolve([]),
      firstSent && campaign.couponId
        ? this.prisma.couponRedemption.findMany({ where: { couponId: campaign.couponId, userId: { in: ids }, confirmedAt: { not: null } }, select: { userId: true, confirmedAt: true } })
        : Promise.resolve([]),
      this.prisma.user.findMany({ where: { id: { in: ids }, marketingUnsubscribedAt: { not: null } }, select: { id: true, marketingUnsubscribedAt: true } }),
    ]);

    return {
      hasCoupon: !!campaign.couponId,
      ...computeCampaignMetrics({
        recipients,
        currentStage: new Map(rows.map((r) => [r.id, r.stage])),
        payments,
        couponRedemptions: redemptions.map((c) => ({ userId: c.userId, confirmedAt: c.confirmedAt as Date })),
        unsubscribes: unsubs.map((u) => ({ userId: u.id, at: u.marketingUnsubscribedAt as Date })),
      }),
    };
  }

  async cancel(id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id }, select: { status: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === 'DONE' || campaign.status === 'CANCELLED') throw new BadRequestException('This campaign has already finished');
    await this.prisma.$transaction([
      this.prisma.emailCampaign.update({ where: { id }, data: { status: 'CANCELLED', completedAt: new Date() } }),
      this.prisma.emailCampaignRecipient.updateMany({
        where: { campaignId: id, status: 'PENDING' },
        data: { status: 'SKIPPED', error: 'Campaign cancelled' },
      }),
    ]);
    return { ok: true };
  }

  async retryFailed(id: string) {
    const campaign = await this.prisma.emailCampaign.findUnique({ where: { id }, select: { status: true } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status === 'CANCELLED') throw new BadRequestException('A cancelled campaign cannot be retried');
    const { count } = await this.prisma.emailCampaignRecipient.updateMany({
      where: { campaignId: id, status: 'FAILED' },
      data: { status: 'PENDING', attempts: 0, error: null, leasedUntil: null },
    });
    if (count) await this.prisma.emailCampaign.update({ where: { id }, data: { status: 'QUEUED', completedAt: null } });
    return { requeued: count };
  }

  // ---- worker ---------------------------------------------------------------------------

  // Sends up to batchSize queued mails within the time budget. Safe to run concurrently
  // (rows are claimed with SKIP LOCKED) and safe to run after a crash (leases expire).
  async processBatch(opts: { budgetMs?: number; batchSize?: number } = {}) {
    const deadline = Date.now() + (opts.budgetMs ?? 45_000);
    const configured = opts.batchSize ?? Number(this.config.get('EMAIL_BATCH_SIZE') ?? 40);
    const result = { sent: 0, failed: 0, retrying: 0, skipped: 0 };

    // The mailbox has hourly/daily send limits shared with account emails (password reset etc.)
    const batchSize = Math.min(configured, await this.remainingQuota());
    if (batchSize <= 0) return result;

    const campaigns = await this.prisma.emailCampaign.findMany({
      where: { status: { in: ['QUEUED', 'SENDING'] } },
      orderBy: { createdAt: 'asc' },
    });

    let remaining = batchSize;
    for (const campaign of campaigns) {
      if (campaign.status === 'QUEUED') {
        await this.prisma.emailCampaign.updateMany({ where: { id: campaign.id, status: 'QUEUED' }, data: { status: 'SENDING', startedAt: new Date() } });
      }
      const coupon = await this.loadCoupon(campaign.couponId).catch(() => null);

      while (remaining > 0 && Date.now() < deadline) {
        const claimed = await this.claim(campaign.id, Math.min(CLAIM_CHUNK, remaining));
        if (!claimed.length) break;
        remaining -= claimed.length;
        for (let i = 0; i < claimed.length; i += CONCURRENCY) {
          const outcomes = await Promise.all(claimed.slice(i, i + CONCURRENCY).map((r) => this.deliver(campaign, coupon, r)));
          for (const o of outcomes) result[o]++;
        }
      }
    }

    await this.finishCompleted(campaigns.map((c) => c.id));
    return result;
  }

  // How many more campaign mails may go out right now without breaking the hourly/daily caps.
  // Rolling windows over what we actually sent; caps are set below the provider's real limits.
  async remainingQuota(): Promise<number> {
    const perHour = Number(this.config.get('EMAIL_MAX_PER_HOUR') ?? 40);
    const perDay = Number(this.config.get('EMAIL_MAX_PER_DAY') ?? 250);
    const now = Date.now();
    const [hour, day] = await Promise.all([
      this.prisma.emailCampaignRecipient.count({ where: { status: 'SENT', sentAt: { gte: new Date(now - 3_600_000) } } }),
      this.prisma.emailCampaignRecipient.count({ where: { status: 'SENT', sentAt: { gte: new Date(now - 86_400_000) } } }),
    ]);
    return Math.max(0, Math.min(perHour - hour, perDay - day));
  }

  private claim(campaignId: string, limit: number) {
    return this.prisma.$queryRaw<{ id: string; userId: string; email: string; attempts: number }[]>`
      UPDATE "EmailCampaignRecipient"
      SET "status" = 'SENDING', "leasedUntil" = ${new Date(Date.now() + LEASE_MS)}, "attempts" = "attempts" + 1
      WHERE "id" IN (
        SELECT "id" FROM "EmailCampaignRecipient"
        WHERE "campaignId" = ${campaignId}
          AND (
            ("status" = 'PENDING' AND ("leasedUntil" IS NULL OR "leasedUntil" < now()))
            OR ("status" = 'SENDING' AND "leasedUntil" < now())
          )
        ORDER BY "createdAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "userId", "email", "attempts"`;
  }

  private async deliver(
    campaign: { id: string; subject: string; preheader: string; bodyHtml: string },
    coupon: { code: string; freeDays: number; expiresAt: Date | null } | null,
    recipient: { id: string; userId: string; email: string; attempts: number },
  ): Promise<'sent' | 'failed' | 'retrying' | 'skipped'> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: recipient.userId }, include: { profile: true } });
      // Re-check at send time: they may have unsubscribed after the campaign was queued
      if (!user || user.marketingUnsubscribedAt) {
        await this.prisma.emailCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'SKIPPED', error: user ? 'Unsubscribed' : 'User no longer exists', leasedUntil: null },
        });
        return 'skipped';
      }
      const links = this.unsubscribeLinks(user.id);
      const mail = renderCampaignEmail({
        subject: campaign.subject,
        preheader: campaign.preheader,
        bodyHtml: campaign.bodyHtml,
        values: this.valuesFor(user, coupon),
        unsubscribeUrl: links.url,
        frontendOrigin: this.frontendOrigin,
      });
      await this.mail.sendCampaignMail(user.email, mail, links);
      await this.prisma.emailCampaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'SENT', sentAt: new Date(), error: null, leasedUntil: null },
      });
      return 'sent';
    } catch (e) {
      const final = recipient.attempts >= MAX_ATTEMPTS;
      await this.prisma.emailCampaignRecipient
        .update({
          where: { id: recipient.id },
          data: {
            status: final ? 'FAILED' : 'PENDING',
            error: String((e as Error)?.message ?? e).slice(0, 300),
            leasedUntil: final ? null : new Date(Date.now() + RETRY_BACKOFF_MS),
          },
        })
        .catch((err) => this.logger.error('Could not record send failure', err as Error));
      return final ? 'failed' : 'retrying';
    }
  }

  private async finishCompleted(campaignIds: string[]) {
    for (const id of campaignIds) {
      const open = await this.prisma.emailCampaignRecipient.count({ where: { campaignId: id, status: { in: ['PENDING', 'SENDING'] } } });
      if (open === 0) {
        await this.prisma.emailCampaign.updateMany({ where: { id, status: { in: ['QUEUED', 'SENDING'] } }, data: { status: 'DONE', completedAt: new Date() } });
      }
    }
  }
}
