import { Injectable } from '@nestjs/common';
import { User as PrismaUser } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import {
  CreateUserData,
  FindAllResult,
  IUserRepository,
  UserFilters,
  UserWithClubName,
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

  async findAllPaginated(
    skip: number,
    take: number,
    filters?: UserFilters,
  ): Promise<FindAllResult> {
    const where = this.buildWhereClause(filters);

    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { club: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: records.map((record) => ({
        user: this.toDomain(record),
        clubName: record.club?.name ?? null,
      })),
      total,
    };
  }

  async findByIdWithClubName(id: string): Promise<UserWithClubName | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
      include: { club: { select: { name: true } } },
    });

    if (!record) return null;

    return {
      user: this.toDomain(record),
      clubName: record.club?.name ?? null,
    };
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return this.toDomain(record);
  }

  async updateClub(userId: string, clubId: string | null): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id: userId },
      data: { clubId },
    });

    return this.toDomain(record);
  }

  private buildWhereClause(filters?: UserFilters) {
    if (!filters) return {};

    const where: Record<string, unknown> = {};

    if (filters.clubId) {
      where.clubId = filters.clubId;
    }

    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
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
