import { Module } from '@nestjs/common';
import { MATCH_REPOSITORY } from './domain/interfaces/match.repository.interface';
import { CreateMatchUseCase } from './application/use-cases/create-match.use-case';
import { DeleteMatchUseCase } from './application/use-cases/delete-match.use-case';
import { GetMatchUseCase } from './application/use-cases/get-match.use-case';
import { ListMatchesUseCase } from './application/use-cases/list-matches.use-case';
import { StartMatchUseCase } from './application/use-cases/start-match.use-case';
import { FinishMatchUseCase } from './application/use-cases/finish-match.use-case';
import { MatchController } from './infrastructure/controllers/match.controller';
import { PrismaMatchRepository } from './infrastructure/repositories/prisma-match.repository';

@Module({
  controllers: [MatchController],
  providers: [
    CreateMatchUseCase,
    GetMatchUseCase,
    ListMatchesUseCase,
    StartMatchUseCase,
    FinishMatchUseCase,
    DeleteMatchUseCase,
    { provide: MATCH_REPOSITORY, useClass: PrismaMatchRepository },
  ],
  exports: [MATCH_REPOSITORY],
})
export class MatchesModule {}
