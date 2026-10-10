import { InterviewStatus } from '@prisma/client';
import { InterviewService } from './interview.service';

const start = new Date(Date.now() + 86_400_000);
const end = new Date(start.getTime() + 30 * 60_000);

function build(over: { calendarFails?: boolean; synced?: boolean; claimLost?: boolean } = {}) {
  const row: any = {
    id: 'i1',
    status: InterviewStatus.SCHEDULED,
    calendarSyncedAt: over.synced ? new Date() : null,
    calendarSyncAttempts: 0,
    student: { email: 'stu@x.test', name: 'Stu' },
    interviewer: { email: 'int@x.test', name: 'Manjari' },
    slot: { startTime: start, endTime: end },
  };
  const prisma: any = {
    interview: {
      findUnique: jest.fn().mockResolvedValue(row),
      findMany: jest.fn().mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]),
      updateMany: jest.fn().mockResolvedValue({ count: over.claimLost ? 0 : 1 }),
      update: jest.fn(),
    },
  };
  const calendar: any = {
    createInterviewEvent: over.calendarFails
      ? jest.fn().mockRejectedValue(new Error('invalid_grant [HTTP 400]'))
      : jest.fn().mockResolvedValue({ eventId: 'evt1', meetLink: 'https://meet.google.com/abc' }),
  };
  const mail: any = { sendInterviewScheduled: jest.fn() };
  return { svc: new InterviewService(prisma, mail, calendar), prisma, calendar, mail };
}

describe('InterviewService calendar sync', () => {
  it('saves the Meet link and emails both sides once the event is created', async () => {
    const { svc, prisma, mail } = build();
    await expect(svc.trySyncCalendar('i1')).resolves.toBe('synced');
    expect(prisma.interview.update).toHaveBeenCalledWith({
      where: { id: 'i1' },
      data: expect.objectContaining({ meetLink: 'https://meet.google.com/abc', googleEventId: 'evt1', calendarSyncedAt: expect.any(Date) }),
    });
    expect(mail.sendInterviewScheduled).toHaveBeenCalledTimes(2);
  });

  it('leaves the booking pending and sends no email when Google fails', async () => {
    const { svc, prisma, mail } = build({ calendarFails: true });
    await expect(svc.trySyncCalendar('i1')).resolves.toBe('failed');
    expect(prisma.interview.updateMany).toHaveBeenCalled(); // attempt counted
    expect(prisma.interview.update).not.toHaveBeenCalled();
    expect(mail.sendInterviewScheduled).not.toHaveBeenCalled();
  });

  it('does nothing when another caller already claimed the attempt or it is already synced', async () => {
    for (const over of [{ claimLost: true }, { synced: true }]) {
      const { svc, calendar } = build(over);
      await expect(svc.trySyncCalendar('i1')).resolves.toBe('skipped');
      expect(calendar.createInterviewEvent).not.toHaveBeenCalled();
    }
  });

  it('stops the batch at the first failure so attempts are not burned while Google is down', async () => {
    const { svc, calendar } = build({ calendarFails: true });
    await expect(svc.syncPendingInterviews()).resolves.toEqual({ pending: 2, synced: 0 });
    expect(calendar.createInterviewEvent).toHaveBeenCalledTimes(1);
  });

  it('moves past rows that turn out to need nothing', async () => {
    const { svc, prisma, calendar } = build({ claimLost: true });
    await expect(svc.syncPendingInterviews()).resolves.toEqual({ pending: 2, synced: 0 });
    expect(prisma.interview.updateMany).toHaveBeenCalledTimes(2);
    expect(calendar.createInterviewEvent).not.toHaveBeenCalled();
  });
});
