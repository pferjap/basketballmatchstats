import { IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dtos/pagination.query.dto';

export class ListPlayersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
