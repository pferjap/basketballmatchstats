import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYER_REPOSITORY,
  type IPlayerRepository,
} from '../../domain/interfaces/player.repository.interface';
import {
  FILE_STORAGE_SERVICE,
  type IFileStorageService,
} from '../../../../common/storage/interfaces/file-storage.interface';
import { PlayerNotFoundException } from '../../domain/exceptions/player-not-found.exception';

@Injectable()
export class DeletePlayerPhotoUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
  ) {}

  async execute(playerId: string): Promise<void> {
    const player = await this.playerRepository.findById(playerId);

    if (!player) {
      throw new PlayerNotFoundException(playerId);
    }

    if (player.photoUrl) {
      await this.fileStorage.delete(player.photoUrl);
    }

    await this.playerRepository.updatePhotoUrl(playerId, null);
  }
}
