import { BadRequestException, ConflictException } from '@nestjs/common';
import { InterviewStatus, Role } from '@prisma/client';
import { InterviewService } from './interview.service';

const start = new Date(Date.now() + 86_400_000);
const end = new Date(start.getTime() + 30 * 60_000);

function build(over: { synced?: boolean; status?: InterviewStatus; clash?: boolean; slotTaken?: boolean; raced?: boolean } = {}) {
  const synced = over.synced ?? true;
  const interview: any = {
    id: 'i1',
    studentId: 's1',
    interviewerId: 'a',
    slotId: 'slotA',
    status: over.status ?? InterviewStatus.SCHEDULED,
    slot: { id: 'slotA', startTime: start, endTime: end },
  };
  const updated: any = {
    ...interview,
    interviewerId: 'b',
    meetLink: synced ? 'https://meet.google.com/abc' : null,
    googleEventId: synced ? 'evt1' : null,
    calendarSyncedAt: synced ? new Date() : null,
    student: { email: 'stu@x.test', name: 'Stu' },
    interviewer: { email: 'b@x.test', name: 'Bea' },
  };
  const calls: string[] = [];
  const tx: any = {
    interview: {
      updateMany: jest.fn(async () => { calls.push('repoint'); return { count: over.raced ? 0 : 1 }; }),
    },
    interviewSlot: {
      findFirst: jest.fn().mockResolvedValue(over.clash ? { id: 'busy' } : null),
      deleteMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(async () => { calls.push('claim'); return { count: over.slotTaken ? 0 : 1 }; }),
      delete: jest.fn(async () => { calls.push('deleteOld'); }),
    },
  };
  const prisma: any = {
    interview: {
      findUnique: jest.fn().mockResolvedValue(interview),
      findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
    },
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'b', name: 'Bea', role: Role.INTERVIEWER }) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  const calendar: any = { updateEvent: jest.fn() };
  const mail: any = { sendInterviewScheduled: jest.fn() };
  const svc = new InterviewService(prisma, mail, calendar);
  const sync = jest.spyOn(svc, 'trySyncCalendar').mockResolvedValue('synced');
  return { svc, prisma, tx, calendar, mail, sync, calls };
}

describe('InterviewService.reassignInterview', () => {
  it('same time: hands the slot to the new interviewer, frees their overlapping availability and updates the event', async () => {
    const { svc, tx, calendar, mail, sync } = build();
    await svc.reassignInterview('i1', { newInterviewerId: 'b' });

    expect(tx.interviewSlot.deleteMany).toHaveBeenCalledWith({
      where: { interviewerId: 'b', startTime: { lt: end }, endTime: { gt: start }, isBooked: false },
    });
    expect(tx.interviewSlot.update).toHaveBeenCalledWith({ where: { id: 'slotA' }, data: { interviewerId: 'b' } });
    expect(tx.interview.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { interviewerId: 'b' } }));
    expect(calendar.updateEvent).toHaveBeenCalledWith('evt1', expect.objectContaining({
      attendees: [{ email: 'stu@x.test', displayName: 'Stu' }, { email: 'b@x.test', displayName: 'Bea' }],
    }));
    expect(mail.sendInterviewScheduled).toHaveBeenCalledTimes(2);
    expect(mail.sendInterviewScheduled).toHaveBeenCalledWith('b@x.test', 'Stu', 'Bea', start, 'https://meet.google.com/abc', true);
    expect(sync).not.toHaveBeenCalled();
  });

  it('same time: refuses when the new interviewer is already booked then', async () => {
    const { svc, tx } = build({ clash: true });
    await expect(svc.reassignInterview('i1', { newInterviewerId: 'b' })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.interviewSlot.update).not.toHaveBeenCalled();
  });

  it('open slot: claims it, re-points the interview, then deletes the old slot', async () => {
    const { svc, tx, calls } = build();
    await svc.reassignInterview('i1', { newInterviewerId: 'b', slotId: 'slotB' });

    expect(tx.interview.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { interviewerId: 'b', slotId: 'slotB' } }));
    expect(tx.interviewSlot.delete).toHaveBeenCalledWith({ where: { id: 'slotA' } });
    expect(calls).toEqual(['claim', 'repoint', 'deleteOld']);
  });

  it('open slot: fails when the slot was taken meanwhile', async () => {
    const { svc, tx } = build({ slotTaken: true });
    await expect(svc.reassignInterview('i1', { newInterviewerId: 'b', slotId: 'slotB' })).rejects.toThrow('Slot is no longer available');
    expect(tx.interviewSlot.delete).not.toHaveBeenCalled();
  });

  it('conflicts when the interview changed concurrently', async () => {
    const { svc } = build({ raced: true });
    await expect(svc.reassignInterview('i1', { newInterviewerId: 'b' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects completed interviews and the same interviewer', async () => {
    await expect(build({ status: InterviewStatus.COMPLETED }).svc.reassignInterview('i1', { newInterviewerId: 'b' }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(build().svc.reassignInterview('i1', { newInterviewerId: 'a' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('not yet synced: leaves event creation and emails to the normal calendar sync', async () => {
    const { svc, calendar, mail, sync } = build({ synced: false });
    await svc.reassignInterview('i1', { newInterviewerId: 'b' });
    expect(sync).toHaveBeenCalledWith('i1');
    expect(calendar.updateEvent).not.toHaveBeenCalled();
    expect(mail.sendInterviewScheduled).not.toHaveBeenCalled();
  });
});
