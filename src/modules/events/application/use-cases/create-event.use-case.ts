import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface';
import { EVENT_REPOSITORY } from '../../domain/interfaces/event.repository.interface';
import type { IMatchRepository } from '../../../matches/domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../../matches/domain/interfaces/match.repository.interface';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventValidationService } from '../../domain/services/event-validation.service';
import { MatchNotFoundException } from '../../../matches/domain/exceptions/match-not-found.exception';
import { CreateEventDto } from '../dtos/create-event.dto';
import {
  MATCH_EVENT_CREATED,
  MatchEventCreatedPayload,
} from '../../domain/events/match-event.events';

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
    private readonly validationService: EventValidationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(matchId: string, dto: CreateEventDto): Promise<EventEntity> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new MatchNotFoundException(matchId);
    }

    this.validationService.validate(
      {
        eventType: dto.eventType,
        teamId: dto.teamId,
        playerId: dto.playerId ?? null,
        period: dto.period,
      },
      {
        matchStatus: match.status,
        matchPeriod: match.period,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
      },
    );

    const event = await this.eventRepository.create({
      matchId,
      teamId: dto.teamId,
      playerId: dto.playerId ?? null,
      eventType: dto.eventType,
      period: dto.period,
      gameClock: dto.gameClock,
      coordinates: dto.coordinates ?? null,
      metadata: dto.metadata ?? null,
    });

    // Emit internal event after successful persistence
    this.eventEmitter.emit(
      MATCH_EVENT_CREATED,
      new MatchEventCreatedPayload(matchId, event),
    );

    return event;
  }
}
