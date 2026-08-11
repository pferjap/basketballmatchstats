import { Inject, Injectable } from '@nestjs/common';
import {
  type IPlayerRepository,
  PLAYER_REPOSITORY,
} from '../../domain/interfaces/player.repository.interface';
import { PlayerNotFoundException } from '../../domain/exceptions/player-not-found.exception';

@Injectable()
export class DeletePlayerUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const exists = await this.playerRepository.existsById(id);

    if (!exists) {
      throw new PlayerNotFoundException(id);
    }

    await this.playerRepository.delete(id);
  }
}
