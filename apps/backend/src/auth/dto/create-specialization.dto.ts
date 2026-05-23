import { IsString, MinLength } from 'class-validator';

export class CreateSpecializationDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
