// Variables a superadmin can drop into a campaign. Values are filled per recipient at send time.
export interface CampaignVariable {
  key: string;
  label: string;
  group: 'Student' | 'Coupon' | 'Links' | 'Access';
  description: string;
  // Shown in previews and test sends
  sample: string;
  // Used when the student has no value for it
  fallback: string;
  requiresCoupon?: boolean;
}

export const CAMPAIGN_VARIABLES: CampaignVariable[] = [
  { key: 'firstName', label: 'First name', group: 'Student', description: 'Student\'s first name', sample: 'Aarav', fallback: 'there' },
  { key: 'name', label: 'Full name', group: 'Student', description: 'Student\'s full name', sample: 'Aarav Sharma', fallback: 'there' },
  { key: 'email', label: 'Email', group: 'Student', description: 'Student\'s email address', sample: 'aarav@example.com', fallback: '' },
  { key: 'college', label: 'College', group: 'Student', description: 'College from their profile', sample: 'NLU Delhi', fallback: 'your college' },
  { key: 'couponCode', label: 'Coupon code', group: 'Coupon', description: 'Code of the coupon chosen for this campaign', sample: 'WELCOME10', fallback: '', requiresCoupon: true },
  { key: 'couponFreeDays', label: 'Coupon free days', group: 'Coupon', description: 'Free days the coupon gives', sample: '30', fallback: '', requiresCoupon: true },
  { key: 'couponExpiry', label: 'Coupon expiry', group: 'Coupon', description: 'Date the coupon expires', sample: '31 Dec 2026', fallback: 'for a limited time', requiresCoupon: true },
  { key: 'subscribeUrl', label: 'Subscribe link', group: 'Links', description: 'Opens LexAssess where they can subscribe', sample: 'https://lexassess.com/dashboard', fallback: '' },
  { key: 'profileUrl', label: 'Profile link', group: 'Links', description: 'Opens the profile setup page', sample: 'https://lexassess.com/dashboard/setup', fallback: '' },
  { key: 'dashboardUrl', label: 'Dashboard link', group: 'Links', description: 'Opens their dashboard', sample: 'https://lexassess.com/dashboard', fallback: '' },
  { key: 'trialEndsAt', label: 'Trial end date', group: 'Access', description: 'When their free trial ends', sample: '30 Oct 2026', fallback: 'soon' },
  { key: 'accessEndsAt', label: 'Access end date', group: 'Access', description: 'When their access ends (after cancelling autopay)', sample: '31 Dec 2026', fallback: 'soon' },
];

// Added by the system; usable in a body but not shown as a draggable chip
export const SYSTEM_VARIABLES = ['unsubscribeUrl'];

const KNOWN = new Map(CAMPAIGN_VARIABLES.map((v) => [v.key, v]));
const TOKEN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

export function findVariables(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(TOKEN)) found.add(m[1]!);
  return [...found];
}

// Returns human-readable problems; empty means the content can be sent.
export function checkVariables(texts: string[], hasCoupon: boolean): string[] {
  const problems: string[] = [];
  const used = new Set(texts.flatMap(findVariables));
  for (const key of used) {
    const def = KNOWN.get(key);
    if (!def && !SYSTEM_VARIABLES.includes(key)) {
      problems.push(`Unknown variable {{${key}}}`);
    } else if (def?.requiresCoupon && !hasCoupon) {
      problems.push(`{{${key}}} needs a coupon — pick one for this campaign`);
    }
  }
  return problems;
}

export const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Substitute {{vars}}. HTML mode escapes values; unknown tokens are left empty.
export function fillVariables(text: string, values: Record<string, string>, mode: 'html' | 'text'): string {
  return text.replace(TOKEN, (_, key: string) => {
    const raw = values[key] ?? '';
    return mode === 'html' ? escapeHtml(raw) : raw.replace(/[\r\n]+/g, ' ');
  });
}

export function sampleValues(): Record<string, string> {
  return Object.fromEntries(CAMPAIGN_VARIABLES.map((v) => [v.key, v.sample]));
}
