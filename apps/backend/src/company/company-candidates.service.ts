import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, Prisma, CandidateWorkflowStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { activeAccessWhere } from '../payments/access';
import { computeVersionMarks, type SectionQuestionMark, type SectionRule } from '../ranking/scoring.util';
import { CompanyCandidateFilterStatus, UpdateCompanyCandidateDto } from './dto/update-company-candidate.dto';

type CandidateListQuery = {
  search?: string;
  domain?: string;
  status?: CompanyCandidateFilterStatus;
  internshipDuration?: string;
  internshipPeriod?: string;
};

// Companies see a candidate's academic background and internship preferences only.
// Identity and contact details (name, email, phone, LinkedIn, resume, photo, roll number)
// are never selected here; introductions go through LexAssess.
const candidateAttemptInclude = {
  user: {
    select: {
      id: true,
      profile: {
        select: {
          college: true,
          degree: true,
          currentYear: true,
          internshipGoal: true,
          internshipDuration: true,
          internshipPeriod: true,
        },
      },
    },
  },
  version: {
    include: {
      paper: {
        include: {
          specialization: true,
        },
      },
    },
  },
} satisfies Prisma.TestAttemptInclude;

type CandidateAttempt = Prisma.TestAttemptGetPayload<{ include: typeof candidateAttemptInclude }>;

type CandidateDecision = Prisma.CompanyCandidateDecisionGetPayload<{
  select: {
    id: true;
    status: true;
    notes: true;
    createdAt: true;
    updatedAt: true;
    attemptId: true;
  };
}>;

type QuestionBreakdownItem = {
  section: string | null;
  question: string;
  scored: number;
  max: number;
};

type VersionScoring = {
  // Main (parent) questions in paper order, with the ids whose scores roll up into each
  questions: Array<{
    id: string;
    sectionId: string | null;
    section: string | null;
    question: string;
    max: number;
    scoreIds: string[];
  }>;
  sectionRules: Map<string, SectionRule>;
};

const QUESTION_PREVIEW_LENGTH = 140;

