import { ClientThrottlerGuard, PER_EMAIL_THROTTLER } from './client-throttler.guard';

const tracker = (req: any) => (ClientThrottlerGuard.prototype as any).getTracker.call({}, req);

describe('ClientThrottlerGuard.getTracker', () => {
  it('keys login attempts by IP + normalised email', async () => {
    await expect(tracker({ ip: '1.2.3.4', path: '/auth/login', body: { email: ' A@B.com ' } })).resolves.toBe('1.2.3.4:a@b.com');
  });

  it('keys everything else by client IP', async () => {
    await expect(tracker({ ip: '1.2.3.4', path: '/interviews/schedule', body: { email: 'a@b.com' } })).resolves.toBe('1.2.3.4');
  });
});

describe('PER_EMAIL_THROTTLER', () => {
  const ctx = (req: any): any => ({ switchToHttp: () => ({ getRequest: () => req }) });

  it('keys credential requests by email alone, whatever the IP', async () => {
    const a = { ip: '1.1.1.1', path: '/auth/login', body: { email: 'A@b.com' } };
    const b = { ...a, ip: '9.9.9.9' };
    expect(PER_EMAIL_THROTTLER.skipIf!(ctx(a))).toBe(false);
    expect(await PER_EMAIL_THROTTLER.getTracker!(a, ctx(a))).toBe(await PER_EMAIL_THROTTLER.getTracker!(b, ctx(b)));
  });

  it('skips every other request', () => {
    expect(PER_EMAIL_THROTTLER.skipIf!(ctx({ path: '/interviews/schedule', body: { email: 'a@b.com' } }))).toBe(true);
    expect(PER_EMAIL_THROTTLER.skipIf!(ctx({ path: '/auth/login', body: {} }))).toBe(true);
  });
});
