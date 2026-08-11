import { Inject, Injectable } from '@nestjs/common';
import {
  type ITeamRepository,
  TEAM_REPOSITORY,
} from '../../domain/interfaces/team.repository.interface';
import { TeamNotFoundException } from '../../domain/exceptions/team-not-found.exception';

@Injectable()
export class DeleteTeamUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const exists = await this.teamRepository.existsById(id);

    if (!exists) {
      throw new TeamNotFoundException(id);
    }

    await this.teamRepository.delete(id);
  }
}
