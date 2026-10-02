export const FUNNEL_STAGES = [
  'REGISTERED',
  'PROFILE_STARTED',
  'PROFILE_COMPLETE',
  'PAYMENT_INITIATED',
  'TRIAL',
  'PAID',
  'LAPSED',
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number] | 'NON_STUDENT';

export const STAGE_LABELS: Record<FunnelStage, string> = {
  REGISTERED: 'Registered only',
  PROFILE_STARTED: 'Profile started',
  PROFILE_COMPLETE: 'Profile complete, no payment',
  PAYMENT_INITIATED: 'Payment initiated, not active',
  TRIAL: 'In free trial',
  PAID: 'Paid and active',
  LAPSED: 'Paid, now inactive',
  NON_STUDENT: 'Non-student account',
};

export interface AnalyticsFilters {
  stage?: string;
  role?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface UserReportRow {
  id: string;
  name: string;
  email: string;
  role: string;
  authProvider: string;
  registeredAt: string;
  mobile: string | null;
  college: string | null;
  degree: string | null;
  currentYear: string | null;
  specialization: string | null;
  profileStarted: boolean;
  profileComplete: boolean;
  paymentInitiated: boolean;
  couponCode: string | null;
  trialEndsAt: string | null;
  hasActiveSubscription: boolean;
  paymentCount: number;
  totalPaidInr: number;
  lastPaymentAt: string | null;
  stage: FunnelStage;
  stageLabel: string;
}
