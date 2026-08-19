import { Inject, Injectable } from '@nestjs/common';
import type {
  IMatchRepository,
  UpdateMatchData,
} from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchNotFoundException } from '../../domain/exceptions/match-not-found.exception';
import { InvalidMatchTransitionException } from '../../domain/exceptions/invalid-match-transition.exception';
import { PostponeMatchDto } from '../dtos/postpone-match.dto';

@Injectable()
export class PostponeMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(id: string, dto?: PostponeMatchDto): Promise<MatchEntity> {
    const match = await this.matchRepository.findById(id);
    if (!match) {
      throw new MatchNotFoundException(id);
    }

    if (!match.canPostpone()) {
      throw new InvalidMatchTransitionException(
        match.status,
        MatchStatus.POSTPONED,
      );
    }

    const data: UpdateMatchData = {
      status: MatchStatus.POSTPONED,
      ...(dto?.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
    };

    return this.matchRepository.update(id, data);
  }
}
