import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import type { IUserRepository } from '../../../users/domain/interfaces/user.repository.interface';
import { USER_REPOSITORY } from '../../../users/domain/interfaces/user.repository.interface';
import { InitSetupDto } from '../dtos/init-setup.dto';

export interface InitSetupResponse {
  message: string;
  email: string;
}

@Injectable()
export class InitSetupUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: InitSetupDto): Promise<InitSetupResponse> {
    const superAdminExists = await this.userRepository.existsByRole(
      UserRole.SUPER_ADMIN,
    );

    if (superAdminExists) {
      throw new ConflictException(
        'Setup already completed. A SUPER_ADMIN user already exists.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.SUPER_ADMIN,
      clubId: null,
    });

    return {
      message:
        'SUPER_ADMIN created successfully. Use /auth/login to obtain your access token.',
      email: dto.email,
    };
  }
}
