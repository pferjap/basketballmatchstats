import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;
}
