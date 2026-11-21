import { AttemptStatus, PaperStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { QuestionPapersService } from './question-papers.service';

const LIMIT_MIN = 180;
const start = new Date('2026-11-18T16:59:06Z');
const deadline = new Date(start.getTime() + LIMIT_MIN * 60 * 1000);
const saved = { q1: 'A', q2: 'essay', _submittedSections: ['s1'] };

function setup(attempt: any) {
  const prisma: any = {
    questionPaperVersion: {
      findUnique: jest.fn().mockResolvedValue({ id: 'v1', status: PaperStatus.PUBLISHED, timeLimitMinutes: LIMIT_MIN }),
    },
    testAttempt: {
      // startAttempt: 1st call = SUBMITTED/EXPIRED lookup, 2nd = STARTED lookup.
      // submitAttempt: single latest-attempt lookup.
      findFirst: jest.fn(),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...attempt, ...data })),
      findUnique: jest.fn().mockResolvedValue(null), // calculateAutoScore no-op
    },
  };
  const service = new QuestionPapersService(prisma);
  return { prisma, service };
}

describe('overdue attempts are finalized, not expired', () => {
  afterEach(() => jest.useRealTimers());

  it('startAttempt on an overdue STARTED attempt submits its autosaved answers at the deadline', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-19T06:27:06Z'));
    const attempt = { id: 'a1', startTime: start, status: AttemptStatus.STARTED, answers: saved };
    const { prisma, service } = setup(attempt);
    prisma.testAttempt.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(attempt);

    const result = await service.startAttempt('v1', 'u1');

    expect(prisma.testAttempt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: AttemptStatus.SUBMITTED, endTime: deadline, answers: saved },
    });
    expect(result.status).toBe(AttemptStatus.SUBMITTED);
    expect(prisma.testAttempt.findUnique).toHaveBeenCalled(); // auto-scored
  });

  it('startAttempt within the limit returns the ongoing attempt untouched', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-18T18:00:00Z'));
    const attempt = { id: 'a1', startTime: start, status: AttemptStatus.STARTED, answers: saved };
    const { prisma, service } = setup(attempt);
    prisma.testAttempt.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(attempt);

    await expect(service.startAttempt('v1', 'u1')).resolves.toBe(attempt);
    expect(prisma.testAttempt.update).not.toHaveBeenCalled();
  });

  it('submitAttempt recovers an EXPIRED attempt that has autosaved answers', async () => {
    const attempt = { id: 'a1', startTime: start, status: AttemptStatus.EXPIRED, answers: saved, version: { timeLimitMinutes: LIMIT_MIN } };
    const { prisma, service } = setup(attempt);
    prisma.testAttempt.findFirst.mockResolvedValue(attempt);

    const logs = [{ type: 'AWAY', timestamp: 'x' }];
    const result = await service.submitAttempt('v1', 'u1', { answers: { q1: 'B', _proctoringLogs: logs } });

    expect(prisma.testAttempt.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { status: AttemptStatus.SUBMITTED, endTime: deadline, answers: { ...saved, _proctoringLogs: logs } },
    });
    expect(result.status).toBe(AttemptStatus.SUBMITTED);
  });

  it('submitAttempt still rejects an EXPIRED attempt with nothing saved', async () => {
    const attempt = { id: 'a1', startTime: start, status: AttemptStatus.EXPIRED, answers: null, version: { timeLimitMinutes: LIMIT_MIN } };
    const { prisma, service } = setup(attempt);
    prisma.testAttempt.findFirst.mockResolvedValue(attempt);

    await expect(service.submitAttempt('v1', 'u1', { answers: { q1: 'B' } })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a late submit keeps only autosaved answers; a repeat submit is a no-op', async () => {
    jest.useFakeTimers().setSystemTime(new Date(deadline.getTime() + 10 * 60 * 1000));
    const attempt = { id: 'a1', startTime: start, status: AttemptStatus.STARTED, answers: saved, version: { timeLimitMinutes: LIMIT_MIN } };
    const { prisma, service } = setup(attempt);
    prisma.testAttempt.findFirst.mockResolvedValue(attempt);

    await service.submitAttempt('v1', 'u1', { answers: { q1: 'CHANGED' } });
    expect(prisma.testAttempt.update.mock.calls[0][0].data).toEqual({ status: AttemptStatus.SUBMITTED, endTime: deadline, answers: saved });

    const submitted = { ...attempt, status: AttemptStatus.SUBMITTED };
    prisma.testAttempt.findFirst.mockResolvedValue(submitted);
    await expect(service.submitAttempt('v1', 'u1', { answers: {} })).resolves.toBe(submitted);
    expect(prisma.testAttempt.update).toHaveBeenCalledTimes(1);
  });
});
