import { createHmac, timingSafeEqual } from 'crypto';

// Where a tracked link may send the student. The token only names a key from this list, so a
// forged or edited token can never turn the endpoint into an open redirect.
export const CLICK_TARGETS: Record<string, string> = {
  subscribe: '/dashboard',
  profile: '/dashboard/setup',
  dashboard: '/dashboard',
};

const sign = (payload: string, secret: string) => createHmac('sha256', `${secret}:click`).update(payload).digest('base64url');

export function signClickToken(recipientId: string, linkKey: string, secret: string): string {
  const payload = Buffer.from(`${recipientId}:${linkKey}`).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyClickToken(token: string, secret: string): { recipientId: string; linkKey: string } | null {
  const [payload, sig, ...rest] = (token ?? '').split('.');
  if (!payload || !sig || rest.length) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload, secret));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [recipientId, linkKey, ...extra] = Buffer.from(payload, 'base64url').toString().split(':');
  if (!recipientId || !linkKey || extra.length || !(linkKey in CLICK_TARGETS)) return null;
  return { recipientId, linkKey };
}

const BOT_UA = /bot|crawl|spider|preview|scanner|prefetch|slurp|facebookexternalhit|headless|python-requests|curl|wget|go-http|java\//i;
export const isBotUserAgent = (ua?: string) => !ua || BOT_UA.test(ua);

// Corporate mail scanners open every link within moments of delivery
export const MIN_HUMAN_DELAY_MS = 2000;

export function buildTargetUrl(origin: string, linkKey: string, campaignId: string, templateKey: string | null): string {
  const url = new URL(`${origin}${CLICK_TARGETS[linkKey]}`);
  url.searchParams.set('utm_source', 'email');
  url.searchParams.set('utm_medium', 'campaign');
  url.searchParams.set('utm_campaign', campaignId);
  if (templateKey) url.searchParams.set('utm_content', templateKey);
  return url.toString();
}
