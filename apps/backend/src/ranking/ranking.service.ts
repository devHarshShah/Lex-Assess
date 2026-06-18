import { Injectable } from '@nestjs/common';
import { AttemptStatus, InterviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RANK_WEIGHT_INTERVIEW, RANK_WEIGHT_TEST } from './ranking.constants';

export interface RankedCandidate {
  rank: number;
  studentId: string;
  anonymizedId: string;
  practiceArea: string;
  testScore: number;
  testMaxScore: number;
  normalizedTest: number;
  interviewMarks: number;
  commonScore: number;
}

interface CandidateAccumulator {
  studentId: string;
  rollNumber: string | null;
  practiceArea: string;
  testScore: number;
  testMaxScore: number;
  normalizedTest: number;
  interviewMarks: number;
  commonScore: number;
}

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async computeGlobalRanking(): Promise<RankedCandidate[]> {
    const attempts = await this.prisma.testAttempt.findMany({
      where: { status: AttemptStatus.SUBMITTED, score: { not: null } },
      include: {
        user: { select: { id: true, profile: { select: { rollNumber: true } } } },
        version: { include: { paper: { include: { specialization: true } } } },
      },
    });

    const interviews = await this.prisma.interview.findMany({
      where: { status: InterviewStatus.COMPLETED, marks: { not: null } },
      select: { studentId: true, marks: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    const interviewByStudentId = new Map<string, number>();
    for (const interview of interviews) {
      if (!interviewByStudentId.has(interview.studentId)) {
        interviewByStudentId.set(interview.studentId, interview.marks!);
      }
    }

    const versionIds = [...new Set(attempts.map((attempt) => attempt.versionId))];
    const sums = await this.prisma.question.groupBy({
      by: ['versionId'],
      where: { versionId: { in: versionIds } },
      _sum: { marks: true },
    });
    const maxScoreByVersionId = new Map(sums.map((sum) => [sum.versionId, sum._sum.marks ?? 0]));

    const bestByStudentId = new Map<string, CandidateAccumulator>();
    for (const attempt of attempts) {
      const interviewMarks = interviewByStudentId.get(attempt.user.id);
      if (interviewMarks === undefined) continue;

      const maxScore = maxScoreByVersionId.get(attempt.versionId) ?? 0;
      if (maxScore === 0) continue;

      const normalizedTest = (attempt.score! / maxScore) * 100;
      const commonScore = RANK_WEIGHT_TEST * normalizedTest + RANK_WEIGHT_INTERVIEW * interviewMarks;

      const existing = bestByStudentId.get(attempt.user.id);
      if (!existing || commonScore > existing.commonScore) {
        bestByStudentId.set(attempt.user.id, {
          studentId: attempt.user.id,
          rollNumber: attempt.user.profile?.rollNumber ?? null,
          practiceArea: attempt.version.paper.specialization.name,
          testScore: attempt.score!,
          testMaxScore: maxScore,
          normalizedTest,
          interviewMarks,
          commonScore,
        });
      }
    }

    return [...bestByStudentId.values()]
      .sort((a, b) => b.commonScore - a.commonScore)
      .map(({ rollNumber, ...entry }, index) => ({
        ...entry,
        rank: index + 1,
        anonymizedId: rollNumber ?? `LX-${entry.studentId.slice(-5).toUpperCase()}`,
      }));
  }

  async getStudentRank(studentId: string): Promise<RankedCandidate | null> {
    const all = await this.computeGlobalRanking();
    return all.find((entry) => entry.studentId === studentId) ?? null;
  }
}
