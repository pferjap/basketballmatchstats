import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../../users/domain/interfaces/user.repository.interface';
import { User } from '../../../users/domain/entities/user.entity';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import { EmailAlreadyExistsException } from '../../../users/domain/exceptions/email-already-exists.exception';
import { InvalidCredentialsException } from '../../domain/interfaces/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '../../domain/interfaces/invalid-refresh-token.exception';
import { RegisterUseCase } from './register.use-case';
import { LoginUseCase } from './login.use-case';
import { RefreshTokenUseCase } from './refresh-token.use-case';

function buildUser(overrides: Partial<User> = {}): User {
  return new User({
    id: overrides.id ?? '11111111-1111-1111-1111-111111111111',
    email: overrides.email ?? 'test@example.com',
    passwordHash:
      overrides.passwordHash ??
      '$2b$12$KIXhz2h0EJkHJLQYKFoFcuIg9RZjf5tE5lF1dU5nOzzShX4mDNMYK',
    firstName: overrides.firstName ?? 'John',
    lastName: overrides.lastName ?? 'Doe',
    role: overrides.role ?? UserRole.VIEWER,
    clubId: overrides.clubId ?? null,
    refreshToken: overrides.refreshToken ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  });
}

function buildUserRepository(): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByRole: jest.fn(),
    updateRefreshToken: jest.fn(),
  };
}

function buildJwtService(): jest.Mocked<
  Pick<JwtService, 'signAsync' | 'verifyAsync'>
> {
  return {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
  };
}

function buildConfigService(): jest.Mocked<Pick<ConfigService, 'getOrThrow'>> {
  return {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
      };

      return map[key] ?? '';
    }),
  };
}

describe('Auth use-cases', () => {
  let userRepository: jest.Mocked<IUserRepository>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'getOrThrow'>>;

  beforeEach(() => {
    userRepository = buildUserRepository();
    jwtService = buildJwtService();
    configService = buildConfigService();
  });

  describe('RegisterUseCase', () => {
    it('registers a new user and returns tokens', async () => {
      const user = buildUser();
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(user);
      userRepository.updateRefreshToken.mockResolvedValue();

      const useCase = new RegisterUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      const result = await useCase.execute({
        email: 'test@example.com',
        password: 'securepassword',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(userRepository.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws EmailAlreadyExistsException when email is taken', async () => {
      userRepository.findByEmail.mockResolvedValue(buildUser());

      const useCase = new RegisterUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      await expect(
        useCase.execute({
          email: 'test@example.com',
          password: 'securepassword',
          firstName: 'John',
          lastName: 'Doe',
        }),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsException);

      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('LoginUseCase', () => {
    it('returns tokens when credentials are valid', async () => {
      const hash = await bcrypt.hash('securepassword', 12);
      const user = buildUser({ passwordHash: hash });
      userRepository.findByEmail.mockResolvedValue(user);
      userRepository.updateRefreshToken.mockResolvedValue();

      const useCase = new LoginUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      const result = await useCase.execute({
        email: 'test@example.com',
        password: 'securepassword',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws InvalidCredentialsException when user not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const useCase = new LoginUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      await expect(
        useCase.execute({
          email: 'nope@example.com',
          password: 'securepassword',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it('throws InvalidCredentialsException when password is wrong', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      userRepository.findByEmail.mockResolvedValue(
        buildUser({ passwordHash: hash }),
      );

      const useCase = new LoginUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      await expect(
        useCase.execute({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });
  });

  describe('RefreshTokenUseCase', () => {
    it('rotates the refresh token when valid', async () => {
      const oldRefreshToken = 'old-refresh-token';
      const oldRefreshHash = await bcrypt.hash(oldRefreshToken, 10);
      const user = buildUser({ refreshToken: oldRefreshHash });

      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
      });
      userRepository.findById.mockResolvedValue(user);
      userRepository.updateRefreshToken.mockResolvedValue();

      const useCase = new RefreshTokenUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      const result = await useCase.execute({ refreshToken: oldRefreshToken });

      expect(result.accessToken).toBe('mock-token');
      expect(userRepository.updateRefreshToken).toHaveBeenCalled();
    });

    it('throws InvalidRefreshTokenException when token verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

      const useCase = new RefreshTokenUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      await expect(
        useCase.execute({ refreshToken: 'bad-token' }),
      ).rejects.toBeInstanceOf(InvalidRefreshTokenException);
    });

    it('throws InvalidRefreshTokenException when user has no stored token', async () => {
      const user = buildUser({ refreshToken: null });
      jwtService.verifyAsync.mockResolvedValue({
        sub: user.id,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
      });
      userRepository.findById.mockResolvedValue(user);

      const useCase = new RefreshTokenUseCase(
        userRepository,
        jwtService as unknown as JwtService,
        configService as unknown as ConfigService,
      );

      await expect(
        useCase.execute({ refreshToken: 'some-token' }),
      ).rejects.toBeInstanceOf(InvalidRefreshTokenException);
    });
  });
});
