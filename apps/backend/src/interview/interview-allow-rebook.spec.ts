import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InterviewStatus } from '@prisma/client';
import { InterviewService } from './interview.service';

function build(over: { updated?: number; existing?: any } = {}) {
  const prisma: any = {
    interview: {
      updateMany: jest.fn().mockResolvedValue({ count: over.updated ?? 1 }),
      findUnique: jest.fn().mockResolvedValue(over.existing ?? null),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'i1', status: InterviewStatus.CANCELLED }),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const svc = new InterviewService(prisma, {} as any, {} as any);
  return { svc, prisma };
}

describe('InterviewService.allowRebook', () => {
  it('cancels only a past, still-SCHEDULED interview', async () => {
    const { svc, prisma } = build();
    const res = await svc.allowRebook('i1');

    const { where, data } = prisma.interview.updateMany.mock.calls[0][0];
    expect(where.id).toBe('i1');
    expect(where.status).toBe(InterviewStatus.SCHEDULED);
    expect(where.slot.endTime.lte).toBeInstanceOf(Date);
    expect(data).toEqual({ status: InterviewStatus.CANCELLED });
    expect(res.status).toBe(InterviewStatus.CANCELLED);
  });

  it('rejects an upcoming or completed interview', async () => {
    const { svc } = build({ updated: 0, existing: { id: 'i1', status: InterviewStatus.COMPLETED } });
    await expect(svc.allowRebook('i1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s for an unknown interview', async () => {
    const { svc } = build({ updated: 0 });
    await expect(svc.allowRebook('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('after allowRebook', () => {
  it('a cancelled interview no longer blocks booking, and is hidden from the student', async () => {
    const { svc, prisma } = build();
    await svc.getStudentInterviews('s1');
    expect(prisma.interview.findMany.mock.calls[0][0].where).toEqual({ studentId: 's1', status: { not: InterviewStatus.CANCELLED } });
  });

  it('interviewers cannot file feedback on a cancelled interview', async () => {
    const { svc, prisma } = build();
    prisma.interview.findUnique.mockResolvedValue({ id: 'i1', interviewerId: 'a', status: InterviewStatus.CANCELLED });
    await expect(svc.addFeedback('a', 'i1', { marks: 5, notes: '' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });
});
