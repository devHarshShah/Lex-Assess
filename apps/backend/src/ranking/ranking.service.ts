import { BadRequestException, Injectable } from '@nestjs/common';
import { AttemptStatus, InterviewStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { activeAccessWhere, hasAccess } from '../payments/access';
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
const RELEASE_COOLDOWN_MS = 60_000;

export interface RankReleaseInfo {
  id: string;
  label: string;
  releasedAt: Date;
  candidateCount: number;
}

export interface ReleasedLeaderboard {
  release: Pick<RankReleaseInfo, 'label' | 'releasedAt'> | null;
  entries: { rank: number; anonymizedId: string; practiceArea: string }[];
}

export type RankStanding =
  | { status: 'RELEASED'; rank: number; releaseLabel: string; releasedAt: Date; commonScore: number }
  | {
      status: 'PENDING';
      // Where the candidate would sit in the last released leaderboard. The reference set is
      // frozen, so this never moves until the next release.
      provisionalRank: number | null;
      basedOnReleaseLabel: string | null;
      commonScore: number | null;
    };

export interface RankReleasePreview {
  eligibleCandidates: number;
  releasedCandidates: number;
  newCandidates: number;
  latestRelease: RankReleaseInfo | null;
}

// "September 2026", in IST so a release at 00:30 IST on the 1st is labelled for the new month.
function releaseLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(date);
}

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  // Live ranking over every eligible candidate. Nothing public reads this directly: ranks are only
  // published when an admin calls releaseRanks(), which snapshots this into RankRelease/RankEntry.
  // Computing it is expensive (several queries + full in-memory scoring over every submitted
  // attempt), so memoize it briefly for the release/preview/provisional callers.
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
      where: { status: AttemptStatus.SUBMITTED, score: { not: null }, user: activeAccessWhere() },
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
      .sort(
        (a, b) =>
          b.commonScore - a.commonScore ||
          b.normalizedTest - a.normalizedTest ||
          a.studentId.localeCompare(b.studentId),
      )
      .map(({ rollNumber, ...entry }, index) => ({
        ...entry,
        rank: index + 1,
        anonymizedId: rollNumber ?? `LX-${entry.studentId.slice(-5).toUpperCase()}`,
      }));
  }

  async getLiveEntry(studentId: string): Promise<RankedCandidate | null> {
    const all = await this.computeGlobalRanking();
    return all.find((entry) => entry.studentId === studentId) ?? null;
  }

  async getLatestRelease(): Promise<RankReleaseInfo | null> {
    return this.prisma.rankRelease.findFirst({
      orderBy: { releasedAt: 'desc' },
      select: { id: true, label: true, releasedAt: true, candidateCount: true },
    });
  }

  async listReleases(): Promise<(RankReleaseInfo & { releasedByName: string })[]> {
    const releases = await this.prisma.rankRelease.findMany({
      orderBy: { releasedAt: 'desc' },
      include: { releasedBy: { select: { name: true } } },
    });
    return releases.map(({ releasedBy, ...release }) => ({ ...release, releasedByName: releasedBy.name }));
  }

  async releaseRanks(adminId: string): Promise<RankReleaseInfo> {
    const latest = await this.getLatestRelease();
    if (latest && Date.now() - latest.releasedAt.getTime() < RELEASE_COOLDOWN_MS) {
      throw new BadRequestException('Ranks were just released. Wait a minute before releasing again.');
    }

    // Bypass the memo: a release must reflect the state at the moment the admin pressed the button.
    this.rankingCache = null;
    const ranking = await this.computeGlobalRanking();
    if (ranking.length === 0) {
      throw new BadRequestException('No eligible candidates yet. A scored test and a completed, marked interview are required.');
    }

    const now = new Date();
    const release = await this.prisma.$transaction(async (tx) => {
      const created = await tx.rankRelease.create({
        data: { label: releaseLabel(now), releasedAt: now, releasedById: adminId, candidateCount: ranking.length },
        select: { id: true, label: true, releasedAt: true, candidateCount: true },
      });
      await tx.rankEntry.createMany({
        data: ranking.map((entry) => ({
          releaseId: created.id,
          userId: entry.studentId,
          rank: entry.rank,
          anonymizedId: entry.anonymizedId,
          practiceArea: entry.practiceArea,
          testScore: entry.testScore,
          testMaxScore: entry.testMaxScore,
          normalizedTest: entry.normalizedTest,
          interviewMarks: entry.interviewMarks,
          cvScore: entry.cvScore,
          commonScore: entry.commonScore,
        })),
      });
      return created;
    });
    return release;
  }

  async getPreview(): Promise<RankReleasePreview> {
    const [ranking, latestRelease] = await Promise.all([this.computeGlobalRanking(), this.getLatestRelease()]);
    const released = latestRelease
      ? await this.prisma.rankEntry.findMany({ where: { releaseId: latestRelease.id }, select: { userId: true } })
      : [];
    const releasedIds = new Set(released.map((entry) => entry.userId));
    return {
      eligibleCandidates: ranking.length,
      releasedCandidates: releasedIds.size,
      newCandidates: ranking.filter((entry) => !releasedIds.has(entry.studentId)).length,
      latestRelease,
    };
  }

  // Public list: only students who still have access, renumbered 1..n so hidden
  // students leave no gaps. Resubscribing brings a student back in on the next load.
  async getReleasedLeaderboard(limit?: number): Promise<ReleasedLeaderboard> {
    const release = await this.getLatestRelease();
    if (!release) return { release: null, entries: [] };

    const entries = await this.prisma.rankEntry.findMany({
      where: { releaseId: release.id, user: activeAccessWhere() },
      orderBy: { rank: 'asc' },
      ...(limit && limit > 0 ? { take: limit } : {}),
      select: { anonymizedId: true, practiceArea: true },
    });
    return {
      release: { label: release.label, releasedAt: release.releasedAt },
      entries: entries.map((entry, index) => ({ ...entry, rank: index + 1 })),
    };
  }

  // Admin list: everyone in the release. Students without access are kept but
  // marked softDeleted (no live rank); the rest are renumbered 1..n.
  async getReleasedFullLeaderboard() {
    const release = await this.getLatestRelease();
    if (!release) return { release: null, entries: [] };

    const entries = await this.prisma.rankEntry.findMany({
      where: { releaseId: release.id },
      orderBy: { rank: 'asc' },
      select: {
        rank: true,
        userId: true,
        anonymizedId: true,
        practiceArea: true,
        testScore: true,
        testMaxScore: true,
        normalizedTest: true,
        interviewMarks: true,
        cvScore: true,
        commonScore: true,
        user: { select: { hasActiveSubscription: true, accessEndsAt: true } },
      },
    });
    let nextRank = 1;
    return {
      release,
      entries: entries.map(({ userId, user, rank, ...entry }) => {
        const active = hasAccess(user);
        return {
          ...entry,
          studentId: userId,
          rank: active ? nextRank++ : null,
          releasedRank: rank,
          softDeleted: !active,
        };
      }),
    };
  }

  // Rank as of the newest release, or null when the student isn't in it. For a student
  // with access it is renumbered among students with access; otherwise the originally
  // released rank is returned (used to verify certificates already issued).
  async getReleasedRank(studentId: string) {
    const release = await this.getLatestRelease();
    if (!release) return null;
    const entry = await this.prisma.rankEntry.findUnique({
      where: { releaseId_userId: { releaseId: release.id, userId: studentId } },
      select: { rank: true, commonScore: true, user: { select: { hasActiveSubscription: true, accessEndsAt: true } } },
    });
    if (!entry) return null;
    let rank = entry.rank;
    if (hasAccess(entry.user)) {
      const ahead = await this.prisma.rankEntry.count({
        where: { releaseId: release.id, rank: { lt: entry.rank }, user: activeAccessWhere() },
      });
      rank = ahead + 1;
    }
    return { rank, commonScore: entry.commonScore, releaseLabel: release.label, releasedAt: release.releasedAt };
  }

  async getMyStanding(studentId: string): Promise<RankStanding> {
    const released = await this.getReleasedRank(studentId);
    if (released) return { status: 'RELEASED', ...released };

    const live = await this.getLiveEntry(studentId);
    const latest = await this.getLatestRelease();
    if (!live) return { status: 'PENDING', provisionalRank: null, basedOnReleaseLabel: latest?.label ?? null, commonScore: null };
    if (!latest) return { status: 'PENDING', provisionalRank: null, basedOnReleaseLabel: null, commonScore: live.commonScore };

    const ahead = await this.prisma.rankEntry.count({
      where: { releaseId: latest.id, commonScore: { gt: live.commonScore }, user: activeAccessWhere() },
    });
    return { status: 'PENDING', provisionalRank: ahead + 1, basedOnReleaseLabel: latest.label, commonScore: live.commonScore };
  }
}
