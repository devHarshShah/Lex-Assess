import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { deriveStage } from '../analytics/analytics.service';
import { CouponsService } from './coupons.service';
import { PaymentsService } from './payments.service';

const DAY = 86400000;
const paidCoupon = {
  id: 'c1', code: 'LAW199', freeDays: 90, pricePaise: 19900, isActive: true, deletedAt: null,
  redemptionCount: 0, maxRedemptions: null, expiresAt: null,
};
const noAccess = { id: 'u1', hasActiveSubscription: false, accessEndsAt: null };

function couponsSetup(opts: { coupon?: any; user?: any; redemption?: any } = {}) {
  const tx: any = {
    couponRedemption: {
      findUnique: jest.fn().mockResolvedValue(
        opts.redemption === undefined
          ? { id: 'r1', userId: 'u1', couponId: 'c1', coupon: { code: 'LAW199', freeDays: 90 } }
          : opts.redemption,
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    coupon: { update: jest.fn().mockResolvedValue({}) },
    user: { update: jest.fn().mockResolvedValue({}) },
    transaction: { upsert: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(opts.user ?? noAccess) },
    coupon: { findUnique: jest.fn().mockResolvedValue(opts.coupon ?? paidCoupon) },
    couponRedemption: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'r1' }),
    },
    termsAcceptance: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  return { coupons: new CouponsService(prisma), prisma, tx };
}

