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

export interface UserFilters {
  search?: string;
  clubId?: string;
}

export interface UserWithClubName {
  user: User;
  clubName: string | null;
}

export interface FindAllResult {
  data: UserWithClubName[];
  total: number;
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
  findAllPaginated(
    skip: number,
    take: number,
    filters?: UserFilters,
  ): Promise<FindAllResult>;
  findByIdWithClubName(id: string): Promise<UserWithClubName | null>;
  updateRole(userId: string, role: UserRole): Promise<User>;
  updateClub(userId: string, clubId: string | null): Promise<User>;
}
