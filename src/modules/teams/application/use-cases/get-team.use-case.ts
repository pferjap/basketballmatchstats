import { Inject, Injectable } from '@nestjs/common';
import {
  type ITeamRepository,
  TEAM_REPOSITORY,
} from '../../domain/interfaces/team.repository.interface';
import { Team } from '../../domain/entities/team.entity';
import { TeamNotFoundException } from '../../domain/exceptions/team-not-found.exception';

@Injectable()
export class GetTeamUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(id: string): Promise<Team> {
    const team = await this.teamRepository.findById(id);

    if (!team) {
      throw new TeamNotFoundException(id);
    }

    return team;
  }
}
