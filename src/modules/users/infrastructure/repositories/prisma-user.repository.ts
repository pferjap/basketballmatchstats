import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import {
  CreateUserData,
  IUserRepository,
} from '../../domain/interfaces/user.repository.interface';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    const record = await this.prisma.user.create({ data });

    return this.toDomain(record);
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });

    return record ? this.toDomain(record) : null;
  }

  async existsByRole(role: UserRole): Promise<boolean> {
    const record = await this.prisma.user.findFirst({
      where: { role },
      select: { id: true },
    });

    return record !== null;
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: refreshTokenHash },
    });
  }

  private toDomain(record: PrismaUser): User {
    return new User({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      firstName: record.firstName,
      lastName: record.lastName,
      role: record.role as UserRole,
      clubId: record.clubId,
      refreshToken: record.refreshToken,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
