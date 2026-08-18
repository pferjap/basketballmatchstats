import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import type { UpdateMatchData } from '../../domain/interfaces/match.repository.interface';
import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchNotFoundException } from '../../domain/exceptions/match-not-found.exception';
import { UpdateMatchDto } from '../dtos/update-match.dto';

@Injectable()
export class UpdateMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(id: string, dto: UpdateMatchDto): Promise<MatchEntity> {
    const match = await this.matchRepository.findById(id);
    if (!match) {
      throw new MatchNotFoundException(id);
    }

    if (match.status !== MatchStatus.SCHEDULED) {
      throw new ForbiddenException('Only scheduled matches can be edited');
    }

    const data: UpdateMatchData = {
      ...(dto.homeTeamId !== undefined && { homeTeamId: dto.homeTeamId }),
      ...(dto.awayTeamId !== undefined && { awayTeamId: dto.awayTeamId }),
      ...(dto.scheduledAt !== undefined && {
        scheduledAt: new Date(dto.scheduledAt),
      }),
    };

    return this.matchRepository.update(id, data);
  }
}
