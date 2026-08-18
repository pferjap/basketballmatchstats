import { Module } from '@nestjs/common';
import { ClubsModule } from '../clubs/clubs.module';
import { TEAM_REPOSITORY } from './domain/interfaces/team.repository.interface';
import { CreateTeamUseCase } from './application/use-cases/create-team.use-case';
import { DeleteTeamUseCase } from './application/use-cases/delete-team.use-case';
import { GetTeamUseCase } from './application/use-cases/get-team.use-case';
import { ListTeamsUseCase } from './application/use-cases/list-teams.use-case';
import { UpdateTeamUseCase } from './application/use-cases/update-team.use-case';
import { UploadTeamLogoUseCase } from './application/use-cases/upload-team-logo.use-case';
import { DeleteTeamLogoUseCase } from './application/use-cases/delete-team-logo.use-case';
import { TeamController } from './infrastructure/controllers/team.controller';
import { PrismaTeamRepository } from './infrastructure/repositories/prisma-team.repository';

@Module({
  imports: [ClubsModule],
  controllers: [TeamController],
  providers: [
    CreateTeamUseCase,
    GetTeamUseCase,
    ListTeamsUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    UploadTeamLogoUseCase,
    DeleteTeamLogoUseCase,
    { provide: TEAM_REPOSITORY, useClass: PrismaTeamRepository },
  ],
  exports: [TEAM_REPOSITORY],
})
export class TeamsModule {}
