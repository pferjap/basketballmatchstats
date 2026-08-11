import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../../clubs/domain/interfaces/club.repository.interface';
import { ClubNotFoundException } from '../../../clubs/domain/exceptions/club-not-found.exception';
import {
  type ITeamRepository,
  TEAM_REPOSITORY,
} from '../../domain/interfaces/team.repository.interface';
import { Team } from '../../domain/entities/team.entity';
import { CreateTeamDto } from '../dtos/create-team.dto';

@Injectable()
export class CreateTeamUseCase {
  constructor(
    @Inject(TEAM_REPOSITORY)
    private readonly teamRepository: ITeamRepository,
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  async execute(dto: CreateTeamDto): Promise<Team> {
    const clubExists = await this.clubRepository.existsById(dto.clubId);

    if (!clubExists) {
      throw new ClubNotFoundException(dto.clubId);
    }

    return this.teamRepository.create({
      name: dto.name,
      clubId: dto.clubId,
    });
  }
}
