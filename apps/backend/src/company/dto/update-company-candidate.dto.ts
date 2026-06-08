import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CandidateWorkflowStatus } from '@prisma/client';

export enum CompanyCandidateFilterStatus {
  NEW = 'NEW',
  SHORTLISTED = 'SHORTLISTED',
  CONTACTED = 'CONTACTED',
  INTERVIEWING = 'INTERVIEWING',
  OFFERED = 'OFFERED',
  REJECTED = 'REJECTED',
}

export class UpdateCompanyCandidateDto {
  @IsEnum(CandidateWorkflowStatus)
  status!: CandidateWorkflowStatus;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  notes?: string;
}
