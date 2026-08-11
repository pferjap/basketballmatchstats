import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../../../common/dtos/pagination.query.dto';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { JwtPayload } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { ClubResponseDto } from '../../application/dtos/club-response.dto';
import { CreateClubDto } from '../../application/dtos/create-club.dto';
import { UpdateClubDto } from '../../application/dtos/update-club.dto';
import { ClubMapper } from '../../application/mappers/club.mapper';
import { CreateClubUseCase } from '../../application/use-cases/create-club.use-case';
import { DeleteClubUseCase } from '../../application/use-cases/delete-club.use-case';
import { GetClubUseCase } from '../../application/use-cases/get-club.use-case';
import { ListClubsUseCase } from '../../application/use-cases/list-clubs.use-case';
import { UpdateClubUseCase } from '../../application/use-cases/update-club.use-case';

@Controller('clubs')
export class ClubController {
  constructor(
    private readonly createClubUseCase: CreateClubUseCase,
    private readonly getClubUseCase: GetClubUseCase,
    private readonly listClubsUseCase: ListClubsUseCase,
    private readonly updateClubUseCase: UpdateClubUseCase,
    private readonly deleteClubUseCase: DeleteClubUseCase,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateClubDto): Promise<ClubResponseDto> {
    const club = await this.createClubUseCase.execute(dto);

    return ClubMapper.toResponse(club);
  }

  @Get()
  async list(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<ClubResponseDto>> {
    // Non-SUPER_ADMIN users see only their own club
    const clubId =
      user.role === UserRole.SUPER_ADMIN
        ? undefined
        : (user.clubId ?? undefined);

    const { data, total } = await this.listClubsUseCase.execute(
      query.page,
      query.limit,
      clubId,
    );

    return new PaginatedResult(
      data.map((club) => ClubMapper.toResponse(club)),
      { page: query.page, limit: query.limit, total },
    );
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ClubResponseDto> {
    const club = await this.getClubUseCase.execute(id);

    return ClubMapper.toResponse(club);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClubDto,
  ): Promise<ClubResponseDto> {
    const club = await this.updateClubUseCase.execute(id, dto);

    return ClubMapper.toResponse(club);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    await this.deleteClubUseCase.execute(id);

    return { id };
  }
}
