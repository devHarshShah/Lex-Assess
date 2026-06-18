import { IsOptional, IsString, MinLength } from 'class-validator';

export class CompanyProfileDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @MinLength(2)
  companyLegalName!: string;

  @IsOptional()
  @IsString()
  companyPan?: string;

  @IsOptional()
  @IsString()
  companyGstin?: string;

  @IsString()
  @MinLength(2)
  operatorName!: string;

  @IsString()
  @MinLength(2)
  operatorDesignation!: string;

  @IsOptional()
  @IsString()
  operatorIdCardUrl?: string;
}
