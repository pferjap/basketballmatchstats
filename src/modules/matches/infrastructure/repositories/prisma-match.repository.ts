import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import type {
  CreateMatchData,
  IMatchRepository,
  MatchFindManyParams,
  UpdateMatchData,
} from '../../domain/interfaces/match.repository.interface';

@Injectable()
export class PrismaMatchRepository implements IMatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMatchData): Promise<MatchEntity> {
    const record = await this.prisma.match.create({
      data: {
        clubId: data.clubId,
        homeTeamId: data.homeTeamId,
        awayTeamId: data.awayTeamId,
        scheduledAt: data.scheduledAt,
        ...(data.totalPeriods !== undefined && {
          totalPeriods: data.totalPeriods,
        }),
        ...(data.periodDurationMinutes !== undefined && {
          periodDurationMinutes: data.periodDurationMinutes,
        }),
      },
    });
    return this.toEntity(record);
  }

  async findById(id: string): Promise<MatchEntity | null> {
    const record = await this.prisma.match.findUnique({ where: { id } });
    return record ? this.toEntity(record) : null;
  }

  async findMany(params: MatchFindManyParams): Promise<MatchEntity[]> {
    const where = this.buildWhere(params);
    const records = await this.prisma.match.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { scheduledAt: 'desc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async count(params: MatchFindManyParams): Promise<number> {
    const where = this.buildWhere(params);
    return this.prisma.match.count({ where });
  }

  async update(id: string, data: UpdateMatchData): Promise<MatchEntity> {
    const record = await this.prisma.match.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status as MatchStatus }),
        ...(data.startedAt && { startedAt: data.startedAt }),
        ...(data.finishedAt && { finishedAt: data.finishedAt }),
        ...(data.period !== undefined && { period: data.period }),
        ...(data.gameClock && { gameClock: data.gameClock }),
        ...(data.homeTeamId && { homeTeamId: data.homeTeamId }),
        ...(data.awayTeamId && { awayTeamId: data.awayTeamId }),
        ...(data.scheduledAt && { scheduledAt: data.scheduledAt }),
        ...(data.totalPeriods !== undefined && {
          totalPeriods: data.totalPeriods,
        }),
        ...(data.periodDurationMinutes !== undefined && {
          periodDurationMinutes: data.periodDurationMinutes,
        }),
        ...(data.suspensionReason !== undefined && {
          suspensionReason: data.suspensionReason,
        }),
      },
    });
    return this.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.match.delete({ where: { id } });
  }

  private buildWhere(params: MatchFindManyParams) {
    const where: Record<string, unknown> = {};
    if (params.clubId) where.clubId = params.clubId;
    if (params.status) where.status = params.status;
    return where;
  }

  private toEntity(record: {
    id: string;
    clubId: string;
    homeTeamId: string;
    awayTeamId: string;
    status: string;
    scheduledAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    period: number;
    gameClock: string;
    totalPeriods: number;
    periodDurationMinutes: number;
    suspensionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MatchEntity {
    return new MatchEntity({
      id: record.id,
      clubId: record.clubId,
      homeTeamId: record.homeTeamId,
      awayTeamId: record.awayTeamId,
      status: record.status as MatchStatus,
      scheduledAt: record.scheduledAt,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      period: record.period,
      gameClock: record.gameClock,
      totalPeriods: record.totalPeriods,
      periodDurationMinutes: record.periodDurationMinutes,
      suspensionReason: record.suspensionReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
