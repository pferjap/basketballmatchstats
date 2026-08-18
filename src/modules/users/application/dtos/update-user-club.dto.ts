import { IsUUID, ValidateIf } from 'class-validator';

export class UpdateUserClubDto {
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  clubId!: string | null;
}
