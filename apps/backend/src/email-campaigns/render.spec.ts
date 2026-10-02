import { FUNNEL_STAGES } from '../analytics/analytics.types';
import { renderCampaignEmail } from './render';
import { sanitizeBody } from './sanitize';
import { BUILT_IN_TEMPLATES } from './templates';
import { signUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token';
import { CAMPAIGN_VARIABLES, checkVariables, findVariables, sampleValues } from './variables';

describe('variables', () => {
  it('finds tokens regardless of spacing', () => {
    expect(findVariables('Hi {{ firstName }} and {{couponCode}} {{firstName}}').sort()).toEqual(['couponCode', 'firstName']);
  });

  it('flags unknown variables and coupon variables without a coupon', () => {
    expect(checkVariables(['Hi {{nope}}'], false)).toEqual(['Unknown variable {{nope}}']);
    expect(checkVariables(['{{couponCode}}'], false)[0]).toMatch(/needs a coupon/);
    expect(checkVariables(['{{couponCode}} {{unsubscribeUrl}}'], true)).toEqual([]);
  });
});

describe('sanitizeBody', () => {
  it('strips scripts, handlers, styles and javascript links', () => {
    const out = sanitizeBody('<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a><style>p{}</style>');
    expect(out).not.toMatch(/script|onclick|javascript:|style/i);
    expect(out).toContain('Hi');
  });

  it('keeps variable placeholders in links and allowed button/coupon classes', () => {
    const out = sanitizeBody('<a class="btn" href="{{subscribeUrl}}">Go</a><div class="coupon">{{couponCode}}</div><div class="evil">x</div>');
    expect(out).toContain('href="{{subscribeUrl}}"');
    expect(out).toContain('class="btn"');
    expect(out).toContain('class="coupon"');
    expect(out).not.toContain('evil');
  });

  it('turns plain text into paragraphs and [Label](url) into a button', () => {
    const out = sanitizeBody('Hello <there>\n\nSecond line\nthird\n\n[Pay now](https://x.test/pay)');
    expect(out).toContain('<p>Hello &lt;there&gt;</p>');
    expect(out).toContain('Second line<br />third');
    expect(out).toContain('class="btn"');
    expect(out).toContain('href="https://x.test/pay"');
  });

  it('refuses non-http schemes in plain-text buttons', () => {
    expect(sanitizeBody('[x](javascript:alert(1))')).not.toContain('javascript:');
  });
});

describe('renderCampaignEmail', () => {
  const base = { preheader: 'Pre', frontendOrigin: 'https://lex.test', unsubscribeUrl: 'https://lex.test/unsubscribe?token=t' };

  it('escapes recipient values so a name cannot inject markup', () => {
    const out = renderCampaignEmail({ ...base, subject: 'Hi {{firstName}}', bodyHtml: '<p>Hi {{firstName}}</p>', values: { firstName: '<img src=x onerror=1>' } });
    expect(out.html).not.toContain('<img src=x');
    expect(out.html).toContain('&lt;img src=x onerror=1&gt;');
  });

  it('wraps every body in the fixed header and unsubscribe footer with inline styles', () => {
    const out = renderCampaignEmail({ ...base, subject: 'S', bodyHtml: '<p>Body</p><a class="btn" href="https://x.test">Go</a>', values: {} });
    expect(out.html).toContain('LexAssess');
    expect(out.html).toContain('href="https://lex.test/unsubscribe?token=t"');
    expect(out.html).toMatch(/<p style="[^"]+">Body<\/p>/);
    expect(out.html).toMatch(/<a href="https:\/\/x.test" style="[^"]*background:#d97706/);
    expect(out.text).toContain('Unsubscribe: https://lex.test/unsubscribe?token=t');
  });

  it('every built-in template passes validation and renders with sample data', () => {
    for (const t of BUILT_IN_TEMPLATES) {
      const body = sanitizeBody(t.bodyHtml);
      expect(checkVariables([t.subject, t.preheader, body], t.usesCoupon)).toEqual([]);
      const out = renderCampaignEmail({ ...base, subject: t.subject, preheader: t.preheader, bodyHtml: body, values: sampleValues() });
      expect(out.html).not.toMatch(/\{\{/);
      expect(out.subject).not.toMatch(/\{\{/);
    }
  });

  it('every funnel stage has a dedicated template, and a coupon one for the conversion stages', () => {
    for (const stage of FUNNEL_STAGES) {
      expect(BUILT_IN_TEMPLATES.some((t) => t.suggestedStages.includes(stage))).toBe(true);
    }
    for (const stage of ['REGISTERED', 'PROFILE_COMPLETE', 'PAYMENT_INITIATED', 'LAPSED'] as const) {
      expect(BUILT_IN_TEMPLATES.some((t) => t.usesCoupon && t.suggestedStages.includes(stage))).toBe(true);
    }
    expect(new Set(BUILT_IN_TEMPLATES.map((t) => t.key)).size).toBe(BUILT_IN_TEMPLATES.length);
  });

  it('sample values cover every variable', () => {
    expect(Object.keys(sampleValues())).toHaveLength(CAMPAIGN_VARIABLES.length);
  });
});

describe('unsubscribe token', () => {
  it('round-trips and rejects tampering', () => {
    const token = signUnsubscribeToken('user_1', 'secret');
    expect(verifyUnsubscribeToken(token, 'secret')).toBe('user_1');
    expect(verifyUnsubscribeToken(token, 'other-secret')).toBeNull();
    const [id, sig] = token.split('.');
    const forgedId = Buffer.from('user_2').toString('base64url');
    expect(verifyUnsubscribeToken(`${forgedId}.${sig}`, 'secret')).toBeNull();
    expect(verifyUnsubscribeToken(`${id}.`, 'secret')).toBeNull();
    expect(verifyUnsubscribeToken('garbage', 'secret')).toBeNull();
  });
});
