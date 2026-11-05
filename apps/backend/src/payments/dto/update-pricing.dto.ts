import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class UpdatePricingDto {
  // Amount charged per cycle, in paise (Razorpay's minimum is ₹1)
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  amountPaise!: number;

  // Crossed-out "original" price shown next to the real one; display only
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  compareAtPaise?: number | null;

  @IsInt()
  @Min(1)
  @Max(12)
  cycleMonths!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  planName!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(40)
  offerTag?: string | null;
}
