import { createHmac, timingSafeEqual } from 'crypto';

// Signed so a link can't be forged for another student. No expiry: unsubscribe links in old
// emails must keep working.
export function signUnsubscribeToken(userId: string, secret: string): string {
  const id = Buffer.from(userId).toString('base64url');
  const sig = createHmac('sha256', `${secret}:unsubscribe`).update(id).digest('base64url');
  return `${id}.${sig}`;
}

export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const [id, sig, ...rest] = (token ?? '').split('.');
  if (!id || !sig || rest.length) return null;
  const expected = createHmac('sha256', `${secret}:unsubscribe`).update(id).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Buffer.from(id, 'base64url').toString() || null;
}
