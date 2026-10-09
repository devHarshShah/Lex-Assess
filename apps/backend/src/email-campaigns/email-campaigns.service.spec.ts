import { BadRequestException } from '@nestjs/common';
import { EmailCampaignsService } from './email-campaigns.service';

const row = (id: string, stage: string) => ({ id, email: `${id}@x.test`, name: id, stage, stageLabel: stage });

function build(over: { rows?: any[]; unsub?: string[]; redeemed?: string[]; recent?: string[] } = {}) {
  const prisma: any = {
    user: {
      findMany: jest.fn().mockResolvedValue((over.unsub ?? []).map((id) => ({ id }))),
      findUnique: jest.fn(),
    },
    couponRedemption: { findMany: jest.fn().mockResolvedValue((over.redeemed ?? []).map((userId) => ({ userId }))) },
    emailCampaignRecipient: {
      findMany: jest.fn().mockResolvedValue((over.recent ?? []).map((userId) => ({ userId }))),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    emailCampaign: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
    coupon: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const analytics: any = { buildRows: jest.fn().mockResolvedValue(over.rows ?? []) };
  const mail: any = { sendCampaignMail: jest.fn().mockResolvedValue({}) };
  const config: any = { get: jest.fn((k: string) => ({ FRONTEND_ORIGIN: 'https://lex.test,http://localhost:5173' })[k]), getOrThrow: () => 'secret' };
  return { svc: new EmailCampaignsService(prisma, analytics, mail, config), prisma, analytics, mail };
}

describe('EmailCampaignsService audience', () => {
  it('requires at least one stage', async () => {
    const { svc } = build();
    await expect(svc.resolveAudience({ stages: [] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.resolveAudience({ stages: ['BOGUS'] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('selects chosen stages and excludes unsubscribed, redeemed and recently-emailed students', async () => {
    const { svc, analytics } = build({
      rows: [row('a', 'REGISTERED'), row('b', 'REGISTERED'), row('c', 'REGISTERED'), row('d', 'REGISTERED'), row('e', 'PAID'), row('f', 'LAPSED')],
      unsub: ['b'],
      redeemed: ['c'],
      recent: ['d'],
    });
    const out = await svc.resolveAudience({ stages: ['REGISTERED', 'LAPSED'] }, 'coupon_1');
    expect(analytics.buildRows).toHaveBeenCalledWith({ role: 'USER', from: undefined, to: undefined });
    expect(out.eligible.map((r) => r.id)).toEqual(['a', 'f']);
    expect(out.excluded).toEqual({ unsubscribed: 1, alreadyRedeemed: 1, recentlyEmailed: 1 });
    expect(out.stageCounts).toEqual({ REGISTERED: 4, PAID: 1, LAPSED: 1 });
  });

  it('treats CRM "do not contact" students as unsubscribed', async () => {
    const { svc, prisma } = build({ rows: [row('a', 'REGISTERED')] });
    await svc.resolveAudience({ stages: ['REGISTERED'] });
    expect(prisma.user.findMany.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([{ crmLead: { status: 'DO_NOT_CONTACT' } }]),
    );
  });

  it('does not apply the redeemed exclusion without a coupon', async () => {
    const { svc, prisma } = build({ rows: [row('a', 'REGISTERED')], redeemed: ['a'] });
    const out = await svc.resolveAudience({ stages: ['REGISTERED'] });
    expect(prisma.couponRedemption.findMany).not.toHaveBeenCalled();
    expect(out.eligible).toHaveLength(1);
  });
});

describe('EmailCampaignsService content validation', () => {
  it('rejects coupon variables without a coupon and unknown variables', async () => {
    const { svc } = build();
    await expect(svc.renderPreview({ subject: 'Hi', bodyHtml: 'Use {{couponCode}}' })).rejects.toThrow(/needs a coupon/);
    await expect(svc.renderPreview({ subject: 'Hi {{typo}}', bodyHtml: 'x' })).rejects.toThrow(/Unknown variable/);
  });

  it('preview uses the first FRONTEND_ORIGIN and never leaks raw tokens', async () => {
    const { svc } = build();
    const out = await svc.renderPreview({ subject: 'Hi {{firstName}}', bodyHtml: 'Hello {{name}} [Go]({{dashboardUrl}})' });
    expect(out.subject).toBe('Hi Aarav');
    expect(out.html).toContain('https://lex.test/dashboard');
    expect(out.html).not.toContain('localhost');
  });
});

describe('EmailCampaignsService delivery', () => {
  const campaign = { id: 'c1', subject: 'Hi {{firstName}}', preheader: '', bodyHtml: '<p>x</p>' };

  it('marks a recipient SENT after a successful send', async () => {
    const { svc, prisma, mail } = build();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u1@x.test', name: 'Asha K', trialEndsAt: null, accessEndsAt: null, profile: null, marketingUnsubscribedAt: null });
    const out = await (svc as any).deliver(campaign, null, { id: 'r1', userId: 'u1', email: 'u1@x.test', attempts: 1 });
    expect(out).toBe('sent');
    expect(mail.sendCampaignMail.mock.calls[0][1].subject).toBe('Hi Asha');
    expect(prisma.emailCampaignRecipient.update.mock.calls[0][0].data.status).toBe('SENT');
  });

  it('skips someone who unsubscribed after the campaign was queued', async () => {
    const { svc, prisma, mail } = build();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u1@x.test', name: 'A', profile: null, marketingUnsubscribedAt: new Date() });
    const out = await (svc as any).deliver(campaign, null, { id: 'r1', userId: 'u1', email: 'u1@x.test', attempts: 1 });
    expect(out).toBe('skipped');
    expect(mail.sendCampaignMail).not.toHaveBeenCalled();
  });

  it('requeues with backoff on early failures and fails after the last attempt', async () => {
    const { svc, prisma, mail } = build();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'u1@x.test', name: 'A', trialEndsAt: null, accessEndsAt: null, profile: null, marketingUnsubscribedAt: null });
    mail.sendCampaignMail.mockRejectedValue(new Error('smtp down'));

    expect(await (svc as any).deliver(campaign, null, { id: 'r1', userId: 'u1', email: 'e', attempts: 1 })).toBe('retrying');
    const retry = prisma.emailCampaignRecipient.update.mock.calls[0][0].data;
    expect(retry.status).toBe('PENDING');
    expect(retry.leasedUntil.getTime()).toBeGreaterThan(Date.now());

    expect(await (svc as any).deliver(campaign, null, { id: 'r1', userId: 'u1', email: 'e', attempts: 3 })).toBe('failed');
    expect(prisma.emailCampaignRecipient.update.mock.calls[1][0].data).toMatchObject({ status: 'FAILED', error: 'smtp down' });
  });

  it('processBatch sends claimed rows once, stops at the batch size and completes the campaign', async () => {
    const { svc, prisma, mail } = build();
    prisma.emailCampaign.findMany.mockResolvedValue([{ ...campaign, status: 'QUEUED', couponId: null }]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'r1', userId: 'u1', email: 'a@x.test', attempts: 1 }, { id: 'r2', userId: 'u2', email: 'b@x.test', attempts: 1 }])
      .mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue({ id: 'u', email: 'a@x.test', name: 'A', trialEndsAt: null, accessEndsAt: null, profile: null, marketingUnsubscribedAt: null });
    const out = await svc.processBatch({ budgetMs: 5000, batchSize: 10 });
    expect(out.sent).toBe(2);
    expect(mail.sendCampaignMail).toHaveBeenCalledTimes(2);
    expect(prisma.emailCampaign.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DONE' }) }));
  });

  it('sends nothing once the hourly cap is used, and trims batches to the room left', async () => {
    const { svc, prisma, mail } = build();
    prisma.emailCampaign.findMany.mockResolvedValue([{ ...campaign, status: 'SENDING', couponId: null }]);
    // hour count 40 (cap 40), day count 40
    prisma.emailCampaignRecipient.count.mockResolvedValue(40);
    expect(await svc.processBatch({ budgetMs: 5000 })).toEqual({ sent: 0, failed: 0, retrying: 0, skipped: 0 });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(mail.sendCampaignMail).not.toHaveBeenCalled();

    // 38 sent this hour -> room for 2, even with a bigger batch size requested
    prisma.emailCampaignRecipient.count.mockResolvedValue(38);
    expect(await svc.remainingQuota()).toBe(2);
  });

  it('daily cap wins over the hourly cap', async () => {
    const { svc, prisma } = build();
    prisma.emailCampaignRecipient.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.sentAt.gte.getTime() > Date.now() - 4_000_000 ? 0 : 249),
    );
    expect(await svc.remainingQuota()).toBe(1);
  });
});

describe('computeCampaignMetrics', () => {
  const { computeCampaignMetrics } = require('./campaign-metrics');
  const sent = new Date('2026-10-01T00:00:00Z');
  const later = new Date('2026-10-02T00:00:00Z');
  const earlier = new Date('2026-09-30T00:00:00Z');

  it('counts advancement, paid conversion, revenue, coupons and unsubscribes after send', () => {
    const m = computeCampaignMetrics({
      recipients: [
        { userId: 'a', sentAt: sent, stageAtSend: 'PROFILE_COMPLETE' },
        { userId: 'b', sentAt: sent, stageAtSend: 'PROFILE_STARTED' },
        { userId: 'c', sentAt: sent, stageAtSend: 'REGISTERED' },
        { userId: 'd', sentAt: sent, stageAtSend: null },
      ],
      currentStage: new Map([['a', 'PAID'], ['b', 'PROFILE_COMPLETE'], ['c', 'REGISTERED'], ['d', 'PAID']]),
      payments: [
        { userId: 'a', amount: 49900, createdAt: later },
        { userId: 'a', amount: 10000, createdAt: earlier },
      ],
      couponRedemptions: [{ userId: 'a', confirmedAt: later }],
      unsubscribes: [{ userId: 'c', at: later }, { userId: 'b', at: earlier }],
    });
    expect(m).toMatchObject({ sent: 4, tracked: 3, advanced: 2, converted: 1, paidAfterSend: 1, revenueInr: 499, couponRedemptions: 1, unsubscribes: 1 });
    expect(m.advancedPct).toBe(66.7);
  });
});

describe('estimateStageAtSend', () => {
  const { estimateStageAtSend } = require('./stage-backfill');
  const sentAt = new Date('2026-10-01T00:00:00Z');
  const before = new Date('2026-09-20T00:00:00Z');
  const after = new Date('2026-10-05T00:00:00Z');
  const base = { sentAt, userCreatedAt: before, profile: null, firstCapturedAt: null, redemption: null };

  it('is exact for a single-stage audience', () => {
    expect(estimateStageAtSend({ ...base, audienceStages: ['REGISTERED'], firstCapturedAt: after })).toEqual({ stage: 'REGISTERED', estimated: false });
  });

  it('reads the stage from timestamps and clamps to the audience', () => {
    const stages = ['PROFILE_STARTED', 'PROFILE_COMPLETE'];
    const done = { createdAt: before, updatedAt: before, isComplete: true };
    expect(estimateStageAtSend({ ...base, audienceStages: stages, profile: done })).toEqual({ stage: 'PROFILE_COMPLETE', estimated: true });
    expect(estimateStageAtSend({ ...base, audienceStages: stages, profile: { ...done, updatedAt: after } })).toEqual({ stage: 'PROFILE_STARTED', estimated: true });
    // payment after send is ignored; REGISTERED isn't targeted so it clamps to the nearest
    expect(estimateStageAtSend({ ...base, audienceStages: stages, firstCapturedAt: after })).toEqual({ stage: 'PROFILE_STARTED', estimated: true });
  });
});
