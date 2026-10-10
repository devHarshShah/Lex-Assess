import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Credential endpoints are keyed by IP + email so one person's retries can't lock out
// everyone else behind the same IP (college Wi-Fi, mobile carrier NAT).
const PER_EMAIL_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password'];

@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // req.ip is the real client IP because main.ts sets 'trust proxy' to the number of proxy hops
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const path: string = (req.path ?? req.url ?? '').split('?')[0];
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email && PER_EMAIL_PATHS.some((p) => path.endsWith(p))) return `${ip}:${email}`;
    return ip;
  }
}
