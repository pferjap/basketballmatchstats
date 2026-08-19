import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SuspendMatchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
