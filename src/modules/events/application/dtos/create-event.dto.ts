import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '../../domain/enums/event-type.enum';

export class CoordinatesDto {
  @Min(0)
  @Max(100)
  x!: number;

  @Min(0)
  @Max(100)
  y!: number;
}

export class CreateEventDto {
  @IsUUID()
  @IsNotEmpty()
  teamId!: string;

  @IsUUID()
  @IsOptional()
  playerId?: string;

  @IsEnum(EventType)
  @IsNotEmpty()
  eventType!: EventType;

  @IsInt()
  @Min(1)
  period!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}:\d{2}$/, { message: 'gameClock must be in MM:SS format' })
  gameClock!: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
