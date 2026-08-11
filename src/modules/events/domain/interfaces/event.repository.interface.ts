import type { EventEntity } from '../entities/event.entity';

export interface EventFindManyParams {
  matchId: string;
  eventType?: string;
  teamId?: string;
  playerId?: string;
  period?: number;
  isVoided?: boolean;
  skip?: number;
  take?: number;
}

export interface CreateEventData {
  matchId: string;
  teamId: string;
  playerId?: string | null;
  eventType: string;
  period: number;
  gameClock: string;
  coordinates?: { x: number; y: number } | null;
  metadata?: Record<string, unknown> | null;
}

export interface IEventRepository {
  create(data: CreateEventData): Promise<EventEntity>;
  findById(id: string): Promise<EventEntity | null>;
  findMany(params: EventFindManyParams): Promise<EventEntity[]>;
  count(params: EventFindManyParams): Promise<number>;
  voidEvent(id: string): Promise<EventEntity>;
}

export const EVENT_REPOSITORY = Symbol('EVENT_REPOSITORY');
