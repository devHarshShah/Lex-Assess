import { HttpException } from '@nestjs/common';
import { MaintenanceGuard } from './maintenance.guard';

function ctx(path: string, cookie?: string): any {
  const req = { path, cookies: cookie ? { lexassess_token: cookie } : {} };
  return { getType: () => 'http', switchToHttp: () => ({ getRequest: () => req }) };
}

function build(enabled: boolean) {
  const settings: any = { getMaintenance: jest.fn().mockResolvedValue({ enabled, message: 'Back soon' }) };
  const jwt: any = {
    verify: jest.fn((token: string) => {
      if (token === 'bad') throw new Error('invalid');
      return { role: token };
    }),
  };
  return new MaintenanceGuard(settings, jwt);
}

describe('MaintenanceGuard', () => {
  it('lets everything through when maintenance is off', async () => {
    await expect(build(false).canActivate(ctx('/interviews/schedule'))).resolves.toBe(true);
  });

  it('returns 503 MAINTENANCE for students, signed-out users and bad tokens', async () => {
    for (const cookie of ['USER', undefined, 'bad']) {
      const err = await build(true).canActivate(ctx('/interviews/schedule', cookie)).catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(503);
      expect(err.getResponse()).toMatchObject({ code: 'MAINTENANCE', message: 'Back soon' });
    }
  });

  it('lets superadmins and allowlisted paths through', async () => {
    const guard = build(true);
    await expect(guard.canActivate(ctx('/interviews/schedule', 'SUPERADMIN'))).resolves.toBe(true);
    for (const path of ['/maintenance', '/auth/login', '/auth/me', '/payments/webhook', '/internal/email/process']) {
      await expect(guard.canActivate(ctx(path))).resolves.toBe(true);
    }
  });
});
