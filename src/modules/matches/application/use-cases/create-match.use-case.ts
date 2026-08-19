import { Inject, Injectable } from '@nestjs/common';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import { MatchEntity } from '../../domain/entities/match.entity';
import { CreateMatchDto } from '../dtos/create-match.dto';

@Injectable()
export class CreateMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(dto: CreateMatchDto): Promise<MatchEntity> {
    return this.matchRepository.create({
      clubId: dto.clubId,
      homeTeamId: dto.homeTeamId,
      awayTeamId: dto.awayTeamId,
      scheduledAt: new Date(dto.scheduledAt),
      ...(dto.totalPeriods !== undefined && { totalPeriods: dto.totalPeriods }),
      ...(dto.periodDurationMinutes !== undefined && {
        periodDurationMinutes: dto.periodDurationMinutes,
      }),
    });
  }
}
