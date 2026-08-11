import { IsDateString, IsNotEmpty, IsUUID } from 'class-validator';

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
}
