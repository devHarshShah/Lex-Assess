import { NotificationPlacement } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @IsEnum(NotificationPlacement)
  placement!: NotificationPlacement;

  @IsOptional()
  @IsString()
  label?: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
