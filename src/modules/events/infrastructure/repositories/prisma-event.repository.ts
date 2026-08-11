import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventType } from '../../domain/enums/event-type.enum';
import type {
  CreateEventData,
  EventFindManyParams,
  IEventRepository,
} from '../../domain/interfaces/event.repository.interface';

@Injectable()
export class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEventData): Promise<EventEntity> {
    const record = await this.prisma.event.create({
      data: {
        matchId: data.matchId,
        teamId: data.teamId,
        playerId: data.playerId ?? null,
        eventType: data.eventType as EventType,
        period: data.period,
        gameClock: data.gameClock,
        coordinates: data.coordinates
          ? (data.coordinates as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        metadata: data.metadata
          ? (data.metadata as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<EventEntity | null> {
    const record = await this.prisma.event.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findMany(params: EventFindManyParams): Promise<EventEntity[]> {
    const where = this.buildWhere(params);
    const records = await this.prisma.event.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async count(params: EventFindManyParams): Promise<number> {
    const where = this.buildWhere(params);
    return this.prisma.event.count({ where });
  }

  async voidEvent(id: string): Promise<EventEntity> {
    const record = await this.prisma.event.update({
      where: { id },
      data: { isVoided: true },
    });
    return this.toEntity(record);
  }

  private buildWhere(params: EventFindManyParams) {
    const where: Record<string, unknown> = { matchId: params.matchId };
    if (params.eventType) where.eventType = params.eventType;
    if (params.teamId) where.teamId = params.teamId;
    if (params.playerId) where.playerId = params.playerId;
    if (params.period !== undefined) where.period = params.period;
    if (params.isVoided !== undefined) where.isVoided = params.isVoided;
    return where;
  }

  private toEntity(record: {
    id: string;
    matchId: string;
    teamId: string;
    playerId: string | null;
    eventType: string;
    period: number;
    gameClock: string;
    coordinates: unknown;
    metadata: unknown;
    isVoided: boolean;
    createdAt: Date;
  }): EventEntity {
    return new EventEntity({
      id: record.id,
      matchId: record.matchId,
      teamId: record.teamId,
      playerId: record.playerId,
      eventType: record.eventType as EventType,
      period: record.period,
      gameClock: record.gameClock,
      coordinates: record.coordinates as { x: number; y: number } | null,
      metadata: record.metadata as Record<string, unknown> | null,
      isVoided: record.isVoided,
      createdAt: record.createdAt,
    });
  }
}
