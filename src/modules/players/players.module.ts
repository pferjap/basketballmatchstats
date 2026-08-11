import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { PLAYER_REPOSITORY } from './domain/interfaces/player.repository.interface';
import { CreatePlayerUseCase } from './application/use-cases/create-player.use-case';
import { DeletePlayerUseCase } from './application/use-cases/delete-player.use-case';
import { GetPlayerUseCase } from './application/use-cases/get-player.use-case';
import { ListPlayersUseCase } from './application/use-cases/list-players.use-case';
import { UpdatePlayerUseCase } from './application/use-cases/update-player.use-case';
import { PlayerController } from './infrastructure/controllers/player.controller';
import { PrismaPlayerRepository } from './infrastructure/repositories/prisma-player.repository';

@Module({
  imports: [TeamsModule],
  controllers: [PlayerController],
  providers: [
    CreatePlayerUseCase,
    GetPlayerUseCase,
    ListPlayersUseCase,
    UpdatePlayerUseCase,
    DeletePlayerUseCase,
    { provide: PLAYER_REPOSITORY, useClass: PrismaPlayerRepository },
  ],
})
export class PlayersModule {}
