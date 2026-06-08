import { Injectable, NotFoundException } from '@nestjs/common';
import { AttemptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
        name: true;
        email: true;
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
  constructor(private readonly prisma: PrismaService) {}

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
            name: true,
            email: true,
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
        attempt.user.name,
        attempt.user.email,
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
      .map((attempt) => this.toCandidateRecord(attempt, decisionByAttemptId.get(attempt.id) ?? null))
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
            name: true,
            email: true,
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
        status: input.status,
        notes: input.notes?.trim() || null,
      },
      create: {
        companyId,
        attemptId,
        status: input.status,
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

    return this.toCandidateRecord(attempt, decision);
  }

  private toCandidateRecord(attempt: CandidateAttempt, decision: CandidateDecision | null) {
    return {
      attemptId: attempt.id,
      studentId: attempt.user.id,
      studentName: attempt.user.name,
      studentEmail: attempt.user.email,
      practiceArea: attempt.version.paper.specialization.name,
      campaign: attempt.version.paper.title,
      versionName: attempt.version.versionName,
      marks: attempt.score ?? 0,
      workflowStatus: decision?.status ?? CompanyCandidateFilterStatus.NEW,
      notes: decision?.notes ?? null,
      decisionId: decision?.id ?? null,
      reviewedAt: decision?.updatedAt ?? null,
    } as const;
  }
}
