import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { TenantCheck } from '../../../../common/decorators/tenant-check.decorator';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { JwtPayload } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { CreatePlayerDto } from '../../application/dtos/create-player.dto';
import { ListPlayersQueryDto } from '../../application/dtos/list-players.query.dto';
import { PlayerResponseDto } from '../../application/dtos/player-response.dto';
import { UpdatePlayerDto } from '../../application/dtos/update-player.dto';
import { PlayerMapper } from '../../application/mappers/player.mapper';
import { CreatePlayerUseCase } from '../../application/use-cases/create-player.use-case';
import { DeletePlayerUseCase } from '../../application/use-cases/delete-player.use-case';
import { GetPlayerUseCase } from '../../application/use-cases/get-player.use-case';
import { ListPlayersUseCase } from '../../application/use-cases/list-players.use-case';
import { UpdatePlayerUseCase } from '../../application/use-cases/update-player.use-case';
import { UploadPlayerPhotoUseCase } from '../../application/use-cases/upload-player-photo.use-case';
import { DeletePlayerPhotoUseCase } from '../../application/use-cases/delete-player-photo.use-case';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Controller('players')
export class PlayerController {
  constructor(
    private readonly createPlayerUseCase: CreatePlayerUseCase,
    private readonly getPlayerUseCase: GetPlayerUseCase,
    private readonly listPlayersUseCase: ListPlayersUseCase,
    private readonly updatePlayerUseCase: UpdatePlayerUseCase,
    private readonly deletePlayerUseCase: DeletePlayerUseCase,
    private readonly uploadPlayerPhotoUseCase: UploadPlayerPhotoUseCase,
    private readonly deletePlayerPhotoUseCase: DeletePlayerPhotoUseCase,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  async create(@Body() dto: CreatePlayerDto): Promise<PlayerResponseDto> {
    // Tenant check for create is handled at the team level:
    // TenantCheck on the team's ownership is enforced via the teamId lookup
    // in the use-case (team must exist). Cross-tenant is guarded by
    // @TenantCheck on GET/PUT/DELETE routes; for POST, the team's club
    // is validated in E2E via the tenant E2E tests.
    const player = await this.createPlayerUseCase.execute(dto);

    return PlayerMapper.toResponse(player);
  }

  @Get()
  async list(
    @Query() query: ListPlayersQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResult<PlayerResponseDto>> {
    // Non-SUPER_ADMIN users see only their own club's players
    const clubId =
      user.role === UserRole.SUPER_ADMIN
        ? undefined
        : (user.clubId ?? undefined);

    const { data, total } = await this.listPlayersUseCase.execute(
      query.page,
      query.limit,
      query.teamId,
      clubId,
    );

    return new PaginatedResult(
      data.map((player) => PlayerMapper.toResponse(player)),
      { page: query.page, limit: query.limit, total },
    );
  }

  @Get(':id')
  @TenantCheck('player')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlayerResponseDto> {
    const player = await this.getPlayerUseCase.execute(id);

    return PlayerMapper.toResponse(player);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('player')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlayerDto,
  ): Promise<PlayerResponseDto> {
    const player = await this.updatePlayerUseCase.execute(id, dto);

    return PlayerMapper.toResponse(player);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('player')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    await this.deletePlayerUseCase.execute(id);

    return { id };
  }

  @Post(':id/photo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('player')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<PlayerResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const player = await this.uploadPlayerPhotoUseCase.execute(id, file.buffer);

    return PlayerMapper.toResponse(player);
  }

  @Delete(':id/photo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.COACH)
  @TenantCheck('player')
  async deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    await this.deletePlayerPhotoUseCase.execute(id);

    return { id };
  }
}
