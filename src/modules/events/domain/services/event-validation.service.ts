import { Injectable } from '@nestjs/common';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { EventType, PLAYER_REQUIRED_EVENTS } from '../enums/event-type.enum';
import { InvalidEventException } from '../exceptions/invalid-event.exception';

export interface EventValidationContext {
  matchStatus: MatchStatus;
  matchPeriod: number;
  homeTeamId: string;
  awayTeamId: string;
}

export interface EventToValidate {
  eventType: EventType;
  teamId: string;
  playerId: string | null | undefined;
  period: number;
}

@Injectable()
export class EventValidationService {
  /**
   * Validates that an event can be created in the current match context.
   * Throws InvalidEventException if any rule is violated.
   */
  validate(event: EventToValidate, context: EventValidationContext): void {
    this.validateMatchIsOngoing(context.matchStatus);
    this.validateTeamBelongsToMatch(event.teamId, context);
    this.validatePlayerRequired(event.eventType, event.playerId);
    this.validatePeriodConsistency(event.period, context.matchPeriod);
  }

  private validateMatchIsOngoing(status: MatchStatus): void {
    if (status !== MatchStatus.ONGOING) {
      throw new InvalidEventException(
        `Cannot register events on a match with status "${status}". Match must be ONGOING.`,
      );
    }
  }

  private validateTeamBelongsToMatch(
    teamId: string,
    context: EventValidationContext,
  ): void {
    if (teamId !== context.homeTeamId && teamId !== context.awayTeamId) {
      throw new InvalidEventException(
        `Team "${teamId}" is not participating in this match`,
      );
    }
  }

  private validatePlayerRequired(
    eventType: EventType,
    playerId: string | null | undefined,
  ): void {
    if (PLAYER_REQUIRED_EVENTS.includes(eventType) && !playerId) {
      throw new InvalidEventException(
        `Event type "${eventType}" requires a playerId`,
      );
    }
  }

  private validatePeriodConsistency(
    eventPeriod: number,
    matchPeriod: number,
  ): void {
    if (eventPeriod < 1) {
      throw new InvalidEventException('Period must be at least 1');
    }
    if (eventPeriod > matchPeriod) {
      throw new InvalidEventException(
        `Event period (${eventPeriod}) cannot exceed the current match period (${matchPeriod})`,
      );
    }
  }
}
