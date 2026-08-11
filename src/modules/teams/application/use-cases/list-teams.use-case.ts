import { Inject, Injectable } from '@nestjs/common';
import {
  type ITeamRepository,
  TEAM_REPOSITORY,
} from '../../domain/interfaces/team.repository.interface';
import { Team } from '../../domain/entities/team.entity';

export interface ListTeamsResult {
  data: Team[];
  total: number;
}

@Injectable()
export class ListTeamsUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(
    page: number,
    limit: number,
    clubId?: string,
  ): Promise<ListTeamsResult> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.teamRepository.findMany({ skip, take: limit, clubId }),
      this.teamRepository.count(clubId),
    ]);

    return { data, total };
  }
}
