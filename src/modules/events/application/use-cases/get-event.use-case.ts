import { Inject, Injectable } from '@nestjs/common';
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface';
import { EVENT_REPOSITORY } from '../../domain/interfaces/event.repository.interface';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventNotFoundException } from '../../domain/exceptions/event-not-found.exception';

@Injectable()
export class GetEventUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
  ) {}

  async execute(id: string): Promise<EventEntity> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new EventNotFoundException(id);
    }
    return event;
  }
}
