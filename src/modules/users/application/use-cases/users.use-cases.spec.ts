import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { CannotModifyOwnRoleException } from '../../domain/exceptions/cannot-modify-own-role.exception';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';
import { InvalidRoleAssignmentException } from '../../domain/exceptions/invalid-role-assignment.exception';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import {
  IUserRepository,
  UserWithClubName,
} from '../../domain/interfaces/user.repository.interface';
import { IClubRepository } from '../../../clubs/domain/interfaces/club.repository.interface';
import { GetUserUseCase } from './get-user.use-case';
import { ListUsersUseCase } from './list-users.use-case';
import { UpdateUserClubUseCase } from './update-user-club.use-case';
import { UpdateUserRoleUseCase } from './update-user-role.use-case';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
const CLUB_ID = '33333333-3333-3333-3333-333333333333';

function buildUser(overrides: Partial<User> = {}): User {
  return new User({
    id: overrides.id ?? USER_ID,
    email: overrides.email ?? 'test@example.com',
    passwordHash: overrides.passwordHash ?? 'hashed',
    firstName: overrides.firstName ?? 'John',
    lastName: overrides.lastName ?? 'Doe',
    role: overrides.role ?? UserRole.VIEWER,
    clubId: overrides.clubId ?? null,
    refreshToken: overrides.refreshToken ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-01-01'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-02'),
  });
}

function buildUserWithClub(
  overrides: Partial<User> = {},
  clubName: string | null = null,
): UserWithClubName {
  return { user: buildUser(overrides), clubName };
}

function buildUserRepository(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByRole: jest.fn(),
    updateRefreshToken: jest.fn(),
    findAllPaginated: jest.fn(),
    findByIdWithClubName: jest.fn(),
    updateRole: jest.fn(),
    updateClub: jest.fn(),
  };
}

function buildClubRepository(): jest.Mocked<IClubRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsById: jest.fn(),
  };
}

