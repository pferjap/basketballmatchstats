import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { IUserRepository } from '../../../users/domain/interfaces/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/interfaces/user.repository.interface';
import { InvalidCredentialsException } from '../../domain/interfaces/invalid-credentials.exception';
import { TokenPair } from '../../domain/interfaces/token-pair.interface';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.clubId,
    );

    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.updateRefreshToken(user.id, refreshTokenHash);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        clubId: user.clubId,
      },
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    clubId: string | null,
  ): Promise<TokenPair> {
    const payload = { sub: userId, email, role, clubId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_ACCESS_EXPIRATION',
        ),
      } as JwtSignOptions),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRATION',
        ),
      } as JwtSignOptions),
    ]);

    return { accessToken, refreshToken };
  }
}
