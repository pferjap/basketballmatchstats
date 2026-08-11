import { EventEntity } from '../entities/event.entity';

export const MATCH_EVENT_CREATED = 'match.event.created';
export const MATCH_EVENT_VOIDED = 'match.event.voided';

export class MatchEventCreatedPayload {
  constructor(
    public readonly matchId: string,
    public readonly event: EventEntity,
  ) {}
}

export class MatchEventVoidedPayload {
  constructor(
    public readonly matchId: string,
    public readonly eventId: string,
  ) {}
}
