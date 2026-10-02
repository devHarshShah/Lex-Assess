import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const DEFAULT_FREE_DAYS = 30;

export interface CouponInput {
  code?: string;
  freeDays?: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  normalizeCode(code: unknown): string {
    return typeof code === 'string' ? code.trim().toUpperCase() : '';
  }

  // Throws a user-facing BadRequestException if the coupon can't be used by this user.
  private async findUsable(userId: string, rawCode: string) {
    const code = this.normalizeCode(rawCode);
    if (!code || code.length > 64) throw new BadRequestException('Invalid coupon code');

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive || coupon.deletedAt) throw new BadRequestException('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new BadRequestException('This coupon is no longer available');
    }
    const already = await this.prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    // A pending (checkout opened but never completed) claim doesn't count as used.
    if (already?.confirmedAt) throw new BadRequestException('You have already used this coupon');
    return coupon;
  }

  async validate(userId: string, code: string) {
    const coupon = await this.findUsable(userId, code);
    return { valid: true, code: coupon.code, freeDays: coupon.freeDays };
  }

  // Records a pending claim when checkout starts. Nothing is consumed yet: the
  // coupon only counts as used once confirm() runs after the mandate/payment
  // succeeds, so an abandoned checkout leaves it reusable.
  async claim(userId: string, code: string) {
    const coupon = await this.findUsable(userId, code);
    const redemption = await this.prisma.couponRedemption.upsert({
      where: { couponId_userId: { couponId: coupon.id, userId } },
      create: { couponId: coupon.id, userId },
      update: { razorpaySubscriptionId: null },
    });
    return { redemptionId: redemption.id, freeDays: coupon.freeDays };
  }

  // Drops a pending claim when the Razorpay call that depended on it failed.
  async release(redemptionId: string) {
    await this.prisma.couponRedemption.deleteMany({
      where: { id: redemptionId, confirmedAt: null },
    });
  }

  // Consumes the user's pending claim for this subscription. Idempotent. If the
  // cap filled up meanwhile we still confirm: the student already authorised
  // autopay, so the count may exceed maxRedemptions by a few in-flight users.
  async confirm(userId: string, razorpaySubscriptionId: string) {
    const redemption = await this.prisma.couponRedemption.findFirst({
      where: { userId, razorpaySubscriptionId, confirmedAt: null },
    });
    if (!redemption) return;
    await this.prisma.$transaction(async (tx) => {
      const marked = await tx.couponRedemption.updateMany({
        where: { id: redemption.id, confirmedAt: null },
        data: { confirmedAt: new Date() },
      });
      if (marked.count === 0) return;
      await tx.coupon.update({
        where: { id: redemption.couponId },
        data: { redemptionCount: { increment: 1 } },
      });
    });
  }

  attachSubscription(redemptionId: string, razorpaySubscriptionId: string) {
    return this.prisma.couponRedemption.update({
      where: { id: redemptionId },
      data: { razorpaySubscriptionId },
    });
  }

  // ---- Admin ----

  list() {
    return this.prisma.coupon.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  private parseFields(input: CouponInput) {
    const data: {
      freeDays?: number;
      maxRedemptions?: number | null;
      expiresAt?: Date | null;
      isActive?: boolean;
    } = {};

    if (input.freeDays !== undefined) {
      if (!Number.isInteger(input.freeDays) || input.freeDays < 1 || input.freeDays > 365) {
        throw new BadRequestException('freeDays must be a whole number between 1 and 365');
      }
      data.freeDays = input.freeDays;
    }
    if (input.maxRedemptions !== undefined) {
      if (input.maxRedemptions !== null && (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions < 1)) {
        throw new BadRequestException('maxRedemptions must be a positive whole number');
      }
      data.maxRedemptions = input.maxRedemptions;
    }
    if (input.expiresAt !== undefined) {
      if (input.expiresAt === null || input.expiresAt === '') {
        data.expiresAt = null;
      } else {
        const d = new Date(input.expiresAt);
        if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid expiry date');
        data.expiresAt = d;
      }
    }
    if (input.isActive !== undefined) data.isActive = !!input.isActive;
    return data;
  }

  async create(input: CouponInput) {
    const code = this.normalizeCode(input.code);
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      throw new BadRequestException('Code must be 3-32 characters: letters, numbers, - or _');
    }
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('A coupon with this code already exists');
    return this.prisma.coupon.create({ data: { code, ...this.parseFields(input) } });
  }

  async update(id: string, input: CouponInput) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.coupon.update({ where: { id }, data: this.parseFields(input) });
  }

  // Soft delete: redemption links must survive, so nothing is ever removed.
  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon || coupon.deletedAt) throw new NotFoundException('Coupon not found');
    await this.prisma.coupon.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { success: true };
  }
}
