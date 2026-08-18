import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
  type UserWithClubName,
} from '../../domain/interfaces/user.repository.interface';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(id: string): Promise<UserWithClubName> {
    const result = await this.userRepository.findByIdWithClubName(id);

    if (!result) {
      throw new UserNotFoundException(id);
    }

    return result;
  }
}
