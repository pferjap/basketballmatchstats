import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { CreateMatchDto } from '../../application/dtos/create-match.dto';
import { UpdateMatchDto } from '../../application/dtos/update-match.dto';
import { PostponeMatchDto } from '../../application/dtos/postpone-match.dto';
import { SuspendMatchDto } from '../../application/dtos/suspend-match.dto';
import { ListMatchesQueryDto } from '../../application/dtos/list-matches-query.dto';
import { MatchResponseDto } from '../../application/dtos/match-response.dto';
import { MatchMapper } from '../mappers/match.mapper';
import { CreateMatchUseCase } from '../../application/use-cases/create-match.use-case';
import { DeleteMatchUseCase } from '../../application/use-cases/delete-match.use-case';
import { GetMatchUseCase } from '../../application/use-cases/get-match.use-case';
import { UpdateMatchUseCase } from '../../application/use-cases/update-match.use-case';
import { ListMatchesUseCase } from '../../application/use-cases/list-matches.use-case';
import { StartMatchUseCase } from '../../application/use-cases/start-match.use-case';
import { FinishMatchUseCase } from '../../application/use-cases/finish-match.use-case';
import { CancelMatchUseCase } from '../../application/use-cases/cancel-match.use-case';
import { PostponeMatchUseCase } from '../../application/use-cases/postpone-match.use-case';
import { SuspendMatchUseCase } from '../../application/use-cases/suspend-match.use-case';

@Controller('matches')
export class MatchController {
  constructor(
    private readonly createMatchUseCase: CreateMatchUseCase,
    private readonly getMatchUseCase: GetMatchUseCase,
    private readonly updateMatchUseCase: UpdateMatchUseCase,
    private readonly listMatchesUseCase: ListMatchesUseCase,
    private readonly startMatchUseCase: StartMatchUseCase,
    private readonly finishMatchUseCase: FinishMatchUseCase,
    private readonly cancelMatchUseCase: CancelMatchUseCase,
    private readonly postponeMatchUseCase: PostponeMatchUseCase,
    private readonly suspendMatchUseCase: SuspendMatchUseCase,
    private readonly deleteMatchUseCase: DeleteMatchUseCase,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  async create(
    @Body() dto: CreateMatchDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<MatchResponseDto> {
    // Non-SUPER_ADMIN can only create matches in their own club
    if (user.role !== UserRole.SUPER_ADMIN && user.clubId !== dto.clubId) {
      throw new ForbiddenException(
        'You can only create matches in your own club',
      );
    }

    const match = await this.createMatchUseCase.execute(dto);
    return MatchMapper.toResponse(match);
  }

  @Get()
  async list(
    @Query() query: ListMatchesQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<MatchResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // A non-SUPER_ADMIN user without a club is not tied to any match, so they
    // must see an empty list rather than every match (an undefined clubId
    // filter would otherwise return all matches).
    if (user.role !== UserRole.SUPER_ADMIN && !user.clubId) {
      return new PaginatedResult<MatchResponseDto>([], { page, limit, total: 0 });
    }

    const clubId =
      user.role === UserRole.SUPER_ADMIN ? undefined : (user.clubId ?? undefined);

    const {
      data,
      total,
      page: resultPage,
      limit: resultLimit,
    } = await this.listMatchesUseCase.execute({
      clubId,
      status: query.status,
      page,
      limit,
    });

    return new PaginatedResult(
      data.map((match) => MatchMapper.toResponse(match)),
      { page: resultPage, limit: resultLimit, total },
    );
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResponseDto> {
    const match = await this.getMatchUseCase.execute(id);
    return MatchMapper.toResponse(match);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('match')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMatchDto,
  ): Promise<MatchResponseDto> {
    const match = await this.updateMatchUseCase.execute(id, dto);
    return MatchMapper.toResponse(match);
  }

  @Patch(':id/start')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('match')
  async start(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResponseDto> {
    const match = await this.startMatchUseCase.execute(id);
    return MatchMapper.toResponse(match);
  }

  @Patch(':id/finish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('match')
  async finish(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResponseDto> {
    const match = await this.finishMatchUseCase.execute(id);
    return MatchMapper.toResponse(match);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN)
  @TenantCheck('match')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MatchResponseDto> {
    const match = await this.cancelMatchUseCase.execute(id);
    return MatchMapper.toResponse(match);
  }

  @Patch(':id/postpone')
  @Roles(UserRole.SUPER_ADMIN)
  @TenantCheck('match')
  async postpone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PostponeMatchDto,
  ): Promise<MatchResponseDto> {
    const match = await this.postponeMatchUseCase.execute(id, dto);
    return MatchMapper.toResponse(match);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('match')
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendMatchDto,
  ): Promise<MatchResponseDto> {
    const match = await this.suspendMatchUseCase.execute(id, dto);
    return MatchMapper.toResponse(match);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN)
  @TenantCheck('match')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    const match = await this.getMatchUseCase.execute(id);
    if (match.status !== MatchStatus.SCHEDULED) {
      throw new ForbiddenException('Only scheduled matches can be deleted');
    }
    await this.deleteMatchUseCase.execute(id);
    return { id };
  }
}
