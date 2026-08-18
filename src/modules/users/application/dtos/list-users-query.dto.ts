import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dtos/pagination.query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  clubId?: string;
}
