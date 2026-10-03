import { api } from './api-client';

export interface EmailVariable {
  key: string;
  label: string;
  group: 'Student' | 'Coupon' | 'Links' | 'Access';
  description: string;
  sample: string;
  requiresCoupon?: boolean;
}

export interface BuiltInTemplate {
  key: string;
  name: string;
  description: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  suggestedStages: string[];
  usesCoupon: boolean;
}

export interface EmailMeta {
  stages: { key: string; label: string }[];
  variables: EmailVariable[];
  templates: BuiltInTemplate[];
}

export interface AudienceSpec {
  stages: string[];
  from?: string;
  to?: string;
  skipRedeemedCoupon: boolean;
  skipRecentDays: number;
}

export interface CampaignDraft {
  name?: string;
  templateKey?: string | null;
  subject: string;
  preheader: string;
  bodyHtml: string;
  couponId?: string | null;
  audience: AudienceSpec;
}

export interface AudiencePreview {
  recipientCount: number;
  matched: number;
  excluded: { unsubscribed: number; alreadyRedeemed: number; recentlyEmailed: number };
  stageCounts: Record<string, number>;
  sample: { name: string; email: string; stageLabel: string }[];
}

export interface CampaignCounts {
  PENDING: number;
  SENDING: number;
  SENT: number;
  FAILED: number;
  SKIPPED: number;
  total: number;
}

export interface CampaignSummary {
  id: string;
  name: string;
  subject: string;
  status: 'QUEUED' | 'SENDING' | 'DONE' | 'CANCELLED';
  createdAt: string;
  completedAt: string | null;
  counts: CampaignCounts;
}

export interface CampaignDetail extends CampaignSummary {
  recipients: { id: string; email: string; status: string; attempts: number; error: string | null; sentAt: string | null }[];
}

export interface CampaignMetrics {
  hasCoupon: boolean;
  sent: number;
  tracked: number;
  estimated: boolean;
  advanced: number;
  advancedPct: number;
  converted: number;
  convertedPct: number;
  paidAfterSend: number;
  revenueInr: number;
  couponRedemptions: number;
  unsubscribes: number;
  transitions: { from: string; to: string; fromLabel: string; toLabel: string; count: number; changed: boolean }[];
}

export interface SavedTemplate {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  bodyHtml: string;
  updatedAt: string;
}

const base = '/superadmin/email';

export const fetchEmailMeta = () => api.get<EmailMeta>(`${base}/meta`);
export const previewAudience = (d: CampaignDraft) => api.post<AudiencePreview>(`${base}/audience/preview`, d);
export const renderPreview = (d: CampaignDraft) =>
  api.post<{ subject: string; html: string; text: string }>(`${base}/render-preview`, d, { skipToast: true });
export const sendTestEmail = (d: CampaignDraft) => api.post<{ sentTo: string }>(`${base}/test-send`, d);
export const createCampaign = (d: CampaignDraft) => api.post<{ id: string; recipientCount: number }>(`${base}/campaigns`, d);
export const fetchCampaigns = () => api.get<CampaignSummary[]>(`${base}/campaigns`);
export const fetchCampaign = (id: string) => api.get<CampaignDetail>(`${base}/campaigns/${id}`);
export const fetchCampaignMetrics = (id: string) => api.get<CampaignMetrics>(`${base}/campaigns/${id}/metrics`);
export const cancelCampaign = (id: string) => api.post(`${base}/campaigns/${id}/cancel`, {});
export const retryFailedCampaign = (id: string) => api.post<{ requeued: number }>(`${base}/campaigns/${id}/retry-failed`, {});
export const fetchSavedTemplates = () => api.get<SavedTemplate[]>(`${base}/templates`);
export const saveTemplate = (t: { name: string; subject: string; preheader: string; bodyHtml: string }) =>
  api.post<SavedTemplate>(`${base}/templates`, t);
export const deleteSavedTemplate = (id: string) => api.delete(`${base}/templates/${id}`);

// Public (no login): used by the unsubscribe page
export const fetchPreferences = (token: string) =>
  api.get<{ email: string; unsubscribed: boolean }>(`/email/preferences?token=${encodeURIComponent(token)}`, { skipToast: true });
export const unsubscribeEmail = (token: string) => api.post<{ email: string; unsubscribed: boolean }>('/email/unsubscribe', { token });
export const resubscribeEmail = (token: string) => api.post<{ email: string; unsubscribed: boolean }>('/email/resubscribe', { token });
