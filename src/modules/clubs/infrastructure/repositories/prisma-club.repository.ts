import { Injectable } from '@nestjs/common';
import { Club as PrismaClub } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { Club } from '../../domain/entities/club.entity';
import {
  ClubPaginationParams,
  CreateClubData,
  IClubRepository,
  UpdateClubData,
} from '../../domain/interfaces/club.repository.interface';

@Injectable()
export class PrismaClubRepository implements IClubRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateClubData): Promise<Club> {
    const club = await this.prisma.club.create({
      data: { name: data.name, city: data.city },
    });

    return this.toDomain(club);
  }

  async findById(id: string): Promise<Club | null> {
    const club = await this.prisma.club.findUnique({ where: { id } });

    return club ? this.toDomain(club) : null;
  }

  async findMany(params: ClubPaginationParams): Promise<Club[]> {
    const where = params.clubId ? { id: params.clubId } : undefined;
    const clubs = await this.prisma.club.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });

    return clubs.map((club) => this.toDomain(club));
  }

  count(clubId?: string): Promise<number> {
    return this.prisma.club.count({
      where: clubId ? { id: clubId } : undefined,
    });
  }

  async update(id: string, data: UpdateClubData): Promise<Club> {
    const club = await this.prisma.club.update({
      where: { id },
      data: { name: data.name, city: data.city },
    });

    return this.toDomain(club);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.club.delete({ where: { id } });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.club.count({ where: { id } });

    return count > 0;
  }

  async updateLogoUrl(id: string, logoUrl: string | null): Promise<Club> {
    const club = await this.prisma.club.update({
      where: { id },
      data: { logoUrl },
    });

    return this.toDomain(club);
  }

  private toDomain(club: PrismaClub): Club {
    return new Club({
      id: club.id,
      name: club.name,
      city: club.city,
      logoUrl: club.logoUrl,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    });
  }
}
