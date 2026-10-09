import { BadRequestException, ConflictException } from '@nestjs/common';
import { CompanyInterviewAdminService } from './company-interview-admin.service';

const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
const student = {
  id: 's1', role: 'USER', email: 'stu@x.test', name: 'Stu',
  profile: { isComplete: true, fullName: 'Asha Rao', college: 'NLSIU', specialization: 'Corporate Law' },
};
const company = {
  id: 'c1', role: 'COMPANY', email: 'hr@firm.test',
  companyProfile: { companyName: 'Firm & Co', operatorName: 'Ravi', verificationStatus: 'APPROVED' },
};

function build(over: { existing?: any; calendar?: Partial<{ isConfigured: boolean; canInviteAttendees: boolean }>; txFails?: boolean; mailFails?: string } = {}) {
  const tx: any = {
    companyInterview: {
      upsert: jest.fn(async ({ create }: any) => {
        if (over.txFails) throw new Error('db down');
        return { id: 'ci1', ...create };
      }),
      update: jest.fn(async ({ data }: any) => ({ ...over.existing, ...data, rescheduleCount: 1 })),
    },
    crmActivity: { create: jest.fn() },
  };
  const prisma: any = {
    user: { findUnique: jest.fn(({ where }: any) => (where.id === 's1' ? student : where.id === 'c1' ? company : null)) },
    companyInterview: {
      findUnique: jest.fn().mockResolvedValue(over.existing ?? null),
      update: jest.fn(async ({ data }: any) => ({ id: 'ci1', extraAttendees: [], ...data })),
      count: jest.fn().mockResolvedValue(0),
    },
    interview: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const calendar: any = {
    isConfigured: true,
    canInviteAttendees: true,
    ...over.calendar,
    createEvent: jest.fn().mockResolvedValue({ eventId: 'evt1', meetLink: 'https://meet.google.com/abc-defg-hij' }),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  };
  const mail: any = {
    renderCompanyInterview: jest.fn(async (p: any) => ({ subject: `${p.variant}:${p.audience}`, html: `<p>${p.meetLink}</p>`, text: '' })),
    sendCompanyInterview: jest.fn(async (to: string) => {
      if (over.mailFails && to === over.mailFails) throw new Error('smtp');
    }),
  };
  const crm: any = {
    stageOf: jest.fn().mockResolvedValue('PAID'),
    isDoNotContact: jest.fn().mockResolvedValue(false),
    systemActivity: jest.fn((userId, actorId, type, note, stage) => ({ userId, actorId, type, note, stageAtActivity: stage })),
  };
  return { svc: new CompanyInterviewAdminService(prisma, calendar, mail, crm), prisma, tx, calendar, mail, crm };
}

const input = { companyId: 'c1', studentId: 's1', start: future, durationMin: 45, message: 'Bring your writing sample', extraAttendees: ['Partner@Firm.test', 'hr@firm.test'] };

describe('CompanyInterviewAdminService.schedule', () => {
  it('creates the invite with all attendees, saves it, logs CRM activity and emails both sides', async () => {
    const { svc, calendar, tx, mail, prisma } = build();
    const out = await svc.schedule(input, 'admin1');

    const ev = calendar.createEvent.mock.calls[0][0];
    expect(ev.attendees.map((a: any) => a.email)).toEqual(['stu@x.test', 'hr@firm.test', 'partner@firm.test']);
    expect(ev.endTime.getTime() - ev.startTime.getTime()).toBe(45 * 60000);

    expect(tx.companyInterview.upsert.mock.calls[0][0].create).toMatchObject({
      source: 'SUPERADMIN', googleEventId: 'evt1', meetLink: 'https://meet.google.com/abc-defg-hij', scheduledById: 'admin1', extraAttendees: ['partner@firm.test'],
    });
    expect(tx.crmActivity.create.mock.calls[0][0].data).toMatchObject({ userId: 's1', type: 'INTERVIEW_SCHEDULED', stageAtActivity: 'PAID' });
    expect(mail.sendCompanyInterview.mock.calls.map((c: any[]) => c[0])).toEqual(['stu@x.test', 'hr@firm.test', 'partner@firm.test']);
    expect(prisma.companyInterview.update.mock.calls[0][0].data).toEqual({ studentEmailSentAt: expect.any(Date), companyEmailSentAt: expect.any(Date) });
    expect(out.emails).toEqual({ student: 'sent', company: 'sent' });
  });

  it('deletes the calendar event when saving fails', async () => {
    const { svc, calendar, mail } = build({ txFails: true });
    await expect(svc.schedule(input, 'admin1')).rejects.toThrow('db down');
    expect(calendar.deleteEvent).toHaveBeenCalledWith('evt1');
    expect(mail.sendCompanyInterview).not.toHaveBeenCalled();
  });

  it('reports a failed email without undoing the interview', async () => {
    const { svc, prisma } = build({ mailFails: 'stu@x.test' });
    const out = await svc.schedule(input, 'admin1');
    expect(out.emails).toEqual({ student: 'failed', company: 'sent' });
    expect(prisma.companyInterview.update.mock.calls[0][0].data).toEqual({ companyEmailSentAt: expect.any(Date) });
  });

  it('refuses a second scheduled interview for the same pair', async () => {
    const { svc } = build({ existing: { id: 'ci0', status: 'SCHEDULED' } });
    await expect(svc.schedule(input, 'admin1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('needs a meeting link when Google Calendar is not connected', async () => {
    const { svc } = build({ calendar: { isConfigured: false, canInviteAttendees: false } });
    await expect(svc.schedule(input, 'admin1')).rejects.toThrow(/meeting link/);
    const ok = build({ calendar: { isConfigured: false, canInviteAttendees: false } });
    await ok.svc.schedule({ ...input, manualMeetLink: 'https://zoom.us/j/1' }, 'admin1');
    expect(ok.calendar.createEvent).not.toHaveBeenCalled();
    expect(ok.tx.companyInterview.upsert.mock.calls[0][0].create).toMatchObject({ meetLink: 'https://zoom.us/j/1', googleEventId: null });
  });

  it('validates the time, duration and attendees', async () => {
    const { svc } = build();
    await expect(svc.schedule({ ...input, start: '2020-01-01T10:00:00Z' }, 'a')).rejects.toThrow(/past/);
    await expect(svc.schedule({ ...input, durationMin: 5 }, 'a')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.schedule({ ...input, extraAttendees: ['nope'] }, 'a')).rejects.toThrow(/valid email/);
    await expect(svc.schedule({ ...input, manualMeetLink: 'http://insecure.test' }, 'a')).rejects.toThrow(/https/);
  });
});

describe('CompanyInterviewAdminService reschedule and cancel', () => {
  const existing = {
    id: 'ci1', companyId: 'c1', studentId: 's1', status: 'SCHEDULED', googleEventId: 'evt1', meetLink: 'https://meet.google.com/x',
    scheduledAt: new Date(Date.now() + 86_400_000), endTime: new Date(Date.now() + 86_400_000 + 3_600_000), extraAttendees: [],
  };

  it('moves the calendar event and emails the previous time', async () => {
    const { svc, calendar, tx, mail } = build({ existing });
    await svc.reschedule('ci1', { start: future, durationMin: 30 }, 'admin1');
    expect(calendar.updateEvent).toHaveBeenCalledWith('evt1', expect.objectContaining({ startTime: new Date(future) }));
    expect(tx.companyInterview.update.mock.calls[0][0].data).toMatchObject({ rescheduleCount: { increment: 1 } });
    expect(tx.crmActivity.create.mock.calls[0][0].data.type).toBe('INTERVIEW_RESCHEDULED');
    expect(mail.renderCompanyInterview.mock.calls[0][0]).toMatchObject({ variant: 'rescheduled', previousFormattedDate: expect.any(String) });
  });

  it('removes the calendar event on cancel and records the reason', async () => {
    const { svc, calendar, tx, mail } = build({ existing });
    await svc.cancel('ci1', { reason: 'Company postponed hiring' }, 'admin1');
    expect(calendar.deleteEvent).toHaveBeenCalledWith('evt1');
    expect(tx.companyInterview.update.mock.calls[0][0].data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Company postponed hiring', googleEventId: null });
    expect(mail.renderCompanyInterview.mock.calls[0][0]).toMatchObject({ variant: 'cancelled', cancelReason: 'Company postponed hiring' });
  });

  it('does not change interviews that are no longer scheduled', async () => {
    const { svc } = build({ existing: { ...existing, status: 'CANCELLED' } });
    await expect(svc.reschedule('ci1', { start: future }, 'a')).rejects.toThrow(/Only scheduled/);
  });
});

describe('CompanyInterviewAdminService.preview', () => {
  it('returns both emails, the calendar summary and warnings', async () => {
    const { svc, crm, prisma } = build();
    crm.isDoNotContact.mockResolvedValue(true);
    prisma.companyInterview.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const out = await svc.preview(input);
    expect(out.student.to).toEqual(['stu@x.test']);
    expect(out.company.to).toEqual(['hr@firm.test', 'partner@firm.test']);
    expect(out.calendar).toMatchObject({ action: 'create', meetLinkGenerated: true });
    expect(out.warnings).toEqual(expect.arrayContaining([expect.stringMatching(/another company interview/), expect.stringMatching(/Do not contact/)]));
  });
});

describe('CompanyInterviewAdminService with legacy rows (no endTime)', () => {
  const legacy = {
    id: 'ci1', companyId: 'c1', studentId: 's1', status: 'SCHEDULED', googleEventId: null, meetLink: null,
    scheduledAt: new Date(Date.now() + 86_400_000), endTime: null, extraAttendees: [], rescheduleCount: 0,
    inviteMessage: null, cancelReason: null,
  };

  it('cancels and resends with a one-hour slot', async () => {
    const { svc, mail } = build({ existing: legacy });
    await svc.cancel('ci1', { reason: 'Moved' }, 'admin1');
    expect(mail.renderCompanyInterview.mock.calls[0][0]).toMatchObject({ variant: 'cancelled', durationMin: 60 });

    const again = build({ existing: legacy });
    await again.svc.resendEmails('ci1');
    expect(again.mail.renderCompanyInterview.mock.calls[0][0]).toMatchObject({ variant: 'scheduled', durationMin: 60 });
  });

  it('reschedules without a calendar event', async () => {
    const { svc, calendar, tx } = build({ existing: legacy });
    await svc.reschedule('ci1', { start: future, durationMin: 30 }, 'admin1');
    expect(calendar.updateEvent).not.toHaveBeenCalled();
    expect(tx.companyInterview.update.mock.calls[0][0].data.endTime.getTime()).toBe(new Date(future).getTime() + 30 * 60000);
  });

  it('lists them with a computed end time', async () => {
    const { svc, prisma } = build();
    prisma.companyInterview.findMany = jest.fn().mockResolvedValue([
      { ...legacy, student: { id: 's1', email: 'stu@x.test', name: 'Stu', profile: null }, company: { id: 'c1', email: 'hr@firm.test', companyProfile: null }, scheduledBy: null },
    ]);
    const out = await svc.list({});
    expect(out.rows[0]!.endTime.getTime() - legacy.scheduledAt.getTime()).toBe(3_600_000);
  });
});
