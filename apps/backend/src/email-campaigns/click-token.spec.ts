import { buildTargetUrl, isBotUserAgent, signClickToken, verifyClickToken } from './click-token';

describe('click token', () => {
  const secret = 'test-secret';

  it('round-trips a recipient and link key', () => {
    const token = signClickToken('rec_1', 'profile', secret);
    expect(verifyClickToken(token, secret)).toEqual({ recipientId: 'rec_1', linkKey: 'profile' });
  });

  it('rejects a tampered signature or payload', () => {
    const token = signClickToken('rec_1', 'profile', secret);
    expect(verifyClickToken(`${token}x`, secret)).toBeNull();
    const [, sig] = token.split('.');
    const forged = `${Buffer.from('rec_2:profile').toString('base64url')}.${sig}`;
    expect(verifyClickToken(forged, secret)).toBeNull();
    expect(verifyClickToken(token, 'other-secret')).toBeNull();
  });

  it('rejects a validly signed token for a link key that is not allowlisted', () => {
    const token = signClickToken('rec_1', 'https://evil.example', secret);
    expect(verifyClickToken(token, secret)).toBeNull();
  });

  it('builds the destination from the allowlist with UTM tags', () => {
    const url = new URL(buildTargetUrl('https://app.example', 'profile', 'camp_1', 'win-back'));
    expect(url.origin + url.pathname).toBe('https://app.example/dashboard/setup');
    expect(url.searchParams.get('utm_campaign')).toBe('camp_1');
    expect(url.searchParams.get('utm_content')).toBe('win-back');
  });

  it('treats scanners and missing user agents as bots', () => {
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1')).toBe(false);
  });
});