describe('Paid coupons: CouponsService', () => {
  it('validate returns the one-time price', async () => {
    const { coupons } = couponsSetup();
    await expect(coupons.validate('u1', 'law199')).resolves.toMatchObject({ code: 'LAW199', freeDays: 90, pricePaise: 19900 });
  });

  it('the free redeem path refuses a paid coupon', async () => {
    const { coupons } = couponsSetup();
    await expect(coupons.redeem('u1', 'LAW199', 'v1')).rejects.toThrow('requires payment');
  });

  it('refuses students who already have access', async () => {
    const { coupons } = couponsSetup({ user: { id: 'u1', hasActiveSubscription: true, accessEndsAt: null } });
    await expect(coupons.preparePaidRedemption('u1', 'LAW199', 'v1')).rejects.toThrow('already have access');
  });

  it('refuses a free coupon on the paid path', async () => {
    const { coupons } = couponsSetup({ coupon: { ...paidCoupon, pricePaise: null } });
    await expect(coupons.preparePaidRedemption('u1', 'LAW199', 'v1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirm grants access for the coupon days, records the payment and counts once', async () => {
    const { coupons, tx } = couponsSetup();
    const before = Date.now();
    const res = await coupons.confirmPaidRedemption('order_1', { id: 'pay_1', amount: 19900, currency: 'INR', status: 'captured' });
    expect(res.granted).toBe(true);
    const update = tx.user.update.mock.calls[0][0].data;
    expect(update).toMatchObject({ hasActiveSubscription: true, trialEndsAt: null });
    expect(Math.round((update.accessEndsAt.getTime() - before) / DAY)).toBe(90);
    expect(tx.coupon.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { redemptionCount: { increment: 1 } } });
    expect(tx.transaction.upsert.mock.calls[0][0].create).toMatchObject({
      userId: 'u1', amount: 19900, status: 'captured', razorpayPaymentId: 'pay_1', razorpayOrderId: 'order_1',
    });
    expect(tx.transaction.upsert.mock.calls[0][0].create.razorpaySubscriptionId).toBeUndefined();
  });

  it('confirm is idempotent (webhook + client verification both fire)', async () => {
    const { coupons, tx } = couponsSetup();
    tx.couponRedemption.updateMany.mockResolvedValue({ count: 0 });
    const res = await coupons.confirmPaidRedemption('order_1', { id: 'pay_1', amount: 19900, currency: 'INR', status: 'captured' });
    expect(res).toMatchObject({ granted: false, reason: 'already-confirmed' });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.coupon.update).not.toHaveBeenCalled();
  });

  it('confirm ignores orders it does not know', async () => {
    const { coupons, tx } = couponsSetup({ redemption: null });
    await expect(
      coupons.confirmPaidRedemption('order_x', { id: 'pay_1', amount: 1, currency: 'INR', status: 'captured' }),
    ).resolves.toMatchObject({ granted: false, reason: 'unknown-order' });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});

describe('Paid coupons: PaymentsService', () => {
  const env: Record<string, string> = { RAZORPAY_KEY_ID: 'rzp_test_x', RAZORPAY_KEY_SECRET: 'key_secret', RAZORPAY_WEBHOOK_SECRET: 'wh_secret' };
  const config: any = { get: (k: string) => env[k], getOrThrow: (k: string) => env[k] };

  function paymentsSetup() {
    const coupons: any = {
      preparePaidRedemption: jest.fn().mockResolvedValue({ coupon: { id: 'c1', code: 'LAW199', freeDays: 90, pricePaise: 19900 } }),
      attachOrder: jest.fn().mockResolvedValue({}),
      findRedemptionByOrder: jest.fn().mockResolvedValue({ id: 'r1', userId: 'u1' }),
      confirmPaidRedemption: jest.fn().mockResolvedValue({ granted: true }),
    };
    const prisma: any = { webhookEvent: { create: jest.fn().mockResolvedValue({}) } };
    const svc = new PaymentsService(config, prisma, coupons, {} as any);
    const razorpay = {
      orders: { create: jest.fn().mockResolvedValue({ id: 'order_1' }) },
      payments: {
        fetch: jest.fn().mockResolvedValue({ id: 'pay_1', order_id: 'order_1', status: 'captured', amount: 19900, currency: 'INR' }),
        capture: jest.fn(),
      },
    };
    (svc as any).razorpay = razorpay;
    return { svc, coupons, razorpay };
  }
  const sign = (orderId: string, paymentId: string) =>
    crypto.createHmac('sha256', 'key_secret').update(`${orderId}|${paymentId}`).digest('hex');

  it('creates a one-time order for the coupon price and links it', async () => {
    const { svc, coupons, razorpay } = paymentsSetup();
    const res = await svc.createCouponOrder('u1', 'LAW199', 'v1');
    expect(razorpay.orders.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 19900, currency: 'INR', notes: expect.objectContaining({ kind: 'COUPON_PASS', userId: 'u1' }) }),
    );
    expect(coupons.attachOrder).toHaveBeenCalledWith('u1', 'c1', 'order_1');
    expect(res).toMatchObject({ orderId: 'order_1', amount: 19900, keyId: 'rzp_test_x', freeDays: 90 });
  });

  it('verifies the signature and the captured payment before granting', async () => {
    const { svc, coupons } = paymentsSetup();
    await svc.verifyCouponPayment('u1', { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sign('order_1', 'pay_1') });
    expect(coupons.confirmPaidRedemption).toHaveBeenCalledWith('order_1', expect.objectContaining({ id: 'pay_1', amount: 19900 }));
  });

  it('rejects a bad signature', async () => {
    const { svc, coupons } = paymentsSetup();
    await expect(
      svc.verifyCouponPayment('u1', { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'f'.repeat(64) }),
    ).rejects.toThrow('signature');
    expect(coupons.confirmPaidRedemption).not.toHaveBeenCalled();
  });

  it("rejects another student's order", async () => {
    const { svc, coupons } = paymentsSetup();
    coupons.findRedemptionByOrder.mockResolvedValue({ id: 'r1', userId: 'someone-else' });
    await expect(
      svc.verifyCouponPayment('u1', { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sign('order_1', 'pay_1') }),
    ).rejects.toThrow('does not belong');
  });

  it('rejects a payment that is not captured', async () => {
    const { svc, coupons, razorpay } = paymentsSetup();
    razorpay.payments.fetch.mockResolvedValue({ id: 'pay_1', order_id: 'order_1', status: 'failed', amount: 19900, currency: 'INR' });
    await expect(
      svc.verifyCouponPayment('u1', { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: sign('order_1', 'pay_1') }),
    ).rejects.toThrow('not complete');
    expect(coupons.confirmPaidRedemption).not.toHaveBeenCalled();
  });

  it('order.paid webhook grants access for a coupon pass', async () => {
    const { svc, coupons } = paymentsSetup();
    const body = Buffer.from(JSON.stringify({
      event: 'order.paid',
      payload: {
        order: { entity: { id: 'order_1', notes: { kind: 'COUPON_PASS' } } },
        payment: { entity: { id: 'pay_1', amount: 19900, currency: 'INR', status: 'captured' } },
      },
    }));
    const signature = crypto.createHmac('sha256', 'wh_secret').update(body).digest('hex');
    await svc.verifyWebhook(signature, body, 'evt_1');
    expect(coupons.confirmPaidRedemption).toHaveBeenCalledWith('order_1', { id: 'pay_1', amount: 19900, currency: 'INR', status: 'captured' });
  });

  it('order.paid for a non-coupon order is ignored', async () => {
    const { svc, coupons } = paymentsSetup();
    const body = Buffer.from(JSON.stringify({ event: 'order.paid', payload: { order: { entity: { id: 'o', notes: {} } }, payment: { entity: { id: 'p' } } } }));
    const signature = crypto.createHmac('sha256', 'wh_secret').update(body).digest('hex');
    await svc.verifyWebhook(signature, body, 'evt_2');
    expect(coupons.confirmPaidRedemption).not.toHaveBeenCalled();
  });
});

describe('Paid coupons: analytics stage', () => {
  const base = { role: 'USER', hasProfile: true, profileComplete: true, razorpaySubscriptionId: null, trialEndsAt: null };
  it('an active one-time pass is PAID, not autopay-cancelled', () => {
    expect(
      deriveStage({ ...base, hasActiveSubscription: true, accessEndsAt: new Date(Date.now() + 10 * DAY), capturedPayments: 1, oneTimePass: true }),
    ).toBe('PAID');
  });
  it('an expired one-time pass is LAPSED', () => {
    expect(
      deriveStage({ ...base, hasActiveSubscription: true, accessEndsAt: new Date(Date.now() - DAY), capturedPayments: 1, oneTimePass: true }),
    ).toBe('LAPSED');
  });
});
