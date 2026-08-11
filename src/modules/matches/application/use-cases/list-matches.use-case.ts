import { Inject, Injectable } from '@nestjs/common';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import { MatchEntity } from '../../domain/entities/match.entity';

export interface ListMatchesParams {
  clubId?: string;
  status?: string;
  page: number;
  limit: number;
}

export interface PaginatedMatches {
  data: MatchEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListMatchesUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(params: ListMatchesParams): Promise<PaginatedMatches> {
    const { clubId, status, page, limit } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.matchRepository.findMany({ clubId, status, skip, take: limit }),
      this.matchRepository.count({ clubId, status }),
    ]);

    return { data, total, page, limit };
  }
}
