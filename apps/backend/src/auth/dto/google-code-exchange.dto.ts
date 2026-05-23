import { IsString, MinLength } from 'class-validator';

export class GoogleCodeExchangeDto {
  @IsString()
  @MinLength(5)
  code!: string;
}
