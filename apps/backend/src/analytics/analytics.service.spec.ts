import { deriveStage, type StageInput } from './analytics.service';

const base: StageInput = {
  role: 'USER',
  hasProfile: false,
  profileComplete: false,
  razorpaySubscriptionId: null,
  hasActiveSubscription: false,
  trialEndsAt: null,
  capturedPayments: 0,
};

describe('deriveStage', () => {
  it('registered only', () => expect(deriveStage(base)).toBe('REGISTERED'));
  it('profile started', () => expect(deriveStage({ ...base, hasProfile: true })).toBe('PROFILE_STARTED'));
  it('profile complete', () =>
    expect(deriveStage({ ...base, hasProfile: true, profileComplete: true })).toBe('PROFILE_COMPLETE'));
  it('payment initiated but not active', () =>
    expect(deriveStage({ ...base, hasProfile: true, razorpaySubscriptionId: 'sub_1' })).toBe('PAYMENT_INITIATED'));
  it('free trial: active, no charge, trialEndsAt set', () =>
    expect(
      deriveStage({ ...base, razorpaySubscriptionId: 'sub_1', hasActiveSubscription: true, trialEndsAt: new Date() }),
    ).toBe('TRIAL'));
  it('paid and active', () =>
    expect(
      deriveStage({ ...base, razorpaySubscriptionId: 'sub_1', hasActiveSubscription: true, capturedPayments: 1 }),
    ).toBe('PAID'));
  it('paid then cancelled/halted is lapsed', () =>
    expect(deriveStage({ ...base, razorpaySubscriptionId: 'sub_1', capturedPayments: 2 })).toBe('LAPSED'));
  it('trial user who was later charged is paid', () =>
    expect(
      deriveStage({ ...base, hasActiveSubscription: true, trialEndsAt: new Date(), capturedPayments: 1 }),
    ).toBe('PAID'));
  it('manually activated without trial or charge counts as paid', () =>
    expect(deriveStage({ ...base, hasActiveSubscription: true })).toBe('PAID'));
  it('non-student roles are separate', () =>
    expect(deriveStage({ ...base, role: 'COMPANY', hasProfile: true })).toBe('NON_STUDENT'));
  it('autopay cancelled but access still running', () =>
    expect(
      deriveStage({ ...base, hasActiveSubscription: true, capturedPayments: 1, accessEndsAt: new Date(Date.now() + 86400000) }),
    ).toBe('CANCELLED_ACTIVE'));
  it('coupon access (accessEndsAt set, nothing charged) is a trial', () => {
    const end = new Date(Date.now() + 86400000);
    expect(deriveStage({ ...base, hasActiveSubscription: true, trialEndsAt: end, accessEndsAt: end })).toBe('TRIAL');
  });
  it('coupon access that ran out is not active', () => {
    const end = new Date(Date.now() - 86400000);
    expect(
      deriveStage({ ...base, hasProfile: true, profileComplete: true, hasActiveSubscription: true, trialEndsAt: end, accessEndsAt: end }),
    ).toBe('PROFILE_COMPLETE');
  });
  it('access end passed counts as lapsed', () =>
    expect(
      deriveStage({ ...base, hasActiveSubscription: true, capturedPayments: 1, accessEndsAt: new Date(Date.now() - 86400000) }),
    ).toBe('LAPSED'));
});
