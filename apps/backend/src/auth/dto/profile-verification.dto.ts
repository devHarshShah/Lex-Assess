import { VerificationType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class ProfileVerificationDto {
  @IsEnum(VerificationType)
  verificationType!: VerificationType;

  @IsString()
  @MinLength(10)
  verificationDocUrl!: string;
}
