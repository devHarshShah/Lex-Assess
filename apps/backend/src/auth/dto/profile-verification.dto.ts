import { IsEnum, IsString, MinLength } from 'class-validator';

export class ProfileVerificationDto {
  @IsEnum(['ONGOING', 'GRADUATED'])
  verificationType!: 'ONGOING' | 'GRADUATED';

  @IsString()
  @MinLength(10)
  verificationDocUrl!: string;
}
