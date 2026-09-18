import { api } from './api-client';

export interface SubscriptionResponse {
  subscriptionId: string;
  keyId: string;
}

export async function createSubscription(): Promise<SubscriptionResponse> {
  return api.post<SubscriptionResponse>('/payments/subscription');
}

export async function verifyPayment(data: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean; pending: boolean }> {
  return api.post<{ success: boolean; pending: boolean }>('/payments/verify-payment', data);
}
