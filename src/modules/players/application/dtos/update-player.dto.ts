import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PlayerPosition } from '../../domain/entities/player.entity';

export class UpdatePlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber?: number | null;

  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition | null;
}
