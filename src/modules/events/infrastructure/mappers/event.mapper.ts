import { EventEntity } from '../../domain/entities/event.entity';
import { EventResponseDto } from '../../application/dtos/event-response.dto';

export class EventMapper {
  static toResponse(entity: EventEntity): EventResponseDto {
    return {
      id: entity.id,
      matchId: entity.matchId,
      teamId: entity.teamId,
      playerId: entity.playerId,
      eventType: entity.eventType,
      period: entity.period,
      gameClock: entity.gameClock,
      coordinates: entity.coordinates,
      metadata: entity.metadata,
      isVoided: entity.isVoided,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
