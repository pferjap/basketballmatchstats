import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';

@Injectable()
export class DeleteClubUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const exists = await this.clubRepository.existsById(id);

    if (!exists) {
      throw new ClubNotFoundException(id);
    }

    await this.clubRepository.delete(id);
  }
}
