import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateSpecializationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
