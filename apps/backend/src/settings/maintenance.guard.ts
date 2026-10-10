import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME } from '../auth/auth-cookie';
import { Role } from '../auth/roles';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SettingsService } from './settings.service';

// Reachable during maintenance so a superadmin can sign in, and so webhooks and the
// scheduler worker keep working.
const ALLOWED_PREFIXES = [
  '/maintenance',
  '/auth/login',
  '/auth/logout',
  '/auth/me',
  '/auth/google/',
  '/payments/webhook',
  '/internal/',
];

/** While maintenance mode is on, every request except a superadmin's gets a 503. */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly settings: SettingsService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path;
    if (path === '/' || ALLOWED_PREFIXES.some((p) => path.startsWith(p))) return true;

    const maintenance = await this.settings.getMaintenance();
    if (!maintenance.enabled) return true;
    if (this.isSuperadmin(req)) return true;

    throw new HttpException(
      { statusCode: HttpStatus.SERVICE_UNAVAILABLE, code: 'MAINTENANCE', message: maintenance.message },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private isSuperadmin(req: Request): boolean {
    const token = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    if (!token) return false;
    try {
      return this.jwt.verify<JwtPayload>(token).role === Role.SUPERADMIN;
    } catch {
      return false;
    }
  }
}
