import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

function setup(coupon: any, alreadyRedeemed = false, claimCount = 1) {
  const tx: any = {
    coupon: { updateMany: jest.fn().mockResolvedValue({ count: claimCount }) },
    couponRedemption: { create: jest.fn().mockResolvedValue({ id: 'r1' }) },
  };
  const prisma: any = {
    coupon: { findUnique: jest.fn().mockResolvedValue(coupon) },
    couponRedemption: {
      findUnique: jest.fn().mockResolvedValue(alreadyRedeemed ? { id: 'x', confirmedAt: new Date() } : null),
    },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  return { service: new CouponsService(prisma), prisma, tx };
}

const base = { id: 'c1', code: 'FREE1', freeDays: 30, isActive: true, redemptionCount: 0, maxRedemptions: null, expiresAt: null };

describe('CouponsService', () => {
  it('validates a good coupon case-insensitively', async () => {
    const { service, prisma } = setup(base);
    await expect(service.validate('u1', ' free1 ')).resolves.toEqual({ valid: true, code: 'FREE1', freeDays: 30 });
    expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: 'FREE1' } });
  });

  it.each([
    ['unknown', null],
    ['inactive', { ...base, isActive: false }],
    ['expired', { ...base, expiresAt: past }],
    ['maxed out', { ...base, maxRedemptions: 5, redemptionCount: 5 }],
  ])('rejects %s coupon', async (_n, coupon) => {
    const { service } = setup(coupon);
    await expect(service.validate('u1', 'FREE1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a coupon that has not yet expired', async () => {
    const { service } = setup({ ...base, expiresAt: future });
    await expect(service.validate('u1', 'FREE1')).resolves.toMatchObject({ valid: true });
  });

  it('rejects a second use by the same user', async () => {
    const { service } = setup(base, true);
    await expect(service.validate('u1', 'FREE1')).rejects.toThrow('already used');
  });

  it('rejects only a confirmed prior use, not a pending claim', async () => {
    const { service, prisma } = setup(base);
    prisma.couponRedemption.findUnique.mockResolvedValue({ id: 'x', confirmedAt: null });
    await expect(service.validate('u1', 'FREE1')).resolves.toMatchObject({ valid: true });
  });

  it('confirm is a no-op without a pending claim', async () => {
    const { service, prisma } = setup(base);
    prisma.couponRedemption.findFirst = jest.fn().mockResolvedValue(null);
    await service.confirm('u1', 'sub_1');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('claim creates a pending row without touching the counter', async () => {
    const { service, prisma } = setup(base);
    prisma.couponRedemption.upsert = jest.fn().mockResolvedValue({ id: 'r1' });
    await expect(service.claim('u1', 'FREE1')).resolves.toEqual({ redemptionId: 'r1', freeDays: 30 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('confirm marks the claim used and increments once', async () => {
    const { service, prisma, tx } = setup(base);
    prisma.couponRedemption.findFirst = jest.fn().mockResolvedValue({ id: 'r1', couponId: 'c1' });
    (tx.couponRedemption as any).updateMany = jest.fn().mockResolvedValue({ count: 1 });
    (tx.coupon as any).update = jest.fn().mockResolvedValue({});
    await service.confirm('u1', 'sub_1');
    expect(tx.coupon.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { redemptionCount: { increment: 1 } },
    });
  });

  it('confirm is idempotent', async () => {
    const { service, prisma, tx } = setup(base);
    prisma.couponRedemption.findFirst = jest.fn().mockResolvedValue({ id: 'r1', couponId: 'c1' });
    (tx.couponRedemption as any).updateMany = jest.fn().mockResolvedValue({ count: 0 });
    (tx.coupon as any).update = jest.fn();
    await service.confirm('u1', 'sub_1');
    expect(tx.coupon.update).not.toHaveBeenCalled();
  });
});

describe('CouponsService soft delete', () => {
  it('remove marks deleted and inactive without deleting rows', async () => {
    const { service, prisma } = setup({ ...base, deletedAt: null });
    prisma.coupon.update = jest.fn().mockResolvedValue({});
    prisma.coupon.delete = jest.fn();
    await expect(service.remove('c1')).resolves.toEqual({ success: true });
    expect(prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { deletedAt: expect.any(Date), isActive: false },
    });
    expect(prisma.coupon.delete).not.toHaveBeenCalled();
  });

  it('a soft-deleted coupon is invalid', async () => {
    const { service } = setup({ ...base, deletedAt: new Date() });
    await expect(service.validate('u1', 'FREE1')).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CouponsService redeem', () => {
  function redeemSetup(coupon: any, user: any = { id: 'u1', hasActiveSubscription: false, accessEndsAt: null }) {
    const ctx = setup(coupon);
    ctx.prisma.user = { findUnique: jest.fn().mockResolvedValue(user) };
    Object.assign(ctx.tx, {
      coupon: { findUnique: jest.fn().mockResolvedValue(coupon), update: jest.fn().mockResolvedValue({}) },
      couponRedemption: { upsert: jest.fn().mockResolvedValue({ id: 'r1' }) },
      termsAcceptance: { create: jest.fn().mockResolvedValue({}) },
      user: { update: jest.fn().mockResolvedValue({}) },
    });
    return ctx;
  }

  it('grants access for freeDays without any payment', async () => {
    const { service, tx } = redeemSetup(base);
    const before = Date.now();
    const { accessEndsAt } = await service.redeem('u1', 'free1', 'v1');
    const days = (accessEndsAt.getTime() - before) / 86400000;
    expect(days).toBeGreaterThanOrEqual(30);
    expect(days).toBeLessThan(30.01);
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { hasActiveSubscription: true, trialEndsAt: accessEndsAt, accessEndsAt },
    });
    expect(tx.couponRedemption.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: { couponId: 'c1', userId: 'u1', confirmedAt: expect.any(Date) },
      update: { confirmedAt: expect.any(Date), razorpaySubscriptionId: null },
    }));
    expect(tx.coupon.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { redemptionCount: { increment: 1 } } });
    expect(tx.termsAcceptance.create).toHaveBeenCalledWith({ data: { userId: 'u1', version: 'v1', context: 'COUPON' } });
  });

  it('rejects a user who already has access', async () => {
    const { service, tx } = redeemSetup(base, { id: 'u1', hasActiveSubscription: true, accessEndsAt: null });
    await expect(service.redeem('u1', 'FREE1', 'v1')).rejects.toThrow('already have access');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('refuses the same coupon again after its period ended', async () => {
    const { service, prisma, tx } = redeemSetup(base, { id: 'u1', hasActiveSubscription: true, accessEndsAt: past });
    prisma.couponRedemption.findUnique.mockResolvedValue({ id: 'old', confirmedAt: past });
    await expect(service.redeem('u1', 'FREE1', 'v1')).rejects.toThrow('already used');
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('allows a different coupon after an earlier one ran out', async () => {
    const { service, tx } = redeemSetup(base, { id: 'u1', hasActiveSubscription: true, accessEndsAt: past });
    await expect(service.redeem('u1', 'FREE1', 'v1')).resolves.toHaveProperty('accessEndsAt');
    expect(tx.user.update).toHaveBeenCalled();
  });

  it('rejects when the cap filled up meanwhile', async () => {
    const { service, tx } = redeemSetup({ ...base, maxRedemptions: 5, redemptionCount: 4 });
    tx.coupon.findUnique.mockResolvedValue({ ...base, maxRedemptions: 5, redemptionCount: 5 });
    await expect(service.redeem('u1', 'FREE1', 'v1')).rejects.toThrow('no longer available');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
