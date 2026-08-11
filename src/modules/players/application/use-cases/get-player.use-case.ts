import { Inject, Injectable } from '@nestjs/common';
import {
  type IPlayerRepository,
  PLAYER_REPOSITORY,
} from '../../domain/interfaces/player.repository.interface';
import { Player } from '../../domain/entities/player.entity';
import { PlayerNotFoundException } from '../../domain/exceptions/player-not-found.exception';

@Injectable()
export class GetPlayerUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(id: string): Promise<Player> {
    const player = await this.playerRepository.findById(id);

    if (!player) {
      throw new PlayerNotFoundException(id);
    }

    return player;
  }
}
