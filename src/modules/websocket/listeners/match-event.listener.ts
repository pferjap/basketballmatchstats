import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MatchGateway } from '../gateways/match.gateway';
import {
  MATCH_EVENT_CREATED,
  MATCH_EVENT_VOIDED,
  MatchEventCreatedPayload,
  MatchEventVoidedPayload,
} from '../../events/domain/events/match-event.events';

@Injectable()
export class MatchEventListener {
  constructor(private readonly matchGateway: MatchGateway) {}

  @OnEvent(MATCH_EVENT_CREATED)
  handleEventCreated(payload: MatchEventCreatedPayload): void {
    this.matchGateway.emitToMatch(payload.matchId, 'event.created', {
      id: payload.event.id,
      matchId: payload.event.matchId,
      teamId: payload.event.teamId,
      playerId: payload.event.playerId,
      eventType: payload.event.eventType,
      period: payload.event.period,
      gameClock: payload.event.gameClock,
      coordinates: payload.event.coordinates,
      metadata: payload.event.metadata,
      createdAt: payload.event.createdAt,
    });
  }

  @OnEvent(MATCH_EVENT_VOIDED)
  handleEventVoided(payload: MatchEventVoidedPayload): void {
    this.matchGateway.emitToMatch(payload.matchId, 'event.voided', {
      eventId: payload.eventId,
      matchId: payload.matchId,
    });
  }
}
