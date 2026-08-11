import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { TenantCheck } from '../../../../common/decorators/tenant-check.decorator';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { JwtPayload } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { CreateTeamDto } from '../../application/dtos/create-team.dto';
import { ListTeamsQueryDto } from '../../application/dtos/list-teams.query.dto';
import { TeamResponseDto } from '../../application/dtos/team-response.dto';
import { UpdateTeamDto } from '../../application/dtos/update-team.dto';
import { TeamMapper } from '../../application/mappers/team.mapper';
import { CreateTeamUseCase } from '../../application/use-cases/create-team.use-case';
import { DeleteTeamUseCase } from '../../application/use-cases/delete-team.use-case';
import { GetTeamUseCase } from '../../application/use-cases/get-team.use-case';
import { ListTeamsUseCase } from '../../application/use-cases/list-teams.use-case';
import { UpdateTeamUseCase } from '../../application/use-cases/update-team.use-case';

@Controller('teams')
export class TeamController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly listTeamsUseCase: ListTeamsUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN)
  async create(
    @Body() dto: CreateTeamDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TeamResponseDto> {
    // Non-SUPER_ADMIN can only create teams in their own club
    if (user.role !== UserRole.SUPER_ADMIN && user.clubId !== dto.clubId) {
      throw new ForbiddenException(
        'You can only create teams in your own club',
      );
    }

    const team = await this.createTeamUseCase.execute(dto);

    return TeamMapper.toResponse(team);
  }

  @Get()
  async list(
    @Query() query: ListTeamsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<TeamResponseDto>> {
    // Non-SUPER_ADMIN users see only their own club's teams
    const clubId =
      user.role === UserRole.SUPER_ADMIN
        ? query.clubId
        : (user.clubId ?? undefined);

    const { data, total } = await this.listTeamsUseCase.execute(
      query.page,
      query.limit,
      clubId,
    );

    return new PaginatedResult(
      data.map((team) => TeamMapper.toResponse(team)),
      { page: query.page, limit: query.limit, total },
    );
  }

  @Get(':id')
  @TenantCheck('team')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TeamResponseDto> {
    const team = await this.getTeamUseCase.execute(id);

    return TeamMapper.toResponse(team);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN)
  @TenantCheck('team')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ): Promise<TeamResponseDto> {
    const team = await this.updateTeamUseCase.execute(id, dto);

    return TeamMapper.toResponse(team);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN)
  @TenantCheck('team')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    await this.deleteTeamUseCase.execute(id);

    return { id };
  }
}
