import { Injectable } from '@nestjs/common';
import { AttemptStatus, InterviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RANK_WEIGHT_CV, RANK_WEIGHT_INTERVIEW, RANK_WEIGHT_TEST } from './ranking.constants';
import { computeVersionMarks, SectionQuestionMark, SectionRule } from './scoring.util';

export interface RankedCandidate {
  rank: number;
  studentId: string;
  anonymizedId: string;
  practiceArea: string;
  testScore: number;
  testMaxScore: number;
  normalizedTest: number;
  interviewMarks: number;
  cvScore: number;
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
  cvScore: number;
  commonScore: number;
}

const RANKING_CACHE_TTL_MS = 60_000;

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  // Computing the global ranking is expensive (several queries + full in-memory
  // scoring over every submitted attempt). The result is identical for every
  // caller, so memoize it briefly to absorb leaderboard/rank request bursts.
  private rankingCache: { value: RankedCandidate[]; expiresAt: number } | null = null;
  private inFlight: Promise<RankedCandidate[]> | null = null;

  async computeGlobalRanking(): Promise<RankedCandidate[]> {
    const now = Date.now();
    if (this.rankingCache && this.rankingCache.expiresAt > now) {
      return this.rankingCache.value;
    }
    // Collapse concurrent recomputations into a single DB pass.
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.computeGlobalRankingUncached()
      .then((value) => {
        this.rankingCache = { value, expiresAt: Date.now() + RANKING_CACHE_TTL_MS };
        return value;
      })
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  private async computeGlobalRankingUncached(): Promise<RankedCandidate[]> {
    const attempts = await this.prisma.testAttempt.findMany({
      where: { status: AttemptStatus.SUBMITTED, score: { not: null } },
      include: {
        user: { select: { id: true, profile: { select: { rollNumber: true, cvScore: true } } } },
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

    const parentQuestions = await this.prisma.question.findMany({
      where: { versionId: { in: versionIds }, parentId: null },
      select: { id: true, versionId: true, sectionId: true, marks: true },
    });
    const questionsByVersionId = new Map<string, SectionQuestionMark[]>();
    for (const question of parentQuestions) {
      const list = questionsByVersionId.get(question.versionId) ?? [];
      list.push({ questionId: question.id, sectionId: question.sectionId, marks: question.marks });
      questionsByVersionId.set(question.versionId, list);
    }

    const sections = await this.prisma.paperSection.findMany({
      where: { versionId: { in: versionIds } },
      select: { id: true, rules: true },
    });
    const sectionRules = new Map<string, SectionRule>(
      sections.map((section) => [section.id, (section.rules as SectionRule | null) ?? {}]),
    );

    const bestByStudentId = new Map<string, CandidateAccumulator>();
    for (const attempt of attempts) {
      const interviewMarks = interviewByStudentId.get(attempt.user.id);
      if (interviewMarks === undefined) continue;

      const cvScore = attempt.user.profile?.cvScore;
      if (cvScore === undefined || cvScore === null) continue;

      const questions = questionsByVersionId.get(attempt.versionId) ?? [];
      const achievedByQuestionId = new Map<string, number>(
        Object.entries((attempt.questionScores as Record<string, number> | null) ?? {}),
      );
      const { maxMarks, achievedMarks } = computeVersionMarks(questions, sectionRules, achievedByQuestionId);
      if (maxMarks === 0) continue;

      const normalizedTest = (achievedMarks / maxMarks) * 100;
      const commonScore =
        RANK_WEIGHT_TEST * normalizedTest + RANK_WEIGHT_INTERVIEW * interviewMarks + RANK_WEIGHT_CV * cvScore;

      const existing = bestByStudentId.get(attempt.user.id);
      if (!existing || commonScore > existing.commonScore) {
        bestByStudentId.set(attempt.user.id, {
          studentId: attempt.user.id,
          rollNumber: attempt.user.profile?.rollNumber ?? null,
          practiceArea: attempt.version.paper.specialization.name,
          testScore: achievedMarks,
          testMaxScore: maxMarks,
          normalizedTest,
          interviewMarks,
          cvScore,
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
