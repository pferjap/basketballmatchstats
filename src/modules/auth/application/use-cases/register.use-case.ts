import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { EmailAlreadyExistsException } from '../../../users/domain/exceptions/email-already-exists.exception';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { IUserRepository } from '../../../users/domain/interfaces/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/interfaces/user.repository.interface';
import { TokenPair } from '../../domain/interfaces/token-pair.interface';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { RegisterDto } from '../dtos/register.dto';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new EmailAlreadyExistsException(dto.email);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.VIEWER,
      clubId: null,
    });

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
