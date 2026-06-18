import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class ReviewCompanyProfileDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MinLength(3)
  rejectionReason?: string;
}
