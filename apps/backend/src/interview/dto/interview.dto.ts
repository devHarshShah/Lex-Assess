import { IsString, IsNotEmpty, IsArray, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';

export class CreateInterviewerDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @IsString({ each: true })
  specializations!: string[];

  @IsOptional()
  @IsString()
  bio?: string;
}

export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  interviewerId!: string;

  @IsDateString()
  @IsNotEmpty()
  startTime!: string;

  @IsDateString()
  @IsNotEmpty()
  endTime!: string;
}

export class BulkCreateSlotsDto {
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek!: number[]; // 0-6 (Sunday-Saturday)

  @IsString()
  @IsNotEmpty()
  startTime!: string; // "HH:mm"

  @IsString()
  @IsNotEmpty()
  endTime!: string; // "HH:mm"

  @IsInt()
  @Min(15)
  @Max(180)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(60)
  breakMinutes!: number;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}

export class ScheduleInterviewDto {
  @IsString()
  @IsNotEmpty()
  slotId!: string;
}

export class AddFeedbackDto {
  @IsInt()
  @Min(0)
  @Max(100)
  marks!: number;

  @IsString()
  @IsNotEmpty()
  notes!: string;
}

export class ScheduleCompanyInterviewDto {
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteCompanyInterviewDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
