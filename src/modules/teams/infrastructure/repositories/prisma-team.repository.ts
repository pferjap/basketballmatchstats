import { Injectable } from '@nestjs/common';
import { Prisma, Team as PrismaTeam } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { Team } from '../../domain/entities/team.entity';
import {
  CreateTeamData,
  ITeamRepository,
  TeamFindManyParams,
  UpdateTeamData,
} from '../../domain/interfaces/team.repository.interface';

@Injectable()
export class PrismaTeamRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTeamData): Promise<Team> {
    const team = await this.prisma.team.create({
      data: { name: data.name, clubId: data.clubId },
    });

    return this.toDomain(team);
  }

  async findById(id: string): Promise<Team | null> {
    const team = await this.prisma.team.findUnique({ where: { id } });

    return team ? this.toDomain(team) : null;
  }

  async findMany(params: TeamFindManyParams): Promise<Team[]> {
    const teams = await this.prisma.team.findMany({
      where: this.buildWhere(params.clubId),
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });

    return teams.map((team) => this.toDomain(team));
  }

  count(clubId?: string): Promise<number> {
    return this.prisma.team.count({ where: this.buildWhere(clubId) });
  }

  async update(id: string, data: UpdateTeamData): Promise<Team> {
    const team = await this.prisma.team.update({
      where: { id },
      data: { name: data.name },
    });

    return this.toDomain(team);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.team.delete({ where: { id } });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.team.count({ where: { id } });

    return count > 0;
  }

  private buildWhere(clubId?: string): Prisma.TeamWhereInput | undefined {
    return clubId ? { clubId } : undefined;
  }

  private toDomain(team: PrismaTeam): Team {
    return new Team({
      id: team.id,
      name: team.name,
      clubId: team.clubId,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    });
  }
}
