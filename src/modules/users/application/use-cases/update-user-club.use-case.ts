import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../domain/interfaces/user.repository.interface';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../../clubs/domain/interfaces/club.repository.interface';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UpdateUserClubUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  async execute(targetUserId: string, clubId: string | null): Promise<User> {
    const user = await this.userRepository.findById(targetUserId);

    if (!user) {
      throw new UserNotFoundException(targetUserId);
    }

    if (clubId !== null) {
      const clubExists = await this.clubRepository.existsById(clubId);

      if (!clubExists) {
        throw new ClubNotFoundException(clubId);
      }
    }

    return this.userRepository.updateClub(targetUserId, clubId);
  }
}
