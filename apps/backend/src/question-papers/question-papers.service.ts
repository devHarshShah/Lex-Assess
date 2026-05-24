import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaperStatus, QuestionType } from '@prisma/client';

import { IsString, IsOptional, IsNotEmpty, IsEnum, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaperDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateVersionDto {
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
}

export class UpdateVersionDto {
  @IsOptional()
  @IsEnum(PaperStatus)
  status?: PaperStatus;

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

  async getVersions(paperId: string) {
    return this.prisma.questionPaperVersion.findMany({
      where: { paperId },
      orderBy: { createdAt: 'desc' }
    });
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
      if (data.status) {
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
          data: { status: data.status },
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
              }
            });
          }
        }
      }
      return this.getVersionDetails(versionId);
    });
  }
}

