import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, Prisma, CandidateWorkflowStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CompanyCandidateFilterStatus, UpdateCompanyCandidateDto } from './dto/update-company-candidate.dto';

type CandidateListQuery = {
  search?: string;
  campaign?: string;
  domain?: string;
  status?: CompanyCandidateFilterStatus;
};

type CandidateAttempt = Prisma.TestAttemptGetPayload<{
  include: {
    user: {
      select: {
        id: true;
      };
    };
    version: {
      include: {
        paper: {
          include: {
            specialization: true;
          };
        };
      };
    };
  };
}>;

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

@Injectable()
export class CompanyCandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async listCandidates(companyId: string, query: CandidateListQuery) {
    const search = query.search?.trim().toLowerCase();
    const campaign = query.campaign?.trim().toLowerCase();
    const domain = query.domain?.trim().toLowerCase();

    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        status: AttemptStatus.SUBMITTED,
      },
      include: {
        user: {
          select: {
            id: true,
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
      },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    });

    const filteredAttempts = attempts.filter((attempt) => {
      const haystacks = [
        attempt.user.id,
        attempt.version.paper.title,
        attempt.version.paper.specialization.name,
      ].map((value) => value.toLowerCase());

      if (search && !haystacks.some((value) => value.includes(search))) {
        return false;
      }

      if (campaign && !attempt.version.paper.title.toLowerCase().includes(campaign)) {
        return false;
      }

      if (domain && !attempt.version.paper.specialization.name.toLowerCase().includes(domain)) {
        return false;
      }

      return true;
    });

    const studentIds = Array.from(new Set(filteredAttempts.map(a => a.user.id)));
    
    // Fetch interviews for these students
    const interviews = await this.prisma.interview.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'COMPLETED',
      },
      select: {
        studentId: true,
        marks: true,
        notes: true,
      }
    });

    const interviewsByStudentId = new Map(interviews.map(i => [i.studentId, i]));

    const decisions = await this.prisma.companyCandidateDecision.findMany({
      where: {
        companyId,
        attemptId: { in: filteredAttempts.map((attempt) => attempt.id) },
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

    const decisionByAttemptId = new Map(decisions.map((decision) => [decision.attemptId, decision]));

    return filteredAttempts
      .map((attempt) => this.toCandidateRecord(
        attempt, 
        decisionByAttemptId.get(attempt.id) ?? null,
        interviewsByStudentId.get(attempt.user.id) ?? null
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
      },
      include: {
        user: {
          select: {
            id: true,
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
      },
    });

    if (!attempt) {
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

    const interview = await this.prisma.interview.findFirst({
      where: {
        studentId: attempt.user.id,
        status: 'COMPLETED',
      },
      select: {
        marks: true,
        notes: true,
      }
    });

    return this.toCandidateRecord(attempt, decision, interview);
  }

  private toCandidateRecord(
    attempt: CandidateAttempt, 
    decision: CandidateDecision | null,
    interview?: { marks: number | null, notes: string | null } | null
  ) {
    return {
      attemptId: attempt.id,
      studentId: attempt.user.id,
      practiceArea: attempt.version.paper.specialization.name,
      campaign: attempt.version.paper.title,
      versionName: attempt.version.versionName,
      marks: attempt.score ?? 0,
      questionScores: attempt.questionScores ?? {},
      interviewMarks: interview?.marks ?? null,
      interviewerComments: interview?.notes ?? null,
      workflowStatus: decision?.status ?? CompanyCandidateFilterStatus.NEW,
      notes: decision?.notes ?? null,
      decisionId: decision?.id ?? null,
      reviewedAt: decision?.updatedAt ?? null,
    } as const;
  }
}
