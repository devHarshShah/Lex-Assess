import { ClientThrottlerGuard } from './client-throttler.guard';

const tracker = (req: any) => (ClientThrottlerGuard.prototype as any).getTracker.call({}, req);

describe('ClientThrottlerGuard.getTracker', () => {
  it('keys login attempts by IP + normalised email', async () => {
    await expect(tracker({ ip: '1.2.3.4', path: '/auth/login', body: { email: ' A@B.com ' } })).resolves.toBe('1.2.3.4:a@b.com');
  });

  it('keys everything else by client IP', async () => {
    await expect(tracker({ ip: '1.2.3.4', path: '/interviews/schedule', body: { email: 'a@b.com' } })).resolves.toBe('1.2.3.4');
  });
});
