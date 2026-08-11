import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface';
import { EVENT_REPOSITORY } from '../../domain/interfaces/event.repository.interface';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventNotFoundException } from '../../domain/exceptions/event-not-found.exception';
import { InvalidEventException } from '../../domain/exceptions/invalid-event.exception';
import {
  MATCH_EVENT_VOIDED,
  MatchEventVoidedPayload,
} from '../../domain/events/match-event.events';

@Injectable()
export class VoidEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(id: string): Promise<EventEntity> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new EventNotFoundException(id);
    }
    if (event.isVoided) {
      throw new InvalidEventException('Event is already voided');
    }
    const voided = await this.eventRepository.voidEvent(id);

    this.eventEmitter.emit(
      MATCH_EVENT_VOIDED,
      new MatchEventVoidedPayload(event.matchId, id),
    );

    return voided;
  }
}
