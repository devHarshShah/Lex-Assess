import { BadGatewayException } from '@nestjs/common';
import { DEFAULT_PRICING, PricingService, totalCountFor } from './pricing.service';

function setup(opts: { row?: any; envPlanId?: string } = {}) {
  let stored: any = opts.row ?? null;
  const prisma: any = {
    appSetting: {
      findUnique: jest.fn(async () => (stored ? { key: 'pricing', value: stored, updatedAt: new Date('2026-11-01') } : null)),
      upsert: jest.fn(async ({ create }: any) => {
        stored = create.value;
      }),
    },
  };
  const env: Record<string, string> = {
    RAZORPAY_KEY_ID: 'rzp_test_x',
    RAZORPAY_KEY_SECRET: 'secret',
    RAZORPAY_PLAN_ID: opts.envPlanId ?? 'plan_env',
  };
  const config: any = { get: (k: string) => env[k], getOrThrow: (k: string) => env[k] };
  const service = new PricingService(config, prisma);
  const plansCreate = jest.fn().mockResolvedValue({ id: 'plan_new' });
  (service as any).razorpay = { plans: { create: plansCreate } };
  return { service, prisma, plansCreate, stored: () => stored };
}

const input = { amountPaise: 49900, compareAtPaise: 199900, cycleMonths: 3, planName: 'Lex-Assess Premium', offerTag: 'New customer offer' };

describe('PricingService', () => {
  it('falls back to the env plan and original prices before the first save', async () => {
    const { service } = setup();
    const p = await service.getPricing();
    expect(p).toMatchObject({ ...DEFAULT_PRICING, planId: 'plan_env', updatedAt: null });
    await expect(service.getActivePlanId()).resolves.toBe('plan_env');
  });

  it('public pricing never exposes plan ids', async () => {
    const { service } = setup();
    const p: any = await service.getPublicPricing();
    expect(p.planId).toBeUndefined();
    expect(p.plans).toBeUndefined();
  });

  it('creates a new Razorpay plan when the price changes, keeping the old one on record', async () => {
    const { service, plansCreate, stored } = setup();
    const p = await service.updatePricing({ ...input, amountPaise: 59900 });
    expect(plansCreate).toHaveBeenCalledWith(
      expect.objectContaining({ period: 'monthly', interval: 3, item: expect.objectContaining({ amount: 59900, currency: 'INR' }) }),
    );
    expect(p.planId).toBe('plan_new');
    expect(stored().plans.map((x: any) => x.planId)).toEqual(['plan_env', 'plan_new']);
  });

  it('creates a new plan when only the cycle changes', async () => {
    const { service, plansCreate } = setup();
    await service.updatePricing({ ...input, cycleMonths: 6 });
    expect(plansCreate).toHaveBeenCalledWith(expect.objectContaining({ interval: 6 }));
    await expect(service.cycleMonthsForPlan('plan_new')).resolves.toBe(6);
    await expect(service.cycleMonthsForPlan('plan_env')).resolves.toBe(3);
  });

  it('does not touch Razorpay for display-only changes', async () => {
    const { service, plansCreate } = setup();
    const p = await service.updatePricing({ ...input, offerTag: 'Diwali offer', compareAtPaise: null });
    expect(plansCreate).not.toHaveBeenCalled();
    expect(p).toMatchObject({ planId: 'plan_env', offerTag: 'Diwali offer', compareAtPaise: null });
  });

  it('saves nothing when Razorpay rejects the plan', async () => {
    const { service, prisma, plansCreate } = setup();
    plansCreate.mockRejectedValue({ error: { description: 'bad amount' } });
    await expect(service.updatePricing({ ...input, amountPaise: 59900 })).rejects.toBeInstanceOf(BadGatewayException);
    expect(prisma.appSetting.upsert).not.toHaveBeenCalled();
  });

  it('creates a plan on first use when none is configured (dev)', async () => {
    const { service, plansCreate } = setup({ envPlanId: 'your_razorpay_plan_id' });
    await expect(service.getActivePlanId()).resolves.toBe('plan_new');
    expect(plansCreate).toHaveBeenCalledTimes(1);
    await expect(service.getActivePlanId()).resolves.toBe('plan_new');
    expect(plansCreate).toHaveBeenCalledTimes(1);
  });

  it('defaults to a 3-month cycle for unknown plans', async () => {
    const { service } = setup();
    await expect(service.cycleMonthsForPlan('plan_unknown')).resolves.toBe(3);
  });

  it('keeps subscriptions around 15 years long', () => {
    expect(totalCountFor(3)).toBe(60);
    expect(totalCountFor(1)).toBe(180);
    expect(totalCountFor(12)).toBe(15);
    expect(totalCountFor(7)).toBe(25);
  });
});
