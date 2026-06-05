import { NotificationPlacement } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsEnum(NotificationPlacement)
  placement?: NotificationPlacement;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
