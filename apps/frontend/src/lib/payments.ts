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

// pricePaise set = paid coupon: a one-time payment (no autopay) that unlocks access for freeDays
export async function validateCoupon(code: string): Promise<{ valid: boolean; code: string; freeDays: number; pricePaise: number | null }> {
  return api.post('/payments/validate-coupon', { code });
}

export interface CouponOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  code: string;
  freeDays: number;
}

// Paid coupons: a one-time Razorpay order, no subscription or mandate.
export async function createCouponOrder(code: string, termsVersion: string): Promise<CouponOrderResponse> {
  return api.post<CouponOrderResponse>('/payments/coupon-order', { code, termsVersion });
}

export async function verifyCouponPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>('/payments/verify-coupon-payment', data);
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
  pricePaise: number | null;
  createdAt: string;
}

export interface CouponInput {
  code?: string;
  freeDays?: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
  pricePaise?: number | null;
}

export const fetchCoupons = () => api.get<Coupon[]>('/superadmin/coupons');
export const createCoupon = (data: CouponInput) => api.post<Coupon>('/superadmin/coupons', data);
export const updateCoupon = (id: string, data: CouponInput) => api.patch<Coupon>(`/superadmin/coupons/${id}`, data);
export const deleteCoupon = (id: string) => api.delete<{ success: boolean }>(`/superadmin/coupons/${id}`);
