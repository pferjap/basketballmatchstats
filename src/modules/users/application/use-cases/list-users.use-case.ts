import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
  type FindAllResult,
  type UserFilters,
} from '../../domain/interfaces/user.repository.interface';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    page: number,
    limit: number,
    filters?: UserFilters,
  ): Promise<FindAllResult> {
    const skip = (page - 1) * limit;

    return this.userRepository.findAllPaginated(skip, limit, filters);
  }
}
