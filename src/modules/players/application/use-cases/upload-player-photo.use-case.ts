import { Inject, Injectable } from '@nestjs/common';
import {
  PLAYER_REPOSITORY,
  type IPlayerRepository,
} from '../../domain/interfaces/player.repository.interface';
import {
  FILE_STORAGE_SERVICE,
  type IFileStorageService,
} from '../../../../common/storage/interfaces/file-storage.interface';
import { ImageProcessingService } from '../../../../common/storage/image-processing.service';
import { Player } from '../../domain/entities/player.entity';
import { PlayerNotFoundException } from '../../domain/exceptions/player-not-found.exception';

@Injectable()
export class UploadPlayerPhotoUseCase {
  constructor(
    @Inject(PLAYER_REPOSITORY)
    private readonly playerRepository: IPlayerRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async execute(playerId: string, fileBuffer: Buffer): Promise<Player> {
    const exists = await this.playerRepository.existsById(playerId);

    if (!exists) {
      throw new PlayerNotFoundException(playerId);
    }

    const optimized = await this.imageProcessing.optimize(fileBuffer);
    const url = await this.fileStorage.upload(
      optimized,
      `players/${playerId}.webp`,
    );

    return this.playerRepository.updatePhotoUrl(playerId, url);
  }
}
