import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMaintenanceDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
