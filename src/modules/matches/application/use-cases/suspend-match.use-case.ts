import { Inject, Injectable } from '@nestjs/common';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchNotFoundException } from '../../domain/exceptions/match-not-found.exception';
import { InvalidMatchTransitionException } from '../../domain/exceptions/invalid-match-transition.exception';
import { SuspendMatchDto } from '../dtos/suspend-match.dto';

@Injectable()
export class SuspendMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(id: string, dto: SuspendMatchDto): Promise<MatchEntity> {
    const match = await this.matchRepository.findById(id);
    if (!match) {
      throw new MatchNotFoundException(id);
    }

    if (!match.canSuspend()) {
      throw new InvalidMatchTransitionException(
        match.status,
        MatchStatus.SUSPENDED,
      );
    }

    return this.matchRepository.update(id, {
      status: MatchStatus.SUSPENDED,
      suspensionReason: dto.reason,
    });
  }
}
