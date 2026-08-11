import { Inject, Injectable } from '@nestjs/common';
import {
  type IPlayerRepository,
  PLAYER_REPOSITORY,
} from '../../domain/interfaces/player.repository.interface';
import { Player } from '../../domain/entities/player.entity';
import { PlayerNotFoundException } from '../../domain/exceptions/player-not-found.exception';
import { UpdatePlayerDto } from '../dtos/update-player.dto';

@Injectable()
export class UpdatePlayerUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
  ) {}

  async execute(id: string, dto: UpdatePlayerDto): Promise<Player> {
    const exists = await this.playerRepository.existsById(id);

    if (!exists) {
      throw new PlayerNotFoundException(id);
    }

    return this.playerRepository.update(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      jerseyNumber: dto.jerseyNumber,
      position: dto.position,
    });
  }
}
