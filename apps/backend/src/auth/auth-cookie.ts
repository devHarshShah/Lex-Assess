import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

/** Name of the httpOnly cookie that carries the JWT access token. */
export const AUTH_COOKIE_NAME = 'lexassess_token';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Builds cookie attributes from env so the same code path is correct in dev
 * (http://localhost → Lax, non-secure) and prod (cross-site → None, Secure).
 *
 * COOKIE_SECURE:   'true' to set the Secure flag (required for SameSite=None).
 * COOKIE_SAMESITE: 'lax' | 'strict' | 'none' (defaults to 'lax').
 * COOKIE_DOMAIN:   optional explicit cookie domain.
 */
export function buildAuthCookieOptions(config: ConfigService): CookieOptions {
  const secure = config.get<string>('COOKIE_SECURE') === 'true';
  const sameSite = (config.get<string>('COOKIE_SAMESITE') ?? 'lax').toLowerCase() as
    | 'lax'
    | 'strict'
    | 'none';
  const domain = config.get<string>('COOKIE_DOMAIN') || undefined;

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
    maxAge: ONE_DAY_MS,
  };
}

export function setAuthCookie(res: Response, config: ConfigService, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(config));
}

export function clearAuthCookie(res: Response, config: ConfigService): void {
  // Clearing must match the attributes used when setting (minus maxAge).
  const { maxAge: _maxAge, ...options } = buildAuthCookieOptions(config);
  res.clearCookie(AUTH_COOKIE_NAME, options);
}
