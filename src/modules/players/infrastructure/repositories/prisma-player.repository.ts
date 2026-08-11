import { Injectable } from '@nestjs/common';
import { Prisma, Player as PrismaPlayer } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { Player, PlayerPosition } from '../../domain/entities/player.entity';
import {
  CreatePlayerData,
  IPlayerRepository,
  PlayerFindManyParams,
  UpdatePlayerData,
} from '../../domain/interfaces/player.repository.interface';

@Injectable()
export class PrismaPlayerRepository implements IPlayerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePlayerData): Promise<Player> {
    const player = await this.prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        jerseyNumber: data.jerseyNumber,
        position: data.position,
        teamId: data.teamId,
      },
    });

    return this.toDomain(player);
  }

  async findById(id: string): Promise<Player | null> {
    const player = await this.prisma.player.findUnique({ where: { id } });

    return player ? this.toDomain(player) : null;
  }

  async findMany(params: PlayerFindManyParams): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: this.buildWhere(params.teamId, params.clubId),
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
    });

    return players.map((player) => this.toDomain(player));
  }

  count(teamId?: string): Promise<number> {
    return this.prisma.player.count({ where: this.buildWhere(teamId) });
  }

  countByClub(clubId: string, teamId?: string): Promise<number> {
    return this.prisma.player.count({
      where: this.buildWhere(teamId, clubId),
    });
  }

  async update(id: string, data: UpdatePlayerData): Promise<Player> {
    const player = await this.prisma.player.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        jerseyNumber: data.jerseyNumber,
        position: data.position,
      },
    });

    return this.toDomain(player);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.player.delete({ where: { id } });
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.player.count({ where: { id } });

    return count > 0;
  }

  private buildWhere(
    teamId?: string,
    clubId?: string,
  ): Prisma.PlayerWhereInput | undefined {
    const where: Prisma.PlayerWhereInput = {};

    if (teamId) {
      where.teamId = teamId;
    }
    if (clubId) {
      where.team = { clubId };
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  private toDomain(player: PrismaPlayer): Player {
    return new Player({
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      jerseyNumber: player.jerseyNumber,
      position: player.position as PlayerPosition | null,
      teamId: player.teamId,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    });
  }
}
