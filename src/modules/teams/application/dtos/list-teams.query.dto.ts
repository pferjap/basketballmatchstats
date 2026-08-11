import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dtos/pagination.query.dto';

/** Pagination plus an optional filter to scope teams to a single club. */
export class ListTeamsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  clubId?: string;
}
