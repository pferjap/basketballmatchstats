import { Inject, Injectable } from '@nestjs/common';
import {
  TEAM_REPOSITORY,
  type ITeamRepository,
} from '../../../teams/domain/interfaces/team.repository.interface';
import { TeamNotFoundException } from '../../../teams/domain/exceptions/team-not-found.exception';
import {
  type IPlayerRepository,
  PLAYER_REPOSITORY,
} from '../../domain/interfaces/player.repository.interface';
import { Player } from '../../domain/entities/player.entity';
import { CreatePlayerDto } from '../dtos/create-player.dto';

@Injectable()
export class CreatePlayerUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
  ) {}

  async execute(dto: CreatePlayerDto): Promise<Player> {
    const teamExists = await this.teamRepository.existsById(dto.teamId);

    if (!teamExists) {
      throw new TeamNotFoundException(dto.teamId);
    }

    return this.playerRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      jerseyNumber: dto.jerseyNumber ?? null,
      position: dto.position ?? null,
      teamId: dto.teamId,
    });
  }
}
