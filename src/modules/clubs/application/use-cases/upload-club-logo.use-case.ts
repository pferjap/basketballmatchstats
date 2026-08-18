import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import {
  FILE_STORAGE_SERVICE,
  type IFileStorageService,
} from '../../../../common/storage/interfaces/file-storage.interface';
import { ImageProcessingService } from '../../../../common/storage/image-processing.service';
import { Club } from '../../domain/entities/club.entity';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';

@Injectable()
export class UploadClubLogoUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async execute(clubId: string, fileBuffer: Buffer): Promise<Club> {
    const exists = await this.clubRepository.existsById(clubId);

    if (!exists) {
      throw new ClubNotFoundException(clubId);
    }

    const optimized = await this.imageProcessing.optimize(fileBuffer);
    const url = await this.fileStorage.upload(
      optimized,
      `clubs/${clubId}.webp`,
    );

    return this.clubRepository.updateLogoUrl(clubId, url);
  }
}
