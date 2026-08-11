import { EventType } from '../../domain/enums/event-type.enum';

export interface EventResponseDto {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string | null;
  eventType: EventType;
  period: number;
  gameClock: string;
  coordinates: { x: number; y: number } | null;
  metadata: Record<string, unknown> | null;
  isVoided: boolean;
  createdAt: string;
}
