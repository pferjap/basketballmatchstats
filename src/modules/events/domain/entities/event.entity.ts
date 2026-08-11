import { EventType } from '../enums/event-type.enum';

export interface Coordinates {
  x: number;
  y: number;
}

export interface EventProperties {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string | null;
  eventType: EventType;
  period: number;
  gameClock: string;
  coordinates: Coordinates | null;
  metadata: Record<string, unknown> | null;
  isVoided: boolean;
  createdAt: Date;
}

export class EventEntity {
  readonly id: string;
  readonly matchId: string;
  readonly teamId: string;
  readonly playerId: string | null;
  readonly eventType: EventType;
  readonly period: number;
  readonly gameClock: string;
  readonly coordinates: Coordinates | null;
  readonly metadata: Record<string, unknown> | null;
  readonly isVoided: boolean;
  readonly createdAt: Date;

  constructor(properties: EventProperties) {
    this.id = properties.id;
    this.matchId = properties.matchId;
    this.teamId = properties.teamId;
    this.playerId = properties.playerId;
    this.eventType = properties.eventType;
    this.period = properties.period;
    this.gameClock = properties.gameClock;
    this.coordinates = properties.coordinates;
    this.metadata = properties.metadata;
    this.isVoided = properties.isVoided;
    this.createdAt = properties.createdAt;
  }
}
