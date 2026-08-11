import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  clubId!: string;
}
