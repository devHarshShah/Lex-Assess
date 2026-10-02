import { addMonths, computeAccessEndOnCancel, hasAccess } from './access';

const now = new Date('2026-10-05T00:00:00Z');
const future = new Date('2027-01-01T00:00:00Z');
const past = new Date('2026-09-01T00:00:00Z');

describe('hasAccess', () => {
  it('false when not active', () => expect(hasAccess({ hasActiveSubscription: false, accessEndsAt: future }, now)).toBe(false));
  it('true when active with no end', () => expect(hasAccess({ hasActiveSubscription: true }, now)).toBe(true));
  it('true before the end date', () => expect(hasAccess({ hasActiveSubscription: true, accessEndsAt: future }, now)).toBe(true));
  it('false after the end date', () => expect(hasAccess({ hasActiveSubscription: true, accessEndsAt: past }, now)).toBe(false));
});

describe('computeAccessEndOnCancel', () => {
  const paid = new Date('2026-10-01T18:06:14Z');
  it('uses Razorpay current_end when it is after the payment', () => {
    const end = computeAccessEndOnCancel({
      currentEndEpoch: Math.floor(new Date('2027-01-01T18:06:14Z').getTime() / 1000),
      lastPaymentAt: paid, trialEndsAt: null, existingAccessEndsAt: null,
    });
    expect(end.toISOString()).toBe('2027-01-01T18:06:14.000Z');
  });
  it('falls back to last payment + 3 months', () => {
    const end = computeAccessEndOnCancel({ currentEndEpoch: null, lastPaymentAt: paid, trialEndsAt: null, existingAccessEndsAt: null });
    expect(end.toISOString()).toBe(addMonths(paid, 3).toISOString());
    expect(end.toISOString()).toBe('2027-01-01T18:06:14.000Z');
  });
  it('ignores a current_end that is not after the payment', () => {
    const end = computeAccessEndOnCancel({
      currentEndEpoch: Math.floor(paid.getTime() / 1000) - 10,
      lastPaymentAt: paid, trialEndsAt: null, existingAccessEndsAt: null,
    });
    expect(end.toISOString()).toBe('2027-01-01T18:06:14.000Z');
  });
  it('cancelled during a coupon free period keeps access until trialEndsAt', () => {
    const trial = new Date('2026-11-01T00:00:00Z');
    const end = computeAccessEndOnCancel({ currentEndEpoch: null, lastPaymentAt: null, trialEndsAt: trial, existingAccessEndsAt: null });
    expect(end).toEqual(trial);
  });
  it('no payment and no trial ends access immediately', () => {
    const end = computeAccessEndOnCancel({ currentEndEpoch: null, lastPaymentAt: null, trialEndsAt: null, existingAccessEndsAt: null });
    expect(end.getTime()).toBe(0);
  });
  it('never shortens an existing later access end', () => {
    const end = computeAccessEndOnCancel({ currentEndEpoch: null, lastPaymentAt: paid, trialEndsAt: null, existingAccessEndsAt: new Date('2027-06-01T00:00:00Z') });
    expect(end.toISOString()).toBe('2027-06-01T00:00:00.000Z');
  });
});

import { shouldIgnoreCancel } from './access';

describe('shouldIgnoreCancel', () => {
  const none = { hasCapturedPayment: false, hasConfirmedTrial: false, hasActiveSubscription: false };
  it('ignores an attempt that never went through', () => expect(shouldIgnoreCancel(none)).toBe(true));
  it.each(['hasCapturedPayment', 'hasConfirmedTrial', 'hasActiveSubscription'] as const)(
    'processes the cancel when %s',
    (k) => expect(shouldIgnoreCancel({ ...none, [k]: true })).toBe(false),
  );
});

import { activeAccessWhere } from './access';

describe('activeAccessWhere', () => {
  it('requires the flag and an unset or future end date', () => {
    const now = new Date('2026-10-02T00:00:00Z');
    expect(activeAccessWhere(now)).toEqual({
      hasActiveSubscription: true,
      OR: [{ accessEndsAt: null }, { accessEndsAt: { gt: now } }],
    });
  });
});
