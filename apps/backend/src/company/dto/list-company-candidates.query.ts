import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CompanyCandidateFilterStatus } from './update-company-candidate.dto';

export class ListCompanyCandidatesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  // No longer used for filtering; still accepted so an older frontend build sending it
  // doesn't get a 400 from forbidNonWhitelisted while frontend and backend deploy separately.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  domain?: string;

  @IsOptional()
  @IsEnum(CompanyCandidateFilterStatus)
  status?: CompanyCandidateFilterStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  internshipDuration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  internshipPeriod?: string;
}
