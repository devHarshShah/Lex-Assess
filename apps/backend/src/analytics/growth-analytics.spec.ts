import { buildCohorts, median, weekStart } from './growth-analytics.service';
import { clickStats, unsubByPosition } from './email-analytics.service';

describe('growth helpers', () => {
  it('computes medians', () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('starts weeks on Monday (UTC)', () => {
    expect(weekStart(new Date('2026-10-11T10:00:00Z'))).toBe('2026-10-05'); // a Sunday
    expect(weekStart(new Date('2026-10-05T00:00:00Z'))).toBe('2026-10-05');
  });

  it('leaves cohort weeks that have not elapsed empty', () => {
    const users = [
      { id: 'a', createdAt: new Date('2026-09-21T09:00:00Z') },
      { id: 'b', createdAt: new Date('2026-09-22T09:00:00Z') },
    ];
    const firstPayment = new Map([['a', new Date('2026-09-23T09:00:00Z')]]);
    const [cohort] = buildCohorts({ users, firstPayment, weeks: 3 }, new Date('2026-10-06T00:00:00Z'));
    expect(cohort?.size).toBe(2);
    // week 1 is settled (the week ended 09-28, +7d = 10-05); week 2 is not
    expect(cohort?.paidByWeek).toEqual([50, null, null]);
  });

  it('does not show a cell while the cohort week itself is still running', () => {
    const users = [{ id: 'a', createdAt: new Date('2026-10-05T09:00:00Z') }];
    const [cohort] = buildCohorts({ users, firstPayment: new Map(), weeks: 2 }, new Date('2026-10-11T00:00:00Z'));
    expect(cohort?.paidByWeek).toEqual([null, null]);
  });
});

describe('clickStats', () => {
  const t = (iso: string) => new Date(iso);
  it('counts a purchase only inside the 7 day window after the first click', () => {
    const sent = [
      { userId: 'u1', firstClickedAt: t('2026-10-01T00:00:00Z'), clickCount: 2 },
      { userId: 'u2', firstClickedAt: t('2026-10-01T00:00:00Z'), clickCount: 1 },
      { userId: 'u3', firstClickedAt: null, clickCount: 0 },
    ];
    const payments = [
      { userId: 'u1', createdAt: t('2026-10-03T00:00:00Z') }, // inside
      { userId: 'u2', createdAt: t('2026-10-12T00:00:00Z') }, // too late
      { userId: 'u3', createdAt: t('2026-10-02T00:00:00Z') }, // never clicked
    ];
    expect(clickStats(sent, payments, [])).toEqual({ clicked: 2, clicks: 3, clickConverted: 1 });
  });

  it('counts a confirmed coupon redemption after the click', () => {
    const sent = [{ userId: 'u1', firstClickedAt: t('2026-10-01T00:00:00Z'), clickCount: 1 }];
    expect(clickStats(sent, [], [{ userId: 'u1', confirmedAt: t('2026-10-02T00:00:00Z') }]).clickConverted).toBe(1);
  });
});

describe('clickStats edge cases', () => {
  const t = (iso: string) => new Date(iso);
  it('ignores students who were already paying when mailed', () => {
    const sent = [{ userId: 'u1', firstClickedAt: t('2026-10-01T00:00:00Z'), clickCount: 1, stageAtSend: 'PAID' }];
    const r = clickStats(sent, [{ userId: 'u1', createdAt: t('2026-10-02T00:00:00Z') }], []);
    expect(r).toEqual({ clicked: 1, clicks: 1, clickConverted: 0 });
  });
});

describe('unsubByPosition', () => {
  const t = (iso: string) => new Date(iso);
  it('attributes an unsubscribe to the mail just before it, not to people who stopped receiving mail', () => {
    const byUser = new Map([
      ['a', [t('2026-10-01T00:00:00Z')]], // unsubscribed after mail 1
      ['b', [t('2026-10-01T00:00:00Z'), t('2026-10-05T00:00:00Z')]], // stayed
      ['c', [t('2026-10-01T00:00:00Z'), t('2026-10-05T00:00:00Z')]], // unsubscribed after mail 2
    ]);
    const unsub = new Map([
      ['a', t('2026-10-02T00:00:00Z')],
      ['c', t('2026-10-06T00:00:00Z')],
    ]);
    const [first, second] = unsubByPosition(byUser, unsub);
    expect(first).toMatchObject({ students: 3, unsubscribed: 1 });
    expect(second).toMatchObject({ students: 2, unsubscribed: 1, unsubPct: 50 });
  });
});
