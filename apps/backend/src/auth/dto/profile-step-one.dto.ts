import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class ProfileStepOneDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsString()
  @MinLength(2)
  college!: string;

  @IsString()
  @MinLength(2)
  degree!: string;

  @IsString()
  @MinLength(1)
  currentYear!: string;

  @IsString()
  @MinLength(2)
  specialization!: string;

  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  profilePhotoUrl?: string;
}
