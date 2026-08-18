import { UserWithClubName } from '../../domain/interfaces/user.repository.interface';
import { UserResponseDto } from '../dtos/user-response.dto';

export class UserMapper {
  static toResponse(entry: UserWithClubName): UserResponseDto {
    const { user, clubName } = entry;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      clubId: user.clubId,
      clubName,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
