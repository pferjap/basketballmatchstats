import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  clubId: string | null;
}

export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  existsByRole(role: UserRole): Promise<boolean>;
  updateRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void>;
}
