import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import Razorpay from 'razorpay';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanRecord {
  planId: string;
  amountPaise: number;
  cycleMonths: number;
  createdAt: string;
}

export interface PricingConfig {
  planId: string;
  amountPaise: number;
  compareAtPaise: number | null;
  cycleMonths: number;
  planName: string;
  offerTag: string | null;
  currency: 'INR';
  // Every Razorpay plan we have used, so old subscribers' cycle length can still be looked up
  plans: PlanRecord[];
  updatedAt: string | null;
}

export type PublicPricing = Pick<
  PricingConfig,
  'amountPaise' | 'compareAtPaise' | 'cycleMonths' | 'planName' | 'offerTag' | 'currency'
>;

export interface UpdatePricingInput {
  amountPaise: number;
  compareAtPaise?: number | null;
  cycleMonths: number;
  planName: string;
  offerTag?: string | null;
}

const PRICING_KEY = 'pricing';
// Up to 3 Cloud Run instances each cache this; an edit reaches all of them within this window
const CACHE_MS = 10_000;
// Subscriptions run for about 15 years of cycles (was 60 cycles x 3 months)
const SUBSCRIPTION_HORIZON_MONTHS = 180;

export const DEFAULT_PRICING = {
  amountPaise: 49900,
  compareAtPaise: 199900,
  cycleMonths: 3,
  planName: 'Lex-Assess Premium',
  offerTag: 'New customer offer',
  currency: 'INR' as const,
};

export function totalCountFor(cycleMonths: number): number {
  return Math.max(1, Math.floor(SUBSCRIPTION_HORIZON_MONTHS / cycleMonths));
}

function isRealPlanId(id: string | undefined | null): id is string {
  return !!id && !id.includes('your_razorpay_plan_id');
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private razorpay: any;
  private readonly envPlanId: string;
  private cached: { config: PricingConfig; at: number } | null = null;
  private devPlanPromise: Promise<string> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.envPlanId = this.configService.get<string>('RAZORPAY_PLAN_ID') || '';
    this.razorpay = new Razorpay({
      key_id: this.configService.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  async getPricing(): Promise<PricingConfig> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.config;
    const row = await this.prisma.appSetting.findUnique({ where: { key: PRICING_KEY } });
    const config = row ? this.fromRow(row.value as any, row.updatedAt) : this.fallback();
    this.cached = { config, at: Date.now() };
    return config;
  }

  async getPublicPricing(): Promise<PublicPricing> {
    const { amountPaise, compareAtPaise, cycleMonths, planName, offerTag, currency } = await this.getPricing();
    return { amountPaise, compareAtPaise, cycleMonths, planName, offerTag, currency };
  }

  // The plan new subscriptions are created on. In dev, with no plan configured
  // anywhere, one is created at Razorpay on first use.
  async getActivePlanId(): Promise<string> {
    const config = await this.getPricing();
    if (isRealPlanId(config.planId)) return config.planId;
    if (!this.devPlanPromise) {
      this.logger.log('No valid Razorpay plan configured; creating one for the current pricing');
      this.devPlanPromise = this.createPlan(config.amountPaise, config.cycleMonths, config.planName)
        .then(async (planId) => {
          await this.save({ ...config, planId, plans: [...config.plans, this.planRecord(planId, config)] });
          return planId;
        })
        .finally(() => {
          this.devPlanPromise = null;
        });
    }
    return this.devPlanPromise;
  }

  async cycleMonthsForPlan(planId: string | undefined | null): Promise<number> {
    const config = await this.getPricing();
    if (planId) {
      const found = config.plans.find((p) => p.planId === planId);
      if (found) return found.cycleMonths;
    }
    return DEFAULT_PRICING.cycleMonths;
  }

  async updatePricing(input: UpdatePricingInput): Promise<PricingConfig> {
    const current = await this.getPricing();
    const next: PricingConfig = {
      ...current,
      amountPaise: input.amountPaise,
      compareAtPaise: input.compareAtPaise ?? null,
      cycleMonths: input.cycleMonths,
      planName: input.planName.trim(),
      offerTag: input.offerTag?.trim() || null,
    };

    // Razorpay plans are immutable: a new charge amount or cycle needs a new plan.
    // Create it first so a Razorpay failure leaves the saved pricing untouched.
    const chargeChanged =
      input.amountPaise !== current.amountPaise ||
      input.cycleMonths !== current.cycleMonths ||
      !isRealPlanId(current.planId);
    if (chargeChanged) {
      const planId = await this.createPlan(next.amountPaise, next.cycleMonths, next.planName);
      next.planId = planId;
      next.plans = [...current.plans, this.planRecord(planId, next)];
      this.logger.log(`Pricing changed: new Razorpay plan ${planId} (${next.amountPaise} paise / ${next.cycleMonths} months)`);
    }

    await this.save(next);
    return this.getPricing();
  }

  private async createPlan(amountPaise: number, cycleMonths: number, planName: string): Promise<string> {
    try {
      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: cycleMonths,
        item: {
          name: planName,
          amount: amountPaise,
          currency: 'INR',
          description: 'Unlock all tests on Lex-Assess',
        },
        notes: { purpose: 'Lex-Assess Subscription' },
      });
      return plan.id as string;
    } catch (error: any) {
      this.logger.error('Failed to create Razorpay plan', error?.error || error);
      const reason = error?.error?.description || error?.description;
      throw new BadGatewayException(`Razorpay rejected the new plan${reason ? `: ${reason}` : ''}`);
    }
  }

  private planRecord(planId: string, c: { amountPaise: number; cycleMonths: number }): PlanRecord {
    return { planId, amountPaise: c.amountPaise, cycleMonths: c.cycleMonths, createdAt: new Date().toISOString() };
  }

  private async save(config: PricingConfig) {
    const { updatedAt: _ignored, ...rest } = config;
    const value = rest as unknown as Prisma.InputJsonObject;
    await this.prisma.appSetting.upsert({
      where: { key: PRICING_KEY },
      create: { key: PRICING_KEY, value },
      update: { value },
    });
    this.cached = null;
  }

  // Before the superadmin first saves pricing, the env plan and the original prices apply
  private fallback(): PricingConfig {
    const planId = isRealPlanId(this.envPlanId) ? this.envPlanId : '';
    return {
      ...DEFAULT_PRICING,
      planId,
      plans: planId
        ? [{ planId, amountPaise: DEFAULT_PRICING.amountPaise, cycleMonths: DEFAULT_PRICING.cycleMonths, createdAt: new Date(0).toISOString() }]
        : [],
      updatedAt: null,
    };
  }

  private fromRow(value: Partial<PricingConfig>, updatedAt: Date): PricingConfig {
    const base = this.fallback();
    return {
      planId: value.planId || base.planId,
      amountPaise: value.amountPaise ?? base.amountPaise,
      compareAtPaise: value.compareAtPaise === undefined ? base.compareAtPaise : value.compareAtPaise,
      cycleMonths: value.cycleMonths ?? base.cycleMonths,
      planName: value.planName || base.planName,
      offerTag: value.offerTag === undefined ? base.offerTag : value.offerTag,
      currency: 'INR',
      plans: Array.isArray(value.plans) ? value.plans : base.plans,
      updatedAt: updatedAt.toISOString(),
    };
  }
}
