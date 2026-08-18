import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { TenantCheck } from '../../../../common/decorators/tenant-check.decorator';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { JwtPayload } from '../../../auth/infrastructure/strategies/jwt.strategy';
import { ListUsersQueryDto } from '../../application/dtos/list-users-query.dto';
import { UpdateUserClubDto } from '../../application/dtos/update-user-club.dto';
import { UpdateUserRoleDto } from '../../application/dtos/update-user-role.dto';
import { UserResponseDto } from '../../application/dtos/user-response.dto';
import { UserMapper } from '../../application/mappers/user.mapper';
import { GetUserUseCase } from '../../application/use-cases/get-user.use-case';
import { ListUsersUseCase } from '../../application/use-cases/list-users.use-case';
import { UpdateUserClubUseCase } from '../../application/use-cases/update-user-club.use-case';
import { UpdateUserRoleUseCase } from '../../application/use-cases/update-user-role.use-case';

@Controller('users')
@Roles(UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN)
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserRoleUseCase: UpdateUserRoleUseCase,
    private readonly updateUserClubUseCase: UpdateUserClubUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const filters = {
      search: query.search,
      clubId:
        currentUser.role === UserRole.SUPER_ADMIN
          ? query.clubId
          : (currentUser.clubId ?? undefined),
    };

    const { data, total } = await this.listUsersUseCase.execute(
      query.page,
      query.limit,
      filters,
    );

    return new PaginatedResult(
      data.map((entry) => UserMapper.toResponse(entry)),
      { page: query.page, limit: query.limit, total },
    );
  }

  @Get(':id')
  @TenantCheck('user')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const result = await this.getUserUseCase.execute(id);

    return UserMapper.toResponse(result);
  }

  @Patch(':id/role')
  @TenantCheck('user')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() currentUser: JwtPayload,
  ): Promise<UserResponseDto> {
    await this.updateUserRoleUseCase.execute(
      id,
      dto.role as UserRole,
      currentUser.sub,
    );

    const result = await this.getUserUseCase.execute(id);

    return UserMapper.toResponse(result);
  }

  @Patch(':id/club')
  @Roles(UserRole.SUPER_ADMIN)
  async updateClub(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserClubDto,
  ): Promise<UserResponseDto> {
    await this.updateUserClubUseCase.execute(id, dto.clubId);

    const result = await this.getUserUseCase.execute(id);

    return UserMapper.toResponse(result);
  }
}
