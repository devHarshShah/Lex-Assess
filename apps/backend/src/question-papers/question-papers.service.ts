import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaperStatus, QuestionType, AttemptStatus } from '@prisma/client';

import { IsString, IsOptional, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsInt, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitAttemptDto {
  @IsObject()
  @IsNotEmpty()
  answers!: Record<string, any>;
}

export class CreatePaperDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePaperDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  versionName!: string;
}

export class UpdateVersionNameDto {
  @IsString()
  @IsNotEmpty()
  versionName!: string;
}

export class QuestionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsInt()
  marks!: number;

  @IsOptional()
  options?: any;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsInt()
  order!: number;

  @IsOptional()
  @IsInt()
  timeLimitSeconds?: number;
}

export class UpdateVersionDto {
  @IsOptional()
  @IsEnum(PaperStatus)
  status?: PaperStatus;

  @IsOptional()
  @IsInt()
  timeLimitMinutes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions?: QuestionDto[];
}

@Injectable()
export class QuestionPapersService {
  constructor(private readonly prisma: PrismaService) {}

  async getPapersBySpecialization(specializationId: string) {
    return this.prisma.questionPaper.findMany({
      where: { specializationId },
      include: { versions: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createPaper(specializationId: string, data: CreatePaperDto, createdById?: string) {
    return this.prisma.questionPaper.create({
      data: {
        specializationId,
        title: data.title,
        description: data.description,
        ...(createdById ? { createdById } : {}),
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    });
  }

  async getAllPapers() {
    return this.prisma.questionPaper.findMany({
      include: {
        specialization: true,
        createdBy: true,
        versions: {
          select: { id: true, versionName: true, status: true, createdAt: true, _count: { select: { questions: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePaper(paperId: string, data: UpdatePaperDto) {
    const paper = await this.prisma.questionPaper.findUnique({ where: { id: paperId } });
    if (!paper) throw new NotFoundException('Paper not found');
    return this.prisma.questionPaper.update({
      where: { id: paperId },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  }

  async deletePaper(paperId: string) {
    const paper = await this.prisma.questionPaper.findUnique({ where: { id: paperId } });
    if (!paper) throw new NotFoundException('Paper not found');
    await this.prisma.questionPaper.delete({ where: { id: paperId } });
    return { success: true };
  }

  async getVersions(paperId: string) {
    return this.prisma.questionPaperVersion.findMany({
      where: { paperId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateVersionName(versionId: string, data: UpdateVersionNameDto) {
    const version = await this.prisma.questionPaperVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    return this.prisma.questionPaperVersion.update({
      where: { id: versionId },
      data: { versionName: data.versionName },
    });
  }

  async deleteVersion(versionId: string) {
    const version = await this.prisma.questionPaperVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    await this.prisma.questionPaperVersion.delete({ where: { id: versionId } });
    return { success: true };
  }

  async createVersion(paperId: string, data: CreateVersionDto) {
    return this.prisma.questionPaperVersion.create({
      data: {
        paperId,
        versionName: data.versionName,
        status: PaperStatus.DRAFT,
      }
    });
  }

  async getVersionDetails(versionId: string) {
    const version = await this.prisma.questionPaperVersion.findUnique({
      where: { id: versionId },
      include: {
        questions: {
          orderBy: { order: 'asc' }
        },
        paper: {
          include: { specialization: true }
        }
      }
    });
    if (!version) throw new NotFoundException('Version not found');
    return version;
  }

  async updateVersion(versionId: string, data: UpdateVersionDto) {
    return this.prisma.$transaction(async (tx) => {
      if (data.status !== undefined || data.timeLimitMinutes !== undefined) {
        // If publishing, first demote all other versions of the same paper to DRAFT
        if (data.status === PaperStatus.PUBLISHED) {
          const current = await tx.questionPaperVersion.findUnique({
            where: { id: versionId },
            select: { paperId: true },
          });
          if (current) {
            await tx.questionPaperVersion.updateMany({
              where: {
                paperId: current.paperId,
                id: { not: versionId },
                status: PaperStatus.PUBLISHED,
              },
              data: { status: PaperStatus.DRAFT },
            });
          }
        }
        await tx.questionPaperVersion.update({
          where: { id: versionId },
          data: {
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.timeLimitMinutes !== undefined ? { timeLimitMinutes: data.timeLimitMinutes } : {}),
          },
        });
      }

      if (data.questions) {
        const existing = await tx.question.findMany({ where: { versionId } });
        const incomingIds = data.questions.map(q => q.id).filter(Boolean);
        const toDelete = existing.filter(e => !incomingIds.includes(e.id));

        if (toDelete.length > 0) {
          await tx.question.deleteMany({
            where: { id: { in: toDelete.map(d => d.id) } }
          });
        }

        for (const q of data.questions) {
          if (q.id) {
            await tx.question.update({
              where: { id: q.id },
              data: {
                type: q.type,
                text: q.text,
                marks: q.marks,
                options: q.options ? q.options : null,
                answer: q.answer,
                order: q.order,
                timeLimitSeconds: q.timeLimitSeconds ?? null,
              }
            });
          } else {
            await tx.question.create({
              data: {
                versionId,
                type: q.type,
                text: q.text,
                marks: q.marks,
                options: q.options ? q.options : null,
                answer: q.answer,
                order: q.order,
                timeLimitSeconds: q.timeLimitSeconds ?? null,
              }
            });
          }
        }
      }
      return this.getVersionDetails(versionId);
    });
  }

  async getPublishedPapersBySpecializationName(specializationName: string) {
    const specialization = await this.prisma.specialization.findUnique({
      where: { name: specializationName },
    });

    if (!specialization) return [];

    return this.prisma.questionPaper.findMany({
      where: {
        specializationId: specialization.id,
        versions: {
          some: { status: PaperStatus.PUBLISHED },
        },
      },
      include: {
        versions: {
          where: { status: PaperStatus.PUBLISHED },
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublishedPapersForStudent(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile || !profile.specialization) return [];

    const papers = await this.getPublishedPapersBySpecializationName(profile.specialization);
    
    // Add attempt status for each paper
    const papersWithStatus = await Promise.all(papers.map(async (paper) => {
      const versionsWithStatus = await Promise.all(paper.versions.map(async (v) => {
        const attempt = await this.prisma.testAttempt.findFirst({
          where: { userId, versionId: v.id },
          orderBy: { createdAt: 'desc' },
        });
        return { ...v, userAttempt: attempt };
      }));
      return { ...paper, versions: versionsWithStatus };
    }));

    return papersWithStatus;
  }

  async startAttempt(versionId: string, userId: string) {
    const version = await this.prisma.questionPaperVersion.findUnique({
      where: { id: versionId },
      include: { paper: true },
    });

    if (!version || version.status !== PaperStatus.PUBLISHED) {
      throw new NotFoundException('Paper version not found or not published');
    }

    // Check if user already has a SUBMITTED or EXPIRED attempt
    const existingAttempt = await this.prisma.testAttempt.findFirst({
      where: { userId, versionId, status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED] } },
    });

    if (existingAttempt) {
      throw new BadRequestException('You have already attempted this test');
    }

    // Check if there's an ongoing attempt
    const ongoingAttempt = await this.prisma.testAttempt.findFirst({
      where: { userId, versionId, status: AttemptStatus.STARTED },
    });

    if (ongoingAttempt) {
      // Return ongoing attempt if it's still within time limit
      const startTime = ongoingAttempt.startTime.getTime();
      const now = new Date().getTime();
      const limitMs = version.timeLimitMinutes * 60 * 1000;
      
      if (now - startTime < limitMs) {
        return ongoingAttempt;
      } else {
        // Mark as expired if time is up
        return this.prisma.testAttempt.update({
          where: { id: ongoingAttempt.id },
          data: { status: AttemptStatus.EXPIRED, endTime: new Date() },
        });
      }
    }

    // Create new attempt
    return this.prisma.testAttempt.create({
      data: {
        userId,
        versionId,
        startTime: new Date(),
        status: AttemptStatus.STARTED,
      },
    });
  }

  async submitAttempt(versionId: string, userId: string, data: SubmitAttemptDto) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { userId, versionId, status: AttemptStatus.STARTED },
      include: { version: true },
    });

    if (!attempt) {
      throw new BadRequestException('No active attempt found for this test');
    }

    const startTime = attempt.startTime.getTime();
    const now = new Date().getTime();
    const limitMs = (attempt.version.timeLimitMinutes + 2) * 60 * 1000; // 2 min grace period
    
    if (now - startTime > limitMs) {
      await this.prisma.testAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.EXPIRED, endTime: new Date() },
      });
      throw new BadRequestException('Time limit exceeded. Your attempt has expired.');
    }

    return this.prisma.testAttempt.update({
      where: { id: attempt.id },
      data: {
        status: AttemptStatus.SUBMITTED,
        endTime: new Date(),
        answers: data.answers as any,
      },
    });
  }

  async getAttemptStatus(versionId: string, userId: string) {
    const attempt = await this.prisma.testAttempt.findFirst({
      where: { userId, versionId },
      orderBy: { createdAt: 'desc' },
    });
    return attempt;
  }
}

