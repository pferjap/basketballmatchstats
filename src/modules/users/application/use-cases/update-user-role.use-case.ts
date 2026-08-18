import { Inject, Injectable } from '@nestjs/common';
import {
  USER_REPOSITORY,
  type IUserRepository,
} from '../../domain/interfaces/user.repository.interface';
import { UserRole } from '../../domain/enums/user-role.enum';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { CannotModifyOwnRoleException } from '../../domain/exceptions/cannot-modify-own-role.exception';
import { InvalidRoleAssignmentException } from '../../domain/exceptions/invalid-role-assignment.exception';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class UpdateUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    targetUserId: string,
    newRole: UserRole,
    currentUserId: string,
  ): Promise<User> {
    if (targetUserId === currentUserId) {
      throw new CannotModifyOwnRoleException();
    }

    if (newRole === UserRole.SUPER_ADMIN) {
      throw new InvalidRoleAssignmentException(UserRole.SUPER_ADMIN);
    }

    const user = await this.userRepository.findById(targetUserId);

    if (!user) {
      throw new UserNotFoundException(targetUserId);
    }

    return this.userRepository.updateRole(targetUserId, newRole);
  }
}
