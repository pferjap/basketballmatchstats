import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlayerPosition } from '../../domain/entities/player.entity';

export class CreatePlayerDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number;

  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @IsUUID()
  teamId!: string;
}
