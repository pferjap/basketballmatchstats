import { Inject, Injectable } from '@nestjs/common';
import {
  TEAM_REPOSITORY,
  type ITeamRepository,
} from '../../domain/interfaces/team.repository.interface';
import {
  FILE_STORAGE_SERVICE,
  type IFileStorageService,
} from '../../../../common/storage/interfaces/file-storage.interface';
import { TeamNotFoundException } from '../../domain/exceptions/team-not-found.exception';

@Injectable()
export class DeleteTeamLogoUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
    @Inject(FILE_STORAGE_SERVICE)
    private readonly fileStorage: IFileStorageService,
  ) {}

  async execute(teamId: string): Promise<void> {
    const team = await this.teamRepository.findById(teamId);

    if (!team) {
      throw new TeamNotFoundException(teamId);
    }

    if (team.logoUrl) {
      await this.fileStorage.delete(team.logoUrl);
    }

    await this.teamRepository.updateLogoUrl(teamId, null);
  }
}
