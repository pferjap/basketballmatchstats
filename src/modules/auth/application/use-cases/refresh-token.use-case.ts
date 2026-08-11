import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { IUserRepository } from '../../../users/domain/interfaces/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/interfaces/user.repository.interface';
import { InvalidRefreshTokenException } from '../../domain/interfaces/invalid-refresh-token.exception';
import { TokenPair } from '../../domain/interfaces/token-pair.interface';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';

interface RefreshTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  clubId: string | null;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        dto.refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );
    } catch {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user || !user.refreshToken) {
      throw new InvalidRefreshTokenException();
    }

    const tokenMatches = await bcrypt.compare(
      dto.refreshToken,
      user.refreshToken,
    );

    if (!tokenMatches) {
      throw new InvalidRefreshTokenException();
    }

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.clubId,
    );

    const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.userRepository.updateRefreshToken(user.id, newRefreshHash);

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
