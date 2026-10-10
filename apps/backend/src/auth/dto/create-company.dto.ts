import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

// Superadmin-created companies skip the ID card upload: the superadmin vouches for them.
export class CreateCompanyDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

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
}
