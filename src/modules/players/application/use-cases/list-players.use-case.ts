import { Inject, Injectable } from '@nestjs/common';
import {
  type IPlayerRepository,
  PLAYER_REPOSITORY,
} from '../../domain/interfaces/player.repository.interface';
import { Player } from '../../domain/entities/player.entity';

@Injectable()
export class ListPlayersUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(
    page: number,
    limit: number,
    teamId?: string,
    clubId?: string,
  ): Promise<{ data: Player[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.playerRepository.findMany({ skip, take: limit, teamId, clubId }),
      clubId
        ? this.playerRepository.countByClub(clubId, teamId)
        : this.playerRepository.count(teamId),
    ]);

    return { data, total };
  }
}
