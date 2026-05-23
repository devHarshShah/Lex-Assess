import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { IsEnum } from 'class-validator';

const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;

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

  @IsEnum(GENDERS)
  gender!: 'MALE' | 'FEMALE' | 'OTHER';

  @IsString()
  @MinLength(1)
  countryCode!: string;

  @IsString()
  @MinLength(7)
  mobileNumber!: string;

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
