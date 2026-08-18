import { Module } from '@nestjs/common';
import { ClubsModule } from '../clubs/clubs.module';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserClubUseCase } from './application/use-cases/update-user-club.use-case';
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role.use-case';
import { USER_REPOSITORY } from './domain/interfaces/user.repository.interface';
import { UsersController } from './infrastructure/controllers/users.controller';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';

@Module({
  imports: [ClubsModule],
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserRoleUseCase,
    UpdateUserClubUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