describe('Users use-cases', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let clubRepository: jest.Mocked<IClubRepository>;

  beforeEach(() => {
    userRepository = buildUserRepository();
    clubRepository = buildClubRepository();
  });

  describe('ListUsersUseCase', () => {
    it('computes skip from page/limit and delegates to repository', async () => {
      const entry = buildUserWithClub();
      userRepository.findAllPaginated.mockResolvedValue({
        data: [entry],
        total: 1,
      });
      const useCase = new ListUsersUseCase(userRepository);

      const result = await useCase.execute(2, 10, { search: 'john' });

      expect(userRepository.findAllPaginated).toHaveBeenCalledWith(10, 10, {
        search: 'john',
      });
      expect(result).toEqual({ data: [entry], total: 1 });
    });

    it('passes clubId filter to repository', async () => {
      userRepository.findAllPaginated.mockResolvedValue({
        data: [],
        total: 0,
      });
      const useCase = new ListUsersUseCase(userRepository);

      await useCase.execute(1, 10, { clubId: CLUB_ID });

      expect(userRepository.findAllPaginated).toHaveBeenCalledWith(0, 10, {
        clubId: CLUB_ID,
      });
    });
  });

  describe('GetUserUseCase', () => {
    it('returns the user with club name when found', async () => {
      const entry = buildUserWithClub({}, 'Chicago Bulls');
      userRepository.findByIdWithClubName.mockResolvedValue(entry);
      const useCase = new GetUserUseCase(userRepository);

      const result = await useCase.execute(USER_ID);

      expect(result).toBe(entry);
    });

    it('throws UserNotFoundException when not found', async () => {
      userRepository.findByIdWithClubName.mockResolvedValue(null);
      const useCase = new GetUserUseCase(userRepository);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        UserNotFoundException,
      );
    });
  });

  describe('UpdateUserRoleUseCase', () => {
    it('updates the role of another user', async () => {
      const user = buildUser({ id: USER_ID });
      const updated = buildUser({ id: USER_ID, role: UserRole.COACH });
      userRepository.findById.mockResolvedValue(user);
      userRepository.updateRole.mockResolvedValue(updated);
      const useCase = new UpdateUserRoleUseCase(userRepository);

      const result = await useCase.execute(
        USER_ID,
        UserRole.COACH,
        OTHER_USER_ID,
      );

      expect(userRepository.updateRole).toHaveBeenCalledWith(
        USER_ID,
        UserRole.COACH,
      );
      expect(result.role).toBe(UserRole.COACH);
    });

    it('throws CannotModifyOwnRoleException for self-modification', async () => {
      const useCase = new UpdateUserRoleUseCase(userRepository);

      await expect(
        useCase.execute(USER_ID, UserRole.COACH, USER_ID),
      ).rejects.toBeInstanceOf(CannotModifyOwnRoleException);

      expect(userRepository.updateRole).not.toHaveBeenCalled();
    });

    it('throws InvalidRoleAssignmentException when assigning SUPER_ADMIN', async () => {
      const useCase = new UpdateUserRoleUseCase(userRepository);

      await expect(
        useCase.execute(USER_ID, UserRole.SUPER_ADMIN, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(InvalidRoleAssignmentException);

      expect(userRepository.updateRole).not.toHaveBeenCalled();
    });

    it('throws UserNotFoundException when target user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);
      const useCase = new UpdateUserRoleUseCase(userRepository);

      await expect(
        useCase.execute('missing', UserRole.COACH, OTHER_USER_ID),
      ).rejects.toBeInstanceOf(UserNotFoundException);

      expect(userRepository.updateRole).not.toHaveBeenCalled();
    });
  });

  describe('UpdateUserClubUseCase', () => {
    it('assigns a club to a user', async () => {
      const user = buildUser();
      const updated = buildUser({ clubId: CLUB_ID });
      userRepository.findById.mockResolvedValue(user);
      clubRepository.existsById.mockResolvedValue(true);
      userRepository.updateClub.mockResolvedValue(updated);
      const useCase = new UpdateUserClubUseCase(
        userRepository,
        clubRepository,
      );

      const result = await useCase.execute(USER_ID, CLUB_ID);

      expect(clubRepository.existsById).toHaveBeenCalledWith(CLUB_ID);
      expect(userRepository.updateClub).toHaveBeenCalledWith(USER_ID, CLUB_ID);
      expect(result.clubId).toBe(CLUB_ID);
    });

    it('disassociates a user from a club when clubId is null', async () => {
      const user = buildUser({ clubId: CLUB_ID });
      const updated = buildUser({ clubId: null });
      userRepository.findById.mockResolvedValue(user);
      userRepository.updateClub.mockResolvedValue(updated);
      const useCase = new UpdateUserClubUseCase(
        userRepository,
        clubRepository,
      );

      const result = await useCase.execute(USER_ID, null);

      expect(clubRepository.existsById).not.toHaveBeenCalled();
      expect(userRepository.updateClub).toHaveBeenCalledWith(USER_ID, null);
      expect(result.clubId).toBeNull();
    });

    it('throws UserNotFoundException when user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);
      const useCase = new UpdateUserClubUseCase(
        userRepository,
        clubRepository,
      );

      await expect(
        useCase.execute('missing', CLUB_ID),
      ).rejects.toBeInstanceOf(UserNotFoundException);

      expect(userRepository.updateClub).not.toHaveBeenCalled();
    });

    it('throws ClubNotFoundException when club does not exist', async () => {
      const user = buildUser();
      userRepository.findById.mockResolvedValue(user);
      clubRepository.existsById.mockResolvedValue(false);
      const useCase = new UpdateUserClubUseCase(
        userRepository,
        clubRepository,
      );

      await expect(
        useCase.execute(USER_ID, 'nonexistent'),
      ).rejects.toBeInstanceOf(ClubNotFoundException);

      expect(userRepository.updateClub).not.toHaveBeenCalled();
    });
  });
});
