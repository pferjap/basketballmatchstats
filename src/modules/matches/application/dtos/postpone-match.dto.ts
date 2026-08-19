import { IsDateString, IsOptional } from 'class-validator';

export class PostponeMatchDto {
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}
