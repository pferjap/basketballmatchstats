import { Inject, Injectable } from '@nestjs/common';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchNotFoundException } from '../../domain/exceptions/match-not-found.exception';
import { InvalidMatchTransitionException } from '../../domain/exceptions/invalid-match-transition.exception';

@Injectable()
export class FinishMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(id: string): Promise<MatchEntity> {
    const match = await this.matchRepository.findById(id);
    if (!match) {
      throw new MatchNotFoundException(id);
    }

    if (!match.canFinish()) {
      throw new InvalidMatchTransitionException(
        match.status,
        MatchStatus.FINISHED,
      );
    }

    return this.matchRepository.update(id, {
      status: MatchStatus.FINISHED,
      finishedAt: new Date(),
    });
  }
}
