import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpdateMatchDto {
  @IsUUID()
  @IsOptional()
  homeTeamId?: string;

  @IsUUID()
  @IsOptional()
  awayTeamId?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
