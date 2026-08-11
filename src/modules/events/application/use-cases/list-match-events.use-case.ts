import { Inject, Injectable } from '@nestjs/common';
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface';
import { EVENT_REPOSITORY } from '../../domain/interfaces/event.repository.interface';
import { EventEntity } from '../../domain/entities/event.entity';

export interface ListMatchEventsParams {
  matchId: string;
  eventType?: string;
  teamId?: string;
  playerId?: string;
  period?: number;
  page: number;
  limit: number;
}

export interface PaginatedEvents {
  data: EventEntity[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListMatchEventsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
  ) {}

  async execute(params: ListMatchEventsParams): Promise<PaginatedEvents> {
    const { matchId, eventType, teamId, playerId, period, page, limit } =
      params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.eventRepository.findMany({
        matchId,
        eventType,
        teamId,
        playerId,
        period,
        isVoided: false,
        skip,
        take: limit,
      }),
      this.eventRepository.count({
        matchId,
        eventType,
        teamId,
        playerId,
        period,
        isVoided: false,
      }),
    ]);

    return { data, total, page, limit };
  }
}
