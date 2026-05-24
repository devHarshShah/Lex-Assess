import { IsBoolean } from 'class-validator';

export class ToggleProfileVerificationDto {
  @IsBoolean()
  verified!: boolean;
}
