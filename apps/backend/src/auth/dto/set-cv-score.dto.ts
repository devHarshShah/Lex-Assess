import { IsInt, Max, Min } from 'class-validator';

export class SetCvScoreDto {
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}
