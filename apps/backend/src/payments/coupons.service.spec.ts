import { BadRequestException } from '@nestjs/common';
import { CouponsService } from './coupons.service';

const future = new Date(Date.now() + 86400000);
const past = new Date(Date.now() - 86400000);

function setup(coupon: any, alreadyRedeemed = false, claimCount = 1) {
  const tx = {
    coupon: { updateMany: jest.fn().mockResolvedValue({ count: claimCount }) },
    couponRedemption: { create: jest.fn().mockResolvedValue({ id: 'r1' }) },
  };
  const prisma: any = {
    coupon: { findUnique: jest.fn().mockResolvedValue(coupon) },
    couponRedemption: {
      findUnique: jest.fn().mockResolvedValue(alreadyRedeemed ? { id: 'x' } : null),
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

  it('redeem claims atomically and returns freeDays', async () => {
    const { service, tx } = setup({ ...base, maxRedemptions: 5 });
    await expect(service.redeem('u1', 'FREE1')).resolves.toEqual({ redemptionId: 'r1', freeDays: 30 });
    expect(tx.coupon.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ redemptionCount: { lt: 5 } }) }),
    );
  });

  it('redeem fails when a concurrent request took the last slot', async () => {
    const { service, tx } = setup({ ...base, maxRedemptions: 1 }, false, 0);
    await expect(service.redeem('u1', 'FREE1')).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.couponRedemption.create).not.toHaveBeenCalled();
  });
});
