import { api } from './api-client';

export interface SubscriptionResponse {
  subscriptionId: string;
  keyId: string;
}

export async function createSubscription(termsVersion: string): Promise<SubscriptionResponse> {
  return api.post<SubscriptionResponse>('/payments/subscription', { termsVersion });
}

// Unlocks access for the coupon's free days directly, with no Razorpay checkout.
export async function redeemCoupon(code: string, termsVersion: string): Promise<{ accessEndsAt: string }> {
  return api.post('/payments/redeem-coupon', { code, termsVersion });
}

export async function validateCoupon(code: string): Promise<{ valid: boolean; code: string; freeDays: number }> {
  return api.post('/payments/validate-coupon', { code });
}

export async function verifyPayment(data: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean; pending: boolean }> {
  return api.post<{ success: boolean; pending: boolean }>('/payments/verify-payment', data);
}

export interface Coupon {
  id: string;
  code: string;
  freeDays: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CouponInput {
  code?: string;
  freeDays?: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

export const fetchCoupons = () => api.get<Coupon[]>('/superadmin/coupons');
export const createCoupon = (data: CouponInput) => api.post<Coupon>('/superadmin/coupons', data);
export const updateCoupon = (id: string, data: CouponInput) => api.patch<Coupon>(`/superadmin/coupons/${id}`, data);
export const deleteCoupon = (id: string) => api.delete<{ success: boolean }>(`/superadmin/coupons/${id}`);
