import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateMatchDto {
  @IsUUID()
  @IsNotEmpty()
  clubId!: string;

  @IsUUID()
  @IsNotEmpty()
  homeTeamId!: string;

  @IsUUID()
  @IsNotEmpty()
  awayTeamId!: string;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  totalPeriods?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  periodDurationMinutes?: number;
}
