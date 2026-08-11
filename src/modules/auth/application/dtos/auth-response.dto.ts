import { UserRole } from '../../../users/domain/enums/user-role.enum';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    clubId: string | null;
  };
}
