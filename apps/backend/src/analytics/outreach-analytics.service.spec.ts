import { OutreachAnalyticsService } from './outreach-analytics.service';

const student = (id: string, stage: string, extra: any = {}) => ({ id, stage, profileComplete: true, mobile: '+91999', ...extra });

describe('OutreachAnalyticsService.crm', () => {
  it('counts lead statuses, call outcomes and conversion after first contact', async () => {
    const prisma: any = {
      crmLead: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'a', status: 'CONTACTED', nextFollowUpAt: null, contactAttempts: 2 },
          { userId: 'b', status: 'FOLLOW_UP', nextFollowUpAt: new Date('2020-01-01'), contactAttempts: 1 },
        ]),
      },
      crmActivity: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { type: 'CALL', callOutcome: 'NO_ANSWER', actorId: 'x', actor: { name: 'Admin' }, createdAt: new Date('2026-10-01') },
            { type: 'CALL', callOutcome: 'CONNECTED', actorId: 'x', actor: { name: 'Admin' }, createdAt: new Date('2026-10-02') },
            { type: 'NOTE', callOutcome: null, actorId: 'x', actor: { name: 'Admin' }, createdAt: new Date('2026-10-02') },
          ])
          .mockResolvedValueOnce([
            { userId: 'a', createdAt: new Date('2026-10-01'), stageAtActivity: 'PROFILE_COMPLETE' },
            { userId: 'b', createdAt: new Date('2026-10-02'), stageAtActivity: 'PROFILE_COMPLETE' },
          ]),
      },
      transaction: { findMany: jest.fn().mockResolvedValue([{ userId: 'a', amount: 49900, createdAt: new Date('2026-10-03') }]) },
    };
    const analytics: any = {
      buildRows: jest.fn().mockResolvedValue([student('a', 'PAID'), student('b', 'PROFILE_COMPLETE'), student('c', 'PROFILE_COMPLETE'), student('d', 'REGISTERED', { profileComplete: false })]),
    };
    const out = await new OutreachAnalyticsService(prisma, analytics).crm({});

    expect(out.totals).toMatchObject({ eligibleLeads: 3, neverContacted: 1, overdueFollowUps: 1, calls: 2, connectRatePct: 50, activities: 3 });
    expect(out.byStatus.find((s) => s.key === 'NEW')!.count).toBe(1);
    expect(out.conversion).toMatchObject({ contacted: 2, converted: 1, convertedPct: 50, paidAfterContact: 1, revenueInr: 499 });
    expect(out.byActor).toEqual([{ name: 'Admin', activities: 3, contacts: 2 }]);
  });
});

describe('OutreachAnalyticsService.companyInterviews', () => {
  it('summarises status, source, delivery and companies', async () => {
    const co = (name: string) => ({ email: `${name}@x`, companyProfile: { companyName: name } });
    const prisma: any = {
      companyInterview: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'COMPLETED', source: 'SUPERADMIN', scheduledAt: new Date('2026-10-01'), rescheduleCount: 1, studentEmailSentAt: new Date(), companyEmailSentAt: new Date(), studentId: 's1', company: co('A') },
          { status: 'CANCELLED', source: 'SUPERADMIN', scheduledAt: new Date('2026-10-02'), rescheduleCount: 0, studentEmailSentAt: null, companyEmailSentAt: new Date(), studentId: 's2', company: co('A') },
          { status: 'SCHEDULED', source: 'COMPANY', scheduledAt: new Date('2099-01-01'), rescheduleCount: 0, studentEmailSentAt: null, companyEmailSentAt: null, studentId: 's1', company: co('B') },
        ]),
      },
    };
    const out = await new OutreachAnalyticsService(prisma, {} as any).companyInterviews({});
    expect(out.totals).toMatchObject({ total: 3, upcoming: 1, completed: 1, cancelled: 1, students: 2, completionPct: 50, emailDeliveryPct: 50 });
    expect(out.byCompany[0]).toEqual({ label: 'A', scheduled: 0, completed: 1, cancelled: 1 });
  });
});
