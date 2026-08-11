import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import { Club } from '../../domain/entities/club.entity';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';

@Injectable()
export class GetClubUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  async execute(id: string): Promise<Club> {
    const club = await this.clubRepository.findById(id);

    if (!club) {
      throw new ClubNotFoundException(id);
    }

    return club;
  }
}
