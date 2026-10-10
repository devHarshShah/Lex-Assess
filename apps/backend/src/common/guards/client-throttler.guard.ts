import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerOptions } from '@nestjs/throttler';

// Credential endpoints are keyed by IP + email so one person's retries can't lock out
// everyone else behind the same IP (college Wi-Fi, mobile carrier NAT).
const PER_EMAIL_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password'];

/** Normalised email of a credential request, or null for every other request. */
export function credentialEmail(req: Record<string, any>): string | null {
  const path: string = (req.path ?? req.url ?? '').split('?')[0];
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email && PER_EMAIL_PATHS.some((p) => path.endsWith(p)) ? email : null;
}

// X-Forwarded-For can be spoofed by calling *.run.app directly, which would give every
// guess a fresh IP bucket. This cap is keyed by email alone so it can't be reset that way.
export const PER_EMAIL_THROTTLER: ThrottlerOptions = {
  name: 'perEmail',
  ttl: 10 * 60_000,
  limit: 20,
  skipIf: (context: ExecutionContext) => !credentialEmail(context.switchToHttp().getRequest()),
  getTracker: (req) => credentialEmail(req) ?? '',
};

@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // req.ip is the real client IP because main.ts sets 'trust proxy' to the number of proxy hops
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const email = credentialEmail(req);
    return email ? `${ip}:${email}` : ip;
  }
}
