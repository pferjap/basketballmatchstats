import { Inject, Injectable } from '@nestjs/common';
import {
  TEAM_REPOSITORY,
  type ITeamRepository,
} from '../../domain/interfaces/team.repository.interface';
import {
  FILE_STORAGE_SERVICE,
  type IFileStorageService,
} from '../../../../common/storage/interfaces/file-storage.interface';
import { ImageProcessingService } from '../../../../common/storage/image-processing.service';
import { Team } from '../../domain/entities/team.entity';
import { TeamNotFoundException } from '../../domain/exceptions/team-not-found.exception';

@Injectable()
export class UploadTeamLogoUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
    private readonly imageProcessing: ImageProcessingService,
  ) {}

  async execute(teamId: string, fileBuffer: Buffer): Promise<Team> {
    const exists = await this.teamRepository.existsById(teamId);

    if (!exists) {
      throw new TeamNotFoundException(teamId);
    }

    const optimized = await this.imageProcessing.optimize(fileBuffer);
    const url = await this.fileStorage.upload(
      optimized,
      `teams/${teamId}.webp`,
    );

    return this.teamRepository.updateLogoUrl(teamId, url);
  }
}
