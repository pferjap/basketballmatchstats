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
import { UploadClubLogoUseCase } from '../../application/use-cases/upload-club-logo.use-case';
import { DeleteClubLogoUseCase } from '../../application/use-cases/delete-club-logo.use-case';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Controller('clubs')
export class ClubController {
  constructor(
    private readonly createClubUseCase: CreateClubUseCase,
    private readonly getClubUseCase: GetClubUseCase,
    private readonly listClubsUseCase: ListClubsUseCase,
    private readonly updateClubUseCase: UpdateClubUseCase,
    private readonly deleteClubUseCase: DeleteClubUseCase,
    private readonly uploadClubLogoUseCase: UploadClubLogoUseCase,
    private readonly deleteClubLogoUseCase: DeleteClubLogoUseCase,
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

  @Post(':id/logo')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  async uploadLogo(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ClubResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const club = await this.uploadClubLogoUseCase.execute(id, file.buffer);

    return ClubMapper.toResponse(club);
  }

  @Delete(':id/logo')
  @Roles(UserRole.SUPER_ADMIN)
  async deleteLogo(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    await this.deleteClubLogoUseCase.execute(id);

    return { id };
  }
}