// First meaningful line of a markdown question, without heading/emphasis markers.
function questionPreview(text: string): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.replace(/^[#>\-*\s]+/, '').replace(/[*_`]/g, '').trim())
    .find((line) => line.length > 0) ?? '';
  return firstLine.length > QUESTION_PREVIEW_LENGTH
    ? `${firstLine.slice(0, QUESTION_PREVIEW_LENGTH - 1).trimEnd()}…`
    : firstLine;
}

@Injectable()
export class CompanyCandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A candidate is only visible/actionable by companies once they've completed
   * both stages used to generate their rank: the domain test and the LexAssess interview.
   */
  private async getEligibleStudentIds(studentIds: string[]): Promise<Set<string>> {
    const completedInterviews = await this.prisma.interview.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'COMPLETED',
      },
      select: { studentId: true },
    });

    return new Set(completedInterviews.map((interview) => interview.studentId));
  }

  /** Questions (with marks and section) for each version, so scores can be shown with context. */
  private async getVersionScoring(versionIds: string[]): Promise<Map<string, VersionScoring>> {
    const result = new Map<string, VersionScoring>();
    if (versionIds.length === 0) return result;

    const [questions, sections] = await Promise.all([
      this.prisma.question.findMany({
        where: { versionId: { in: versionIds } },
        select: { id: true, versionId: true, sectionId: true, parentId: true, text: true, marks: true, order: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.paperSection.findMany({
        where: { versionId: { in: versionIds } },
        select: { id: true, title: true, rules: true, order: true },
        orderBy: { order: 'asc' },
      }),
    ]);

    const sectionById = new Map(sections.map((section) => [section.id, section]));
    const sectionOrder = new Map(sections.map((section, index) => [section.id, index]));
    const subIdsByParent = new Map<string, string[]>();
    for (const question of questions) {
      if (!question.parentId) continue;
      const list = subIdsByParent.get(question.parentId) ?? [];
      list.push(question.id);
      subIdsByParent.set(question.parentId, list);
    }

    for (const versionId of versionIds) {
      const parents = questions
        .filter((question) => question.versionId === versionId && !question.parentId)
        .sort((left, right) => {
          const leftSection = left.sectionId ? sectionOrder.get(left.sectionId) ?? 0 : -1;
          const rightSection = right.sectionId ? sectionOrder.get(right.sectionId) ?? 0 : -1;
          return leftSection - rightSection || left.order - right.order;
        });

      result.set(versionId, {
        questions: parents.map((question) => ({
          id: question.id,
          sectionId: question.sectionId,
          section: question.sectionId ? sectionById.get(question.sectionId)?.title ?? null : null,
          question: questionPreview(question.text),
          max: question.marks,
          scoreIds: [question.id, ...(subIdsByParent.get(question.id) ?? [])],
        })),
        sectionRules: new Map(
          sections.map((section) => [section.id, (section.rules as SectionRule | null) ?? {}]),
        ),
      });
    }

    return result;
  }

  private scoreAttempt(attempt: CandidateAttempt, scoring: VersionScoring | undefined) {
    if (!scoring) return { maxMarks: null, questionBreakdown: [] as QuestionBreakdownItem[] };

    const scores = (attempt.questionScores as Record<string, number> | null) ?? {};
    const questionBreakdown = scoring.questions.map((question) => ({
      section: question.section,
      question: question.question,
      // A main question's marks are the sum of its own score and its sub-questions' scores
      scored: question.scoreIds.reduce((sum, id) => sum + (Number(scores[id]) || 0), 0),
      max: question.max,
    }));

    const sectionMarks: SectionQuestionMark[] = scoring.questions.map((question) => ({
      questionId: question.id,
      sectionId: question.sectionId,
      marks: question.max,
    }));
    const { maxMarks } = computeVersionMarks(sectionMarks, scoring.sectionRules);

    return { maxMarks: maxMarks > 0 ? maxMarks : null, questionBreakdown };
  }

  async listCandidates(companyId: string, query: CandidateListQuery) {
    const search = query.search?.trim().toLowerCase();
    const domain = query.domain?.trim().toLowerCase();
    const internshipDuration = query.internshipDuration?.trim().toLowerCase();
    const internshipPeriod = query.internshipPeriod?.trim().toLowerCase();

    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        status: AttemptStatus.SUBMITTED,
        // Students who stopped paying are no longer shown to companies.
        user: activeAccessWhere(),
      },
      include: candidateAttemptInclude,
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    });

    const filteredAttempts = attempts.filter((attempt) => {
      const profile = attempt.user.profile;
      const haystacks = [
        attempt.version.paper.specialization.name,
        profile?.college,
        profile?.degree,
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());

      if (search && !haystacks.some((value) => value.includes(search))) {
        return false;
      }

      if (domain && !attempt.version.paper.specialization.name.toLowerCase().includes(domain)) {
        return false;
      }

      if (internshipDuration && profile?.internshipDuration?.toLowerCase() !== internshipDuration) {
        return false;
      }

      if (internshipPeriod && profile?.internshipPeriod?.toLowerCase() !== internshipPeriod) {
        return false;
      }

      return true;
    });

    const studentIds = Array.from(new Set(filteredAttempts.map(a => a.user.id)));
    const eligibleStudentIds = await this.getEligibleStudentIds(studentIds);
    const eligibleAttempts = filteredAttempts.filter((attempt) => eligibleStudentIds.has(attempt.user.id));

    // Fetch interviews for these students
    const interviews = await this.prisma.interview.findMany({
      where: {
        studentId: { in: Array.from(eligibleStudentIds) },
        status: 'COMPLETED',
      },
      select: {
        studentId: true,
        marks: true,
        notes: true,
      }
    });

    const interviewsByStudentId = new Map(interviews.map(i => [i.studentId, i]));

    const [decisions, scoringByVersionId] = await Promise.all([
      this.prisma.companyCandidateDecision.findMany({
        where: {
          companyId,
          attemptId: { in: eligibleAttempts.map((attempt) => attempt.id) },
        },
        select: {
          id: true,
          attemptId: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.getVersionScoring(Array.from(new Set(eligibleAttempts.map((attempt) => attempt.versionId)))),
    ]);

    const decisionByAttemptId = new Map(decisions.map((decision) => [decision.attemptId, decision]));

    return eligibleAttempts
      .map((attempt) => this.toCandidateRecord(
        attempt,
        decisionByAttemptId.get(attempt.id) ?? null,
        interviewsByStudentId.get(attempt.user.id) ?? null,
        scoringByVersionId.get(attempt.versionId),
      ))
      .filter((candidate) => {
        if (!query.status) {
          return true;
        }

        if (query.status === CompanyCandidateFilterStatus.NEW) {
          return candidate.workflowStatus === 'NEW';
        }

        return candidate.workflowStatus === (query.status as Exclude<CompanyCandidateFilterStatus, CompanyCandidateFilterStatus.NEW>);
      });
  }

  async updateCandidateDecision(companyId: string, attemptId: string, input: UpdateCompanyCandidateDto) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: {
        id: attemptId,
        status: AttemptStatus.SUBMITTED,
        user: activeAccessWhere(),
      },
      include: candidateAttemptInclude,
    });

    if (!attempt) {
      throw new NotFoundException('Candidate not found');
    }

    const eligibleStudentIds = await this.getEligibleStudentIds([attempt.user.id]);
    if (!eligibleStudentIds.has(attempt.user.id)) {
      throw new NotFoundException('Candidate not found');
    }

    const decision = await this.prisma.companyCandidateDecision.upsert({
      where: {
        companyId_attemptId: {
          companyId,
          attemptId,
        },
      },
      update: {
        status: input.status as CandidateWorkflowStatus,
        notes: input.notes?.trim() || null,
      },
      create: {
        companyId,
        attemptId,
        status: input.status as CandidateWorkflowStatus,
        notes: input.notes?.trim() || null,
      },
      select: {
        id: true,
        attemptId: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const [interview, scoringByVersionId] = await Promise.all([
      this.prisma.interview.findFirst({
        where: {
          studentId: attempt.user.id,
          status: 'COMPLETED',
        },
        select: {
          marks: true,
          notes: true,
        }
      }),
      this.getVersionScoring([attempt.versionId]),
    ]);

    return this.toCandidateRecord(attempt, decision, interview, scoringByVersionId.get(attempt.versionId));
  }

  private toCandidateRecord(
    attempt: CandidateAttempt,
    decision: CandidateDecision | null,
    interview: { marks: number | null, notes: string | null } | null,
    scoring: VersionScoring | undefined,
  ) {
    const profile = attempt.user.profile;
    const { maxMarks, questionBreakdown } = this.scoreAttempt(attempt, scoring);

    return {
      attemptId: attempt.id,
      practiceArea: attempt.version.paper.specialization.name,
      college: profile?.college ?? null,
      degree: profile?.degree ?? null,
      currentYear: profile?.currentYear ?? null,
      internshipGoal: profile?.internshipGoal ?? null,
      internshipDuration: profile?.internshipDuration ?? null,
      internshipPeriod: profile?.internshipPeriod ?? null,
      marks: attempt.score ?? 0,
      maxMarks,
      questionBreakdown,
      interviewMarks: interview?.marks ?? null,
      interviewerComments: interview?.notes ?? null,
      workflowStatus: decision?.status ?? CompanyCandidateFilterStatus.NEW,
      notes: decision?.notes ?? null,
      decisionId: decision?.id ?? null,
      reviewedAt: decision?.updatedAt ?? null,
    } as const;
  }
}
