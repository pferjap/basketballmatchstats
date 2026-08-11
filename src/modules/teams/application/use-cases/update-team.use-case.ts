import { Inject, Injectable } from '@nestjs/common';
import {
  type ITeamRepository,
  TEAM_REPOSITORY,
} from '../../domain/interfaces/team.repository.interface';
import { Team } from '../../domain/entities/team.entity';
import { TeamNotFoundException } from '../../domain/exceptions/team-not-found.exception';
import { UpdateTeamDto } from '../dtos/update-team.dto';

@Injectable()
export class UpdateTeamUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(id: string, dto: UpdateTeamDto): Promise<Team> {
    const exists = await this.teamRepository.existsById(id);

    if (!exists) {
      throw new TeamNotFoundException(id);
    }

    return this.teamRepository.update(id, { name: dto.name });
  }
}
