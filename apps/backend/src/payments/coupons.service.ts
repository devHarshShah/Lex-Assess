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
    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new BadRequestException('This coupon is no longer available');
    }
    const already = await this.prisma.couponRedemption.findUnique({
      where: { couponId_userId: { couponId: coupon.id, userId } },
    });
    if (already) throw new BadRequestException('You have already used this coupon');
    return coupon;
  }

  async validate(userId: string, code: string) {
    const coupon = await this.findUsable(userId, code);
    return { valid: true, code: coupon.code, freeDays: coupon.freeDays };
  }

  // Atomically claims one redemption. The conditional updateMany guards the
  // max-redemptions limit against concurrent requests.
  async redeem(userId: string, code: string) {
    const coupon = await this.findUsable(userId, code);

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.coupon.updateMany({
        where: {
          id: coupon.id,
          isActive: true,
          ...(coupon.maxRedemptions != null
            ? { redemptionCount: { lt: coupon.maxRedemptions } }
            : {}),
        },
        data: { redemptionCount: { increment: 1 } },
      });
      if (claimed.count === 0) throw new BadRequestException('This coupon is no longer available');

      try {
        const redemption = await tx.couponRedemption.create({
          data: { couponId: coupon.id, userId },
        });
        return { redemptionId: redemption.id, freeDays: coupon.freeDays };
      } catch (error: any) {
        if (error?.code === 'P2002') throw new BadRequestException('You have already used this coupon');
        throw error;
      }
    });
  }

  // Undo a redemption when the Razorpay call that depended on it failed.
  async release(redemptionId: string) {
    await this.prisma.$transaction(async (tx) => {
      const redemption = await tx.couponRedemption.findUnique({ where: { id: redemptionId } });
      if (!redemption) return;
      await tx.couponRedemption.delete({ where: { id: redemptionId } });
      await tx.coupon.update({
        where: { id: redemption.couponId },
        data: { redemptionCount: { decrement: 1 } },
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
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
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

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon.redemptionCount > 0) {
      throw new BadRequestException('This coupon has been redeemed; deactivate it instead');
    }
    await this.prisma.coupon.delete({ where: { id } });
    return { success: true };
  }
}
