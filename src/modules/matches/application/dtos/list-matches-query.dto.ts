import { IsEnum, IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '../../domain/enums/match-status.enum';

export class ListMatchesQueryDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;
}
