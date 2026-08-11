import { Module } from '@nestjs/common';
import { CLUB_REPOSITORY } from './domain/interfaces/club.repository.interface';
import { CreateClubUseCase } from './application/use-cases/create-club.use-case';
import { DeleteClubUseCase } from './application/use-cases/delete-club.use-case';
import { GetClubUseCase } from './application/use-cases/get-club.use-case';
import { ListClubsUseCase } from './application/use-cases/list-clubs.use-case';
import { UpdateClubUseCase } from './application/use-cases/update-club.use-case';
import { ClubController } from './infrastructure/controllers/club.controller';
import { PrismaClubRepository } from './infrastructure/repositories/prisma-club.repository';

@Module({
  controllers: [ClubController],
  providers: [
    CreateClubUseCase,
    GetClubUseCase,
    ListClubsUseCase,
    UpdateClubUseCase,
    DeleteClubUseCase,
    { provide: CLUB_REPOSITORY, useClass: PrismaClubRepository },
  ],
  exports: [CLUB_REPOSITORY],
})
export class ClubsModule {}
