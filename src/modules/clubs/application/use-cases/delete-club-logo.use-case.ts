import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import {
  FILE_STORAGE_SERVICE,
  type IFileStorageService,
} from '../../../../common/storage/interfaces/file-storage.interface';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';

@Injectable()
export class DeleteClubLogoUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
  ) {}

  async execute(clubId: string): Promise<void> {
    const club = await this.clubRepository.findById(clubId);

    if (!club) {
      throw new ClubNotFoundException(clubId);
    }

    if (club.logoUrl) {
      await this.fileStorage.delete(club.logoUrl);
    }

    await this.clubRepository.updateLogoUrl(clubId, null);
  }
}
