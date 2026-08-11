import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../../domain/enums/event-type.enum';

export class ListMatchEventsQueryDto {
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  playerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  period?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 50;
}
